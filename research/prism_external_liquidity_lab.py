#!/usr/bin/env python3
"""
PRISM External-Liquidity Spanning Lab
=====================================

Research question
-----------------
Can PRISM create new structured derivatives whose executable liquidity comes
entirely from existing prediction-market CLOB positions, without a native PRISM
AMM or dedicated PRISM liquidity pool?

This harness intentionally contains NO LMSR and NO PRISM-native market maker.

Core invariant
--------------
A PRISM claim h is launchable only if there is an exact non-negative backing
portfolio x over externally tradable outcome positions G (plus cash) such that

    G x = h

and, after issuance, backing dominates liability in every terminal state:

    H_backing(omega) >= H_liability(omega)  for every omega.

For executable quoting, order-book depth matters.  For quantity Q the creation
ask is derived from actually consuming external ask levels.  The cash-out bid is
derived from actually consuming external bid levels of the backing recipe.

Public Polymarket endpoints used in --live mode:
    Gamma markets: https://gamma-api.polymarket.com/markets
    CLOB books:    https://clob.polymarket.com/book?token_id=...
    Batch books:   https://clob.polymarket.com/books

No API key is required for public market/order-book data.

IMPORTANT
---------
This is research software. It does not place trades, sign orders, custody funds,
or claim production atomicity. Multi-leg execution has legging risk unless an
external venue or solver provides an atomic/bundled execution primitive.
"""

from __future__ import annotations

import argparse
import itertools
import json
import math
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

try:
    import requests
except Exception:
    requests = None

try:
    from scipy.optimize import linprog, lsq_linear
except Exception:
    linprog = None
    lsq_linear = None


TOL = 1e-9


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class BookLevel:
    price: float
    size: float


@dataclass
class TokenBook:
    symbol: str
    market_name: str
    market_id: str
    condition_id: str
    token_id: str
    outcome: str
    bids: List[BookLevel]
    asks: List[BookLevel]
    source: str
    tick_size: float = 0.01
    min_order_size: float = 1.0

    @property
    def best_bid(self) -> float:
        return max((x.price for x in self.bids), default=float("nan"))

    @property
    def best_ask(self) -> float:
        return min((x.price for x in self.asks), default=float("nan"))

    @property
    def ask_depth(self) -> float:
        return float(sum(x.size for x in self.asks))

    @property
    def bid_depth(self) -> float:
        return float(sum(x.size for x in self.bids))


@dataclass
class BinaryMarket:
    label: str
    name: str
    market_id: str
    condition_id: str
    yes: TokenBook
    no: TokenBook
    liquidity: float = 0.0
    volume: float = 0.0


@dataclass
class StructuredProduct:
    key: str
    name: str
    description: str
    recipe: Dict[str, float]
    target_payoff: Optional[np.ndarray] = None


@dataclass
class ReplicationCertificate:
    feasible: bool
    coefficients: Dict[str, float]
    replicated_payoff: np.ndarray
    target_payoff: np.ndarray
    max_abs_error: float
    objective: float
    message: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_jsonish(v):
    if isinstance(v, (list, dict)):
        return v
    if isinstance(v, str):
        try:
            return json.loads(v)
        except Exception:
            return [v]
    return v


def binary_states(n: int) -> np.ndarray:
    return np.array(list(itertools.product([0, 1], repeat=n)), dtype=int)


def state_labels(states: np.ndarray) -> List[str]:
    return ["".join(map(str, row.tolist())) for row in states]


def sanitize_filename(s: str) -> str:
    s = re.sub(r"[^A-Za-z0-9._-]+", "_", s)
    return s.strip("_")[:100] or "plot"


def sweep(levels: Sequence[BookLevel], qty: float, side: str) -> Tuple[float, float, float]:
    """
    Consume a CLOB side.

    Returns:
        filled_qty, total_notional, vwap

    side="buy": consume asks low -> high
    side="sell": consume bids high -> low
    """
    qty = float(qty)
    if qty <= TOL:
        return 0.0, 0.0, float("nan")

    if side == "buy":
        ordered = sorted(levels, key=lambda x: x.price)
    elif side == "sell":
        ordered = sorted(levels, key=lambda x: x.price, reverse=True)
    else:
        raise ValueError("side must be 'buy' or 'sell'")

    remain = qty
    filled = 0.0
    notional = 0.0
    for lvl in ordered:
        if lvl.size <= 0:
            continue
        take = min(remain, lvl.size)
        filled += take
        notional += take * lvl.price
        remain -= take
        if remain <= TOL:
            break

    vwap = notional / filled if filled > TOL else float("nan")
    return filled, notional, vwap


# ---------------------------------------------------------------------------
# Polymarket public data adapter
# ---------------------------------------------------------------------------

class PolymarketPublicClient:
    GAMMA = "https://gamma-api.polymarket.com"
    CLOB = "https://clob.polymarket.com"

    def __init__(self, timeout: float = 15.0):
        if requests is None:
            raise RuntimeError("requests is required for --live mode")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "PRISM-Spanning-Lab/1.0"})

    def _get(self, url: str, params: Optional[dict] = None):
        r = self.session.get(url, params=params, timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def _post(self, url: str, payload):
        r = self.session.post(url, json=payload, timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def list_candidate_markets(self, scan_limit: int = 250) -> List[dict]:
        # Gamma supports active/closed filters.  We sort locally as a second
        # line of defense because API sort semantics can evolve.
        data = self._get(
            f"{self.GAMMA}/markets",
            params={
                "limit": scan_limit,
                "active": "true",
                "closed": "false",
            },
        )
        candidates = []
        for m in data:
            if not m.get("enableOrderBook", False):
                continue
            if not m.get("active", True) or m.get("closed", False):
                continue
            outcomes = parse_jsonish(m.get("outcomes", []))
            token_ids = parse_jsonish(m.get("clobTokenIds", []))
            if not isinstance(outcomes, list) or not isinstance(token_ids, list):
                continue
            if len(outcomes) != 2 or len(token_ids) != 2:
                continue
            normalized = [str(x).strip().lower() for x in outcomes]
            if "yes" not in normalized or "no" not in normalized:
                continue
            m["_outcomes"] = outcomes
            m["_tokens"] = token_ids
            candidates.append(m)

        candidates.sort(
            key=lambda m: (
                float(m.get("liquidityNum") or m.get("liquidity") or 0),
                float(m.get("volume24hr") or 0),
                float(m.get("volumeNum") or m.get("volume") or 0),
            ),
            reverse=True,
        )
        return candidates

    def market_by_id(self, market_id: str) -> dict:
        m = self._get(f"{self.GAMMA}/markets/{market_id}")
        m["_outcomes"] = parse_jsonish(m.get("outcomes", []))
        m["_tokens"] = parse_jsonish(m.get("clobTokenIds", []))
        return m

    def book(self, token_id: str) -> dict:
        return self._get(f"{self.CLOB}/book", params={"token_id": token_id})

    def binary_market_from_gamma(self, m: dict, label: str) -> BinaryMarket:
        outcomes = parse_jsonish(m.get("_outcomes", m.get("outcomes", [])))
        tokens = parse_jsonish(m.get("_tokens", m.get("clobTokenIds", [])))
        normalized = [str(x).strip().lower() for x in outcomes]
        if "yes" not in normalized or "no" not in normalized:
            raise ValueError("market is not binary YES/NO")

        yes_idx = normalized.index("yes")
        no_idx = normalized.index("no")
        yes_token = str(tokens[yes_idx])
        no_token = str(tokens[no_idx])

        yes_book = self.book(yes_token)
        no_book = self.book(no_token)

        def mk(symbol: str, outcome: str, token: str, raw: dict) -> TokenBook:
            return TokenBook(
                symbol=symbol,
                market_name=str(m.get("question") or m.get("slug") or m.get("id")),
                market_id=str(m.get("id", "")),
                condition_id=str(m.get("conditionId", "")),
                token_id=token,
                outcome=outcome,
                bids=[BookLevel(float(x["price"]), float(x["size"])) for x in raw.get("bids", [])],
                asks=[BookLevel(float(x["price"]), float(x["size"])) for x in raw.get("asks", [])],
                source="Polymarket live CLOB",
                tick_size=float(raw.get("tick_size") or m.get("orderPriceMinTickSize") or 0.01),
                min_order_size=float(raw.get("min_order_size") or m.get("orderMinSize") or 1.0),
            )

        return BinaryMarket(
            label=label,
            name=str(m.get("question") or m.get("slug") or m.get("id")),
            market_id=str(m.get("id", "")),
            condition_id=str(m.get("conditionId", "")),
            yes=mk(f"{label}_YES", "YES", yes_token, yes_book),
            no=mk(f"{label}_NO", "NO", no_token, no_book),
            liquidity=float(m.get("liquidityNum") or m.get("liquidity") or 0.0),
            volume=float(m.get("volumeNum") or m.get("volume") or 0.0),
        )

    def select_markets(
        self,
        count: int = 3,
        market_ids: Optional[Sequence[str]] = None,
    ) -> List[BinaryMarket]:
        labels = [chr(ord("A") + i) for i in range(count)]

        if market_ids:
            if len(market_ids) < count:
                raise ValueError(f"need at least {count} --market-id values")
            gamma = [self.market_by_id(str(x)) for x in market_ids[:count]]
        else:
            gamma = self.list_candidate_markets()
            if len(gamma) < count:
                raise RuntimeError("not enough active binary Polymarket markets discovered")

            # Require both YES and NO books to have non-zero two-sided liquidity.
            selected = []
            for m in gamma:
                try:
                    bm = self.binary_market_from_gamma(m, labels[len(selected)])
                except Exception:
                    continue
                if (
                    bm.yes.asks and bm.yes.bids
                    and bm.no.asks and bm.no.bids
                ):
                    selected.append(bm)
                if len(selected) == count:
                    return selected
            raise RuntimeError("could not discover enough markets with two-sided YES/NO books")

        return [self.binary_market_from_gamma(m, label) for m, label in zip(gamma, labels)]


# ---------------------------------------------------------------------------
# Deterministic offline CLOB fixtures
# ---------------------------------------------------------------------------

def synthetic_levels(mid: float, depth: float, levels: int = 30) -> Tuple[List[BookLevel], List[BookLevel]]:
    spread = 0.012
    bids, asks = [], []
    for i in range(levels):
        gap = spread / 2 + 0.0022 * i
        size = depth * (0.55 + 0.06 * i) / levels
        bids.append(BookLevel(max(0.001, mid - gap), size))
        asks.append(BookLevel(min(0.999, mid + gap), size))
    return bids, asks


def offline_markets() -> List[BinaryMarket]:
    specs = [
        ("A", "Fixture A: macro catalyst", 0.62, 55_000),
        ("B", "Fixture B: crypto catalyst", 0.41, 42_000),
        ("C", "Fixture C: policy/technology catalyst", 0.55, 68_000),
    ]
    out = []
    for i, (label, name, p_yes, depth) in enumerate(specs, 1):
        yb, ya = synthetic_levels(p_yes, depth)
        # NO market midpoint is approximately complementary but has its own book.
        nb, na = synthetic_levels(1.0 - p_yes, depth * 0.92)
        out.append(
            BinaryMarket(
                label=label,
                name=name,
                market_id=f"fixture-{i}",
                condition_id=f"fixture-condition-{i}",
                yes=TokenBook(
                    symbol=f"{label}_YES",
                    market_name=name,
                    market_id=f"fixture-{i}",
                    condition_id=f"fixture-condition-{i}",
                    token_id=f"fixture-{label}-yes",
                    outcome="YES",
                    bids=yb,
                    asks=ya,
                    source="deterministic synthetic CLOB fixture",
                ),
                no=TokenBook(
                    symbol=f"{label}_NO",
                    market_name=name,
                    market_id=f"fixture-{i}",
                    condition_id=f"fixture-condition-{i}",
                    token_id=f"fixture-{label}-no",
                    outcome="NO",
                    bids=nb,
                    asks=na,
                    source="deterministic synthetic CLOB fixture",
                ),
                liquidity=depth,
                volume=depth * 10,
            )
        )
    return out


# ---------------------------------------------------------------------------
# State-space / payoff basis
# ---------------------------------------------------------------------------

def build_external_basis(markets: Sequence[BinaryMarket]):
    n = len(markets)
    states = binary_states(n)
    payoff_cols: Dict[str, np.ndarray] = {"CASH": np.ones(len(states), dtype=float)}
    books: Dict[str, TokenBook] = {}

    for j, market in enumerate(markets):
        yes = states[:, j].astype(float)
        no = 1.0 - yes
        payoff_cols[f"{market.label}_YES"] = yes
        payoff_cols[f"{market.label}_NO"] = no
        books[f"{market.label}_YES"] = market.yes
        books[f"{market.label}_NO"] = market.no

    symbols = list(payoff_cols.keys())
    G = np.column_stack([payoff_cols[s] for s in symbols])
    return states, symbols, G, payoff_cols, books


def target_from_recipe(recipe: Mapping[str, float], payoff_cols: Mapping[str, np.ndarray]) -> np.ndarray:
    h = np.zeros_like(next(iter(payoff_cols.values())), dtype=float)
    for symbol, w in recipe.items():
        if symbol not in payoff_cols:
            raise KeyError(f"unknown backing asset {symbol}")
        if w < -TOL:
            raise ValueError("recipes must be non-negative in PRISM V1")
        h += float(w) * payoff_cols[symbol]
    return h


def product_suite(payoff_cols: Mapping[str, np.ndarray]) -> List[StructuredProduct]:
    """
    Five products that are exactly externally backed with three binary markets.
    All payouts are in [0,1].
    """
    products = [
        StructuredProduct(
            key="thematic_basket",
            name="Thematic Basket",
            description="40% YES A + 35% YES B + 25% YES C",
            recipe={"A_YES": 0.40, "B_YES": 0.35, "C_YES": 0.25},
        ),
        StructuredProduct(
            key="relative_event_spread",
            name="Relative Event Spread",
            description="50% YES A + 50% NO B",
            recipe={"A_YES": 0.50, "B_NO": 0.50},
        ),
        StructuredProduct(
            key="principal_protected_note",
            name="70% Protected Event Note",
            description="70% cash + 15% YES A + 15% YES B",
            recipe={"CASH": 0.70, "A_YES": 0.15, "B_YES": 0.15},
        ),
        StructuredProduct(
            key="defensive_barbell",
            name="Defensive Barbell",
            description="50% NO A + 30% YES B + 20% NO C",
            recipe={"A_NO": 0.50, "B_YES": 0.30, "C_NO": 0.20},
        ),
        StructuredProduct(
            key="cross_market_blend",
            name="Cross-Market Blend",
            description="25% YES A + 25% NO B + 25% YES C + 25% NO C",
            recipe={"A_YES": 0.25, "B_NO": 0.25, "C_YES": 0.25, "C_NO": 0.25},
        ),
    ]
    for p in products:
        p.target_payoff = target_from_recipe(p.recipe, payoff_cols)
        if np.min(p.target_payoff) < -TOL or np.max(p.target_payoff) > 1 + TOL:
            raise AssertionError(f"{p.name} has payout outside [0,1]")
    return products


# ---------------------------------------------------------------------------
# Mathematical spanning / replication certificates
# ---------------------------------------------------------------------------

def top_ask_objective(symbols: Sequence[str], books: Mapping[str, TokenBook]) -> np.ndarray:
    c = []
    for s in symbols:
        if s == "CASH":
            c.append(1.0)
        else:
            p = books[s].best_ask
            c.append(float(p) if math.isfinite(p) else 10.0)
    return np.asarray(c, dtype=float)


def exact_replication_certificate(
    target: np.ndarray,
    symbols: Sequence[str],
    G: np.ndarray,
    books: Mapping[str, TokenBook],
) -> ReplicationCertificate:
    """
    Solve:
        min c'x
        s.t. Gx = h, x >= 0

    This is a statewise exact certificate, not a probability fit.
    """
    if linprog is None:
        raise RuntimeError("scipy is required for replication certificates")

    c = top_ask_objective(symbols, books)
    res = linprog(
        c=c,
        A_eq=G,
        b_eq=target,
        bounds=[(0, None)] * len(symbols),
        method="highs",
    )

    if res.success:
        x = np.maximum(res.x, 0.0)
        rep = G @ x
        err = float(np.max(np.abs(rep - target)))
        coeff = {s: float(v) for s, v in zip(symbols, x) if v > 1e-8}
        return ReplicationCertificate(
            feasible=err <= 1e-7,
            coefficients=coeff,
            replicated_payoff=rep,
            target_payoff=target,
            max_abs_error=err,
            objective=float(res.fun),
            message=res.message,
        )

    # Produce best non-negative residual diagnostic for infeasible targets.
    if lsq_linear is not None:
        approx = lsq_linear(G, target, bounds=(0, np.inf), lsmr_tol="auto")
        x = np.maximum(approx.x, 0.0)
        rep = G @ x
        err = float(np.max(np.abs(rep - target)))
        coeff = {s: float(v) for s, v in zip(symbols, x) if v > 1e-8}
    else:
        x = np.zeros(len(symbols))
        rep = G @ x
        err = float(np.max(np.abs(rep - target)))
        coeff = {}

    return ReplicationCertificate(
        feasible=False,
        coefficients=coeff,
        replicated_payoff=rep,
        target_payoff=target,
        max_abs_error=err,
        objective=float("nan"),
        message=res.message,
    )


# ---------------------------------------------------------------------------
# External CLOB-derived virtual quotes
# ---------------------------------------------------------------------------

def fixed_recipe_quote(
    product: StructuredProduct,
    quantity: float,
    books: Mapping[str, TokenBook],
    side: str,
    builder_fee_bps: float = 0.0,
    execution_buffer_bps: float = 0.0,
) -> dict:
    """
    Exact fixed-backing quote.

    CREATE / side="buy":
      consume asks for each backing token; cash is held at par.

    REDEEM-TO-CASH / side="sell":
      consume bids for each backing token; cash returns at par.

    No PRISM-native liquidity appears anywhere in the calculation.
    """
    if quantity <= 0:
        raise ValueError("quantity must be > 0")

    notion = 0.0
    legs = []
    fully_fillable = True
    limiting_ratio = float("inf")

    for symbol, weight in product.recipe.items():
        leg_qty = quantity * float(weight)
        if leg_qty <= TOL:
            continue

        if symbol == "CASH":
            notion += leg_qty
            legs.append({
                "symbol": symbol,
                "weight": weight,
                "required_qty": leg_qty,
                "filled_qty": leg_qty,
                "vwap": 1.0,
                "notional": leg_qty,
                "fill_ratio": 1.0,
            })
            continue

        book = books[symbol]
        levels = book.asks if side == "buy" else book.bids
        filled, leg_notional, vwap_price = sweep(levels, leg_qty, side)
        fill_ratio = filled / leg_qty if leg_qty > TOL else 1.0
        fully_fillable &= fill_ratio >= 1.0 - 1e-9
        limiting_ratio = min(limiting_ratio, fill_ratio)
        notion += leg_notional
        legs.append({
            "symbol": symbol,
            "weight": weight,
            "required_qty": leg_qty,
            "filled_qty": filled,
            "vwap": vwap_price,
            "notional": leg_notional,
            "fill_ratio": fill_ratio,
        })

    if not fully_fillable:
        return {
            "fully_fillable": False,
            "quantity": quantity,
            "raw_notional": float("nan"),
            "total_notional": float("nan"),
            "average_price": float("nan"),
            "legs": legs,
            "limiting_fill_ratio": limiting_ratio,
        }

    raw_notional = notion
    # Builder fee and execution buffer are deliberately transparent overlays.
    # They do not create liquidity; they only adjust the user-facing price.
    overlay_rate = (builder_fee_bps + execution_buffer_bps) / 10_000.0
    if side == "buy":
        total = raw_notional * (1.0 + overlay_rate)
    else:
        total = raw_notional * (1.0 - overlay_rate)

    return {
        "fully_fillable": True,
        "quantity": quantity,
        "raw_notional": raw_notional,
        "total_notional": total,
        "average_price": total / quantity,
        "legs": legs,
        "limiting_fill_ratio": 1.0,
    }


def max_executable_quantity(product: StructuredProduct, books: Mapping[str, TokenBook], side: str) -> float:
    caps = []
    for symbol, weight in product.recipe.items():
        if symbol == "CASH" or weight <= TOL:
            continue
        book = books[symbol]
        depth = book.ask_depth if side == "buy" else book.bid_depth
        caps.append(depth / weight)
    return min(caps) if caps else float("inf")


def quantity_grid(products: Sequence[StructuredProduct], books: Mapping[str, TokenBook]) -> np.ndarray:
    caps = []
    for p in products:
        cap = min(
            max_executable_quantity(p, books, "buy"),
            max_executable_quantity(p, books, "sell"),
        )
        if math.isfinite(cap) and cap > 1:
            caps.append(cap)
    cap = min(caps) if caps else 500.0
    # Keep curve inside 90% of the smallest common full-depth limit.
    hi = max(10.0, 0.90 * cap)
    return np.geomspace(max(1.0, hi / 250.0), hi, 70)


# ---------------------------------------------------------------------------
# Invariants and tests
# ---------------------------------------------------------------------------

def recipe_vector(product: StructuredProduct, symbols: Sequence[str]) -> np.ndarray:
    return np.array([product.recipe.get(s, 0.0) for s in symbols], dtype=float)


def run_tests(
    states: np.ndarray,
    symbols: Sequence[str],
    G: np.ndarray,
    books: Mapping[str, TokenBook],
    products: Sequence[StructuredProduct],
) -> pd.DataFrame:
    rows = []

    # Five positive controls: exact recipe identity, exact solver certificate,
    # and statewise backing dominance.
    for product in products:
        h = product.target_payoff
        x_recipe = recipe_vector(product, symbols)
        rep_recipe = G @ x_recipe
        err_recipe = float(np.max(np.abs(rep_recipe - h)))
        rows.append({
            "test": f"{product.key}: canonical recipe exactly replicates payoff",
            "metric": err_recipe,
            "threshold": 1e-10,
            "pass": err_recipe <= 1e-10,
        })

        cert = exact_replication_certificate(h, symbols, G, books)
        rows.append({
            "test": f"{product.key}: spanning solver finds exact external backing",
            "metric": cert.max_abs_error,
            "threshold": 1e-7,
            "pass": cert.feasible and cert.max_abs_error <= 1e-7,
        })

        surplus = rep_recipe - h
        min_surplus = float(np.min(surplus))
        rows.append({
            "test": f"{product.key}: statewise backing >= liability",
            "metric": min_surplus,
            "threshold": -1e-10,
            "pass": min_surplus >= -1e-10,
        })

    # Algebraic complete-set identities for every source market.
    n = states.shape[1]
    for j in range(n):
        label = chr(ord("A") + j)
        yes = G[:, symbols.index(f"{label}_YES")]
        no = G[:, symbols.index(f"{label}_NO")]
        err = float(np.max(np.abs(yes + no - 1.0)))
        rows.append({
            "test": f"{label}: YES + NO = CASH in every state",
            "metric": err,
            "threshold": 1e-12,
            "pass": err <= 1e-12,
        })

    # Negative control: AND(A,B) must not be spanned by only marginal binary
    # A/B/C YES/NO assets + cash.
    h_and = (states[:, 0] * states[:, 1]).astype(float)
    cert_and = exact_replication_certificate(h_and, symbols, G, books)
    rows.append({
        "test": "negative control: AND(A,B) rejected without joint-state instrument",
        "metric": cert_and.max_abs_error,
        "threshold": 1e-6,
        "pass": (not cert_and.feasible) and cert_and.max_abs_error > 1e-6,
    })

    # Every positive-control product must have at least one executable unit on
    # both external sides.  This is a real CLOB requirement in live mode.
    for product in products:
        q_buy = max_executable_quantity(product, books, "buy")
        q_sell = max_executable_quantity(product, books, "sell")
        rows.append({
            "test": f"{product.key}: nonzero external executable depth",
            "metric": min(q_buy, q_sell),
            "threshold": 1.0,
            "pass": min(q_buy, q_sell) >= 1.0,
        })

    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Visualization
# ---------------------------------------------------------------------------

def plot_payoff_replication(
    states: np.ndarray,
    products: Sequence[StructuredProduct],
    symbols: Sequence[str],
    G: np.ndarray,
    outdir: Path,
):
    labels = state_labels(states)
    for idx, product in enumerate(products, 1):
        x = recipe_vector(product, symbols)
        rep = G @ x
        target = product.target_payoff

        fig, ax = plt.subplots(figsize=(10, 5))
        positions = np.arange(len(labels))
        width = 0.38
        ax.bar(positions - width / 2, target, width, label="Target PRISM payoff")
        ax.bar(positions + width / 2, rep, width, label="External backing payoff")
        ax.set_xticks(positions)
        ax.set_xticklabels(labels)
        ax.set_ylim(0, 1.05)
        ax.set_xlabel("Terminal state (A,B,C)")
        ax.set_ylabel("Payout per PRISM share")
        ax.set_title(f"{idx}. {product.name}: statewise exact replication")
        ax.legend()
        ax.grid(axis="y", alpha=0.25)
        fig.tight_layout()
        fig.savefig(outdir / f"payoff_{idx:02d}_{sanitize_filename(product.key)}.png", dpi=170)
        plt.close(fig)


def plot_virtual_curve(
    product: StructuredProduct,
    qs: np.ndarray,
    books: Mapping[str, TokenBook],
    outdir: Path,
    idx: int,
    builder_fee_bps: float,
    execution_buffer_bps: float,
):
    ask_q, ask_p = [], []
    bid_q, bid_p = [], []
    for q in qs:
        a = fixed_recipe_quote(
            product, float(q), books, "buy",
            builder_fee_bps=builder_fee_bps,
            execution_buffer_bps=execution_buffer_bps,
        )
        b = fixed_recipe_quote(
            product, float(q), books, "sell",
            builder_fee_bps=builder_fee_bps,
            execution_buffer_bps=execution_buffer_bps,
        )
        if a["fully_fillable"]:
            ask_q.append(q)
            ask_p.append(a["average_price"])
        if b["fully_fillable"]:
            bid_q.append(q)
            bid_p.append(b["average_price"])

    fig, ax = plt.subplots(figsize=(9, 5))
    if bid_q:
        ax.plot(bid_q, bid_p, label="Synthetic PRISM bid from external CLOB")
    if ask_q:
        ax.plot(ask_q, ask_p, label="Synthetic PRISM ask from external CLOB")
    ax.set_xscale("log")
    ax.set_xlabel("PRISM shares")
    ax.set_ylabel("Executable average price per share")
    ax.set_ylim(0, 1.05)
    ax.set_title(f"{idx}. {product.name}: inherited-liquidity price/depth curve")
    ax.legend()
    ax.grid(alpha=0.25)
    fig.tight_layout()
    fig.savefig(outdir / f"curve_{idx:02d}_{sanitize_filename(product.key)}.png", dpi=170)
    plt.close(fig)


def plot_depth_bottlenecks(
    products: Sequence[StructuredProduct],
    books: Mapping[str, TokenBook],
    outdir: Path,
):
    names = [p.name for p in products]
    buy_caps = [max_executable_quantity(p, books, "buy") for p in products]
    sell_caps = [max_executable_quantity(p, books, "sell") for p in products]
    x = np.arange(len(names))
    width = 0.38

    fig, ax = plt.subplots(figsize=(11, 5))
    ax.bar(x - width / 2, buy_caps, width, label="Create / buy capacity")
    ax.bar(x + width / 2, sell_caps, width, label="Redeem-to-cash / sell capacity")
    ax.set_xticks(x)
    ax.set_xticklabels(names, rotation=20, ha="right")
    ax.set_ylabel("Maximum fully executable PRISM shares")
    ax.set_title("External CLOB depth directly caps PRISM executable size")
    ax.legend()
    ax.grid(axis="y", alpha=0.25)
    fig.tight_layout()
    fig.savefig(outdir / "depth_06_external_bottlenecks.png", dpi=170)
    plt.close(fig)


def plot_spread_vs_size(
    products: Sequence[StructuredProduct],
    qs: np.ndarray,
    books: Mapping[str, TokenBook],
    outdir: Path,
):
    fig, ax = plt.subplots(figsize=(10, 6))
    for product in products:
        qvals, spreads = [], []
        for q in qs:
            a = fixed_recipe_quote(product, float(q), books, "buy")
            b = fixed_recipe_quote(product, float(q), books, "sell")
            if a["fully_fillable"] and b["fully_fillable"]:
                qvals.append(q)
                spreads.append(a["average_price"] - b["average_price"])
        if qvals:
            ax.plot(qvals, spreads, label=product.name)

    ax.set_xscale("log")
    ax.set_xlabel("PRISM shares")
    ax.set_ylabel("Inherited synthetic spread")
    ax.set_title("Structured-product spread emerges from constituent CLOB spreads + depth")
    ax.legend()
    ax.grid(alpha=0.25)
    fig.tight_layout()
    fig.savefig(outdir / "spread_07_vs_size.png", dpi=170)
    plt.close(fig)


def plot_spanning_negative_control(
    states: np.ndarray,
    symbols: Sequence[str],
    G: np.ndarray,
    books: Mapping[str, TokenBook],
    outdir: Path,
):
    h_and = (states[:, 0] * states[:, 1]).astype(float)
    cert = exact_replication_certificate(h_and, symbols, G, books)
    labels = state_labels(states)

    fig, ax = plt.subplots(figsize=(10, 5))
    pos = np.arange(len(labels))
    width = 0.38
    ax.bar(pos - width / 2, h_and, width, label="Target AND(A,B)")
    ax.bar(pos + width / 2, cert.replicated_payoff, width, label="Best non-negative marginal-market approximation")
    ax.set_xticks(pos)
    ax.set_xticklabels(labels)
    ax.set_ylim(0, 1.05)
    ax.set_xlabel("Terminal state (A,B,C)")
    ax.set_ylabel("Payout")
    ax.set_title(f"Negative control: AND is not exactly spanned (max error={cert.max_abs_error:.4f})")
    ax.legend()
    ax.grid(axis="y", alpha=0.25)
    fig.tight_layout()
    fig.savefig(outdir / "negative_08_and_not_spanned.png", dpi=170)
    plt.close(fig)


def plot_liquidity_inheritance(
    products: Sequence[StructuredProduct],
    outdir: Path,
):
    external = [100.0] * len(products)
    native = [0.0] * len(products)
    names = [p.name for p in products]
    x = np.arange(len(names))

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.bar(x, external, label="External CLOB backing")
    ax.bar(x, native, bottom=external, label="PRISM native liquidity")
    ax.set_xticks(x)
    ax.set_xticklabels(names, rotation=20, ha="right")
    ax.set_ylim(0, 105)
    ax.set_ylabel("Directional backing share (%)")
    ax.set_title("V1 invariant: successful products use zero PRISM-native directional liquidity")
    ax.legend()
    ax.grid(axis="y", alpha=0.25)
    fig.tight_layout()
    fig.savefig(outdir / "liquidity_09_inheritance.png", dpi=170)
    plt.close(fig)


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def market_frame(markets: Sequence[BinaryMarket]) -> pd.DataFrame:
    rows = []
    for m in markets:
        for outcome, book in [("YES", m.yes), ("NO", m.no)]:
            rows.append({
                "label": m.label,
                "market": m.name,
                "market_id": m.market_id,
                "condition_id": m.condition_id,
                "outcome": outcome,
                "token_id": book.token_id,
                "best_bid": book.best_bid,
                "best_ask": book.best_ask,
                "spread": book.best_ask - book.best_bid,
                "bid_depth": book.bid_depth,
                "ask_depth": book.ask_depth,                "source": book.source,
                "liquidity_metadata": m.liquidity,
                "volume_metadata": m.volume,
            })
    return pd.DataFrame(rows)


def certificate_frame(
    products: Sequence[StructuredProduct],
    symbols: Sequence[str],
    G: np.ndarray,
    books: Mapping[str, TokenBook],
) -> pd.DataFrame:
    rows = []
    for product in products:
        cert = exact_replication_certificate(product.target_payoff, symbols, G, books)
        rows.append({
            "product": product.name,
            "feasible": cert.feasible,
            "max_abs_payoff_error": cert.max_abs_error,
            "top_ask_objective": cert.objective,
            "certificate": json.dumps(cert.coefficients, sort_keys=True),
        })
    return pd.DataFrame(rows)


def curve_frame(
    products: Sequence[StructuredProduct],
    qs: np.ndarray,
    books: Mapping[str, TokenBook],
    builder_fee_bps: float,
    execution_buffer_bps: float,
) -> pd.DataFrame:
    rows = []
    for product in products:
        for q in qs:
            ask = fixed_recipe_quote(
                product, float(q), books, "buy",
                builder_fee_bps=builder_fee_bps,
                execution_buffer_bps=execution_buffer_bps,
            )
            bid = fixed_recipe_quote(
                product, float(q), books, "sell",
                builder_fee_bps=builder_fee_bps,
                execution_buffer_bps=execution_buffer_bps,
            )
            rows.append({
                "product": product.name,
                "quantity": q,
                "bid": bid["average_price"] if bid["fully_fillable"] else np.nan,
                "ask": ask["average_price"] if ask["fully_fillable"] else np.nan,
                "spread": (
                    ask["average_price"] - bid["average_price"]
                    if ask["fully_fillable"] and bid["fully_fillable"] else np.nan
                ),
                "buy_fillable": ask["fully_fillable"],
                "sell_fillable": bid["fully_fillable"],
            })
    return pd.DataFrame(rows)


def backing_frame(
    states: np.ndarray,
    products: Sequence[StructuredProduct],
    symbols: Sequence[str],
    G: np.ndarray,
) -> pd.DataFrame:
    rows = []
    labels = state_labels(states)
    for product in products:
        x = recipe_vector(product, symbols)
        backing = G @ x
        for state, liability, asset in zip(labels, product.target_payoff, backing):
            rows.append({
                "product": product.name,
                "state": state,
                "liability": liability,
                "backing_payoff": asset,
                "surplus": asset - liability,
            })
    return pd.DataFrame(rows)


def write_report(
    outdir: Path,
    mode: str,
    markets_df: pd.DataFrame,
    certs_df: pd.DataFrame,
    tests_df: pd.DataFrame,
    products: Sequence[StructuredProduct],
    books: Mapping[str, TokenBook],
):
    total = len(tests_df)
    passed = int(tests_df["pass"].sum())

    depth_rows = []
    for p in products:
        depth_rows.append({
            "product": p.name,
            "create_capacity": max_executable_quantity(p, books, "buy"),
            "cashout_capacity": max_executable_quantity(p, books, "sell"),
        })
    depth_df = pd.DataFrame(depth_rows)

    md = f"""# PRISM External-Liquidity Spanning Lab

## Run status

- Mode: **{mode}**
- Property/invariant tests passed: **{passed}/{total}**
- Native PRISM AMM: **none**
- Native PRISM directional liquidity used by the five positive controls: **0**

## Research claim being tested

A PRISM V1 product is launchable only when its payoff can be replicated exactly
from supported external prediction-market outcome positions and cash.

Mathematically, with external payoff matrix `G`, target payoff `h`, and
non-negative backing quantities `x`:

`G x = h`

For the canonical backing recipe, the protocol invariant is checked statewise:

`BackingPayoff(omega) >= ClaimPayoff(omega)` for every terminal state.

Prices in this experiment do **not** come from an internal probability model.
Synthetic PRISM bid/ask curves are created by consuming the external CLOB bids
and asks of the exact backing legs.

## Source markets / books

{markets_df.to_markdown(index=False)}

## Five use cases

"""
    for i, p in enumerate(products, 1):
        md += f"{i}. **{p.name}** — {p.description}\n"

    md += f"""
## Replication certificates

{certs_df.to_markdown(index=False)}

## External-liquidity capacity

{depth_df.to_markdown(index=False)}

## Tests

{tests_df.to_markdown(index=False)}

## Negative control

`AND(A,B)` is intentionally tested against only marginal YES/NO markets and
cash. The model must reject it as non-replicable unless a genuine joint-state
instrument (for example a supported combinatorial position) is added to the
external basis.

This prevents the engine from silently replacing missing joint liquidity with
an independence assumption or a model-generated probability.

## What this run proves

If all positive-control tests pass, the run demonstrates:

1. The five products have exact statewise external backing.
2. Their executable bid/ask curves come from external CLOB depth.
3. Their maximum size is capped by the shallowest required external leg.
4. No native PRISM AMM or native directional liquidity is required.
5. A non-spanned nonlinear payoff is rejected rather than hallucinated.

## What it does not prove

- Multi-leg orders are atomic across external markets.
- A future CLOB snapshot will preserve today's depth.
- Polymarket custody/transfer integration is production-safe.
- Every arbitrary payoff is externally spanned.
- Regulatory or legal requirements are satisfied.
- The external venue itself is manipulation-proof.

The next production research problem is **legging risk**: obtaining every
required backing leg before minting the PRISM claim, with unwind logic when one
leg fails.
"""
    (outdir / "REPORT.md").write_text(md, encoding="utf-8")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="PRISM proof: inherit liquidity from real prediction-market CLOBs"
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--live", action="store_true", help="Use live public Polymarket CLOB books")
    mode.add_argument("--offline", action="store_true", help="Use deterministic CLOB fixtures")
    parser.add_argument(
        "--market-id",
        action="append",
        default=[],
        help="Specific Polymarket Gamma market ID; provide at least 3 to override auto-selection",
    )
    parser.add_argument("--output", default="prism_external_liquidity_output")
    parser.add_argument("--builder-fee-bps", type=float, default=0.0)
    parser.add_argument(
        "--execution-buffer-bps",
        type=float,
        default=0.0,
        help="Transparent quote buffer for operational/legging risk; not liquidity",
    )
    parser.add_argument("--timeout", type=float, default=15.0)
    args = parser.parse_args()

    outdir = Path(args.output)
    outdir.mkdir(parents=True, exist_ok=True)

    if args.live:
        client = PolymarketPublicClient(timeout=args.timeout)
        markets = client.select_markets(
            count=3,
            market_ids=args.market_id if args.market_id else None,
        )
        run_mode = "LIVE POLYMARKET CLOB"
    else:
        markets = offline_markets()
        run_mode = "DETERMINISTIC OFFLINE CLOB FIXTURE"

    states, symbols, G, payoff_cols, books = build_external_basis(markets)
    products = product_suite(payoff_cols)

    tests = run_tests(states, symbols, G, books, products)
    markets_df = market_frame(markets)
    certs_df = certificate_frame(products, symbols, G, books)
    backing_df = backing_frame(states, products, symbols, G)
    qs = quantity_grid(products, books)
    curves_df = curve_frame(
        products,
        qs,
        books,
        builder_fee_bps=args.builder_fee_bps,
        execution_buffer_bps=args.execution_buffer_bps,
    )

    markets_df.to_csv(outdir / "markets_and_books.csv", index=False)
    certs_df.to_csv(outdir / "replication_certificates.csv", index=False)
    backing_df.to_csv(outdir / "statewise_backing.csv", index=False)
    tests.to_csv(outdir / "property_tests.csv", index=False)
    curves_df.to_csv(outdir / "virtual_clob_curves.csv", index=False)

    plot_payoff_replication(states, products, symbols, G, outdir)
    for idx, p in enumerate(products, 1):
        plot_virtual_curve(
            p, qs, books, outdir, idx,
            builder_fee_bps=args.builder_fee_bps,
            execution_buffer_bps=args.execution_buffer_bps,
        )
    plot_depth_bottlenecks(products, books, outdir)
    plot_spread_vs_size(products, qs, books, outdir)
    plot_spanning_negative_control(states, symbols, G, books, outdir)
    plot_liquidity_inheritance(products, outdir)

    write_report(outdir, run_mode, markets_df, certs_df, tests, products, books)

    print(f"\n=== PRISM EXTERNAL-LIQUIDITY SPANNING LAB ===")
    print(f"mode: {run_mode}\n")

    print("=== External markets ===")
    for m in markets:
        print(f"{m.label}: {m.name}")
        print(f"   YES bid/ask: {m.yes.best_bid:.4f} / {m.yes.best_ask:.4f}")
        print(f"   NO  bid/ask: {m.no.best_bid:.4f} / {m.no.best_ask:.4f}")

    print("\n=== Five externally-backed products ===")
    for p in products:
        print(f"- {p.name}: {p.description}")
        print(f"  create capacity: {max_executable_quantity(p, books, 'buy'):.2f}")
        print(f"  cashout capacity: {max_executable_quantity(p, books, 'sell'):.2f}")

    print("\n=== Replication certificates ===")
    print(certs_df.to_string(index=False))

    print("\n=== Invariant/property tests ===")
    print(tests.to_string(index=False))

    passed = int(tests["pass"].sum())
    total = len(tests)
    print(f"\nPASS: {passed}/{total}")
    print(f"output: {outdir.resolve()}")

    if passed != total:
        print("\n[FAIL] At least one PRISM external-liquidity invariant failed.")
        sys.exit(2)

    print("\n[PASS] Five products are exactly externally backed; AND negative-control was rejected.")


if __name__ == "__main__":
    main()