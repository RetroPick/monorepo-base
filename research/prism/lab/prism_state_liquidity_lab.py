#!/usr/bin/env python3
"""
PRISM State Liquidity Engine Research Harness
==============================================

Purpose
-------
Falsifiable numerical testbed for the PRISM State Liquidity Engine (SLE):
1) calibrate finite-state prices to prediction-market CLOB marginals,
2) price arbitrary bounded payoff vectors through one shared cost-function AMM,
3) compare base-event execution curves against a CLOB order book,
4) verify exact payoff identities and bounded-loss solvency numerically,
5) quantify the difference between shared state liquidity and isolated markets.

This is research software, not production trading or investment advice.

Live Polymarket mode uses public endpoints:
- Gamma markets: https://gamma-api.polymarket.com/markets
- CLOB book:    https://clob.polymarket.com/book
- History:      https://clob.polymarket.com/prices-history

The key mathematical object is a state-contingent payoff h(omega) in [0,1].
For liabilities q and prior state weights pi, the weighted LMSR-style cost is

    C(q) = b * log(sum_i pi_i * exp(q_i / b))

A trade of x units of claim h costs

    C(q + x h) - C(q).

Instantaneous state prices are grad C(q), and the instantaneous price of h is

    p(h) = grad C(q) dot h.

Bounded-loss reserve theorem
----------------------------
Because
    C(q) >= q_i + b log(pi_i)
for every state i,

    max_i q_i - C(q) <= b log(1 / min_i pi_i).

Therefore, if all collected trade premiums remain in the collateral vault,
a seed reserve R0 >= b log(1/min(pi)) is sufficient for the market maker's
worst-case state-contingent liability under this cost function.

Important limitation
--------------------
CLOB marginal prices do NOT identify the joint state distribution. PRISM must
either:
- obtain joint-market information,
- state an explicit dependency model,
- quote robust bounds,
- or use solver/RFQ information.
This harness makes the dependency assumption visible and performs sensitivity
analysis instead of hiding it.
"""

from __future__ import annotations

import argparse
import itertools
import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path
from statistics import NormalDist
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

try:
    import requests
except Exception:
    requests = None


# ----------------------------
# Numerical helpers
# ----------------------------

EPS = 1e-12


def logsumexp(a: np.ndarray) -> float:
    a = np.asarray(a, dtype=float)
    m = float(np.max(a))
    return m + math.log(float(np.sum(np.exp(a - m))))


def softmax_logweights(logw: np.ndarray) -> np.ndarray:
    m = float(np.max(logw))
    e = np.exp(logw - m)
    return e / np.sum(e)


def all_binary_states(n: int) -> np.ndarray:
    # State ordering: (0,0,...,0), ..., (1,1,...,1)
    return np.array(list(itertools.product([0, 1], repeat=n)), dtype=int)


def independent_joint(marginals: Sequence[float]) -> Tuple[np.ndarray, np.ndarray]:
    p = np.asarray(marginals, dtype=float)
    states = all_binary_states(len(p))
    probs = np.ones(len(states), dtype=float)
    for j, pj in enumerate(p):
        probs *= np.where(states[:, j] == 1, pj, 1.0 - pj)
    probs /= probs.sum()
    return states, probs


def ipf_match_binary_marginals(
    states: np.ndarray,
    probs: np.ndarray,
    targets: Sequence[float],
    max_iter: int = 5000,
    tol: float = 1e-12,
) -> np.ndarray:
    """
    Iterative proportional fitting so E[state_j] matches the target marginal.
    Starts from a strictly positive distribution.
    """
    p = np.maximum(np.asarray(probs, dtype=float), 1e-15)
    p /= p.sum()
    targets = np.asarray(targets, dtype=float)

    for _ in range(max_iter):
        old = p.copy()
        for j, target in enumerate(targets):
            mask1 = states[:, j] == 1
            m1 = float(p[mask1].sum())
            m0 = float(p[~mask1].sum())
            if m1 > 0:
                p[mask1] *= target / m1
            if m0 > 0:
                p[~mask1] *= (1.0 - target) / m0
            p /= p.sum()
        if np.max(np.abs(p - old)) < tol:
            break
    return p / p.sum()


def gaussian_copula_joint(
    marginals: Sequence[float],
    rho: float,
    n_samples: int = 250_000,
    seed: int = 7,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Approximate a joint Bernoulli state distribution with an equicorrelated
    Gaussian copula, then IPF-correct it to match CLOB marginals exactly.

    rho must satisfy the PSD constraint for an n x n equicorrelation matrix:
        rho > -1/(n-1), rho < 1
    """
    marginals = np.asarray(marginals, dtype=float)
    n = len(marginals)
    if n == 1:
        return independent_joint(marginals)

    lo = -1.0 / (n - 1) + 1e-6
    rho = float(np.clip(rho, lo, 0.999))
    corr = np.full((n, n), rho, dtype=float)
    np.fill_diagonal(corr, 1.0)

    rng = np.random.default_rng(seed)
    z = rng.multivariate_normal(np.zeros(n), corr, size=n_samples)

    nd = NormalDist()
    thresholds = np.array([nd.inv_cdf(float(1.0 - p)) for p in marginals])
    samples = (z > thresholds).astype(int)

    states = all_binary_states(n)
    idx = samples.dot(1 << np.arange(n - 1, -1, -1))
    counts = np.bincount(idx, minlength=len(states)).astype(float) + 1e-6
    probs = counts / counts.sum()
    probs = ipf_match_binary_marginals(states, probs, marginals)
    return states, probs


def two_event_joint_from_rho(p_a: float, p_b: float, rho: float) -> np.ndarray:
    """
    Exact two-Bernoulli joint using Pearson correlation, clipped to Frechet bounds.
    State order: 00, 01, 10, 11.
    """
    var = p_a * (1 - p_a) * p_b * (1 - p_b)
    cov_scale = math.sqrt(max(var, 0.0))
    p11 = p_a * p_b + rho * cov_scale
    lower = max(0.0, p_a + p_b - 1.0)
    upper = min(p_a, p_b)
    p11 = min(max(p11, lower), upper)
    return np.array([
        1 - p_a - p_b + p11,
        p_b - p11,
        p_a - p11,
        p11,
    ])


def frechet_and_bounds(p_a: float, p_b: float) -> Tuple[float, float]:
    return max(0.0, p_a + p_b - 1.0), min(p_a, p_b)


# ----------------------------
# Prediction-market CLOB data
# ----------------------------

@dataclass
class BookLevel:
    price: float
    size: float


@dataclass
class MarketSnapshot:
    name: str
    market_id: str
    condition_id: str
    yes_token_id: str
    midpoint: float
    best_bid: float
    best_ask: float
    bids: List[BookLevel]
    asks: List[BookLevel]
    liquidity: float = 0.0
    volume: float = 0.0
    source: str = "fixture"


class PolymarketPublicClient:
    GAMMA = "https://gamma-api.polymarket.com"
    CLOB = "https://clob.polymarket.com"

    def __init__(self, timeout: float = 12.0):
        if requests is None:
            raise RuntimeError("requests is not installed. Run: pip install requests")
        self.timeout = timeout

    def _get(self, url: str, params: Optional[dict] = None):
        r = requests.get(url, params=params, timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    @staticmethod
    def _parse_jsonish(v):
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [v]
        return v

    def top_binary_markets(self, count: int = 3, scan_limit: int = 200) -> List[dict]:
        data = self._get(
            f"{self.GAMMA}/markets",
            params={
                "limit": scan_limit,
                "offset": 0,
                "order": "liquidityNum",
                "ascending": "false",
            },
        )
        usable = []
        for m in data:
            outcomes = self._parse_jsonish(m.get("outcomes", []))
            token_ids = self._parse_jsonish(m.get("clobTokenIds", []))
            if not m.get("enableOrderBook", False):
                continue
            if m.get("closed", False) or not m.get("active", True):
                continue
            if len(outcomes) != 2 or len(token_ids) != 2:
                continue
            normalized = [str(x).strip().lower() for x in outcomes]
            if "yes" not in normalized or "no" not in normalized:
                continue
            m["_outcomes"] = outcomes
            m["_tokens"] = token_ids
            usable.append(m)
        usable.sort(key=lambda x: float(x.get("liquidityNum") or 0), reverse=True)
        return usable[:count]

    def market_by_id(self, market_id: str) -> dict:
        return self._get(f"{self.GAMMA}/markets/{market_id}")

    def book(self, token_id: str) -> dict:
        return self._get(f"{self.CLOB}/book", params={"token_id": token_id})

    def snapshot_from_market(self, m: dict) -> MarketSnapshot:
        outcomes = self._parse_jsonish(m.get("_outcomes", m.get("outcomes", [])))
        tokens = self._parse_jsonish(m.get("_tokens", m.get("clobTokenIds", [])))
        normalized = [str(x).strip().lower() for x in outcomes]
        yes_idx = normalized.index("yes")
        yes_token = str(tokens[yes_idx])

        b = self.book(yes_token)
        bids = [BookLevel(float(x["price"]), float(x["size"])) for x in b.get("bids", [])]
        asks = [BookLevel(float(x["price"]), float(x["size"])) for x in b.get("asks", [])]

        best_bid = max([x.price for x in bids], default=float(m.get("bestBid") or 0.0))
        best_ask = min([x.price for x in asks], default=float(m.get("bestAsk") or 1.0))
        if not (0 <= best_bid <= best_ask <= 1):
            fallback = float(m.get("lastTradePrice") or 0.5)
            best_bid = max(0.0, fallback - 0.01)
            best_ask = min(1.0, fallback + 0.01)

        midpoint = 0.5 * (best_bid + best_ask)
        return MarketSnapshot(
            name=str(m.get("question") or m.get("slug") or m.get("id")),
            market_id=str(m.get("id", "")),
            condition_id=str(m.get("conditionId", "")),
            yes_token_id=yes_token,
            midpoint=midpoint,
            best_bid=best_bid,
            best_ask=best_ask,
            bids=bids,
            asks=asks,
            liquidity=float(m.get("liquidityNum") or 0.0),
            volume=float(m.get("volumeNum") or 0.0),
            source="Polymarket live CLOB",
        )

    def get_top_snapshots(self, count: int = 3) -> List[MarketSnapshot]:
        markets = self.top_binary_markets(count=count)
        return [self.snapshot_from_market(m) for m in markets]


def synthetic_book(mid: float, total_depth: float = 50_000.0, levels: int = 20) -> Tuple[List[BookLevel], List[BookLevel]]:
    """
    Deterministic fallback fixture, clearly not empirical data.
    """
    base_spread = 0.012
    per_level = total_depth / levels
    bids, asks = [], []
    for i in range(levels):
        gap = base_spread / 2 + 0.003 * i
        size = per_level * (1.0 + 0.10 * i)
        bids.append(BookLevel(max(0.001, mid - gap), size))
        asks.append(BookLevel(min(0.999, mid + gap), size))
    return bids, asks


def offline_snapshots() -> List[MarketSnapshot]:
    fixtures = [
        ("Fixture A: macro event", 0.62),
        ("Fixture B: crypto event", 0.41),
        ("Fixture C: policy/technology event", 0.55),
    ]
    out = []
    for i, (name, mid) in enumerate(fixtures, start=1):
        bids, asks = synthetic_book(mid)
        out.append(
            MarketSnapshot(
                name=name,
                market_id=f"fixture-{i}",
                condition_id=f"fixture-condition-{i}",
                yes_token_id=f"fixture-token-{i}",
                midpoint=mid,
                best_bid=max(x.price for x in bids),
                best_ask=min(x.price for x in asks),
                bids=bids,
                asks=asks,
                liquidity=50_000,
                volume=500_000,
                source="synthetic fallback fixture",
            )
        )
    return out


def vwap(levels: Sequence[BookLevel], qty: float, side: str) -> float:
    """
    Executable VWAP through one side of a CLOB.
    side='buy' consumes asks from low to high.
    side='sell' consumes bids from high to low.
    Returns nan if book depth is insufficient.
    """
    if qty <= 0:
        return float("nan")
    if side == "buy":
        levels = sorted(levels, key=lambda x: x.price)
    else:
        levels = sorted(levels, key=lambda x: x.price, reverse=True)
    remaining = qty
    notion = 0.0
    for lvl in levels:
        take = min(remaining, lvl.size)
        notion += take * lvl.price
        remaining -= take
        if remaining <= 1e-12:
            return notion / qty
    return float("nan")


# ----------------------------
# PRISM State Liquidity Engine
# ----------------------------

class StateLiquidityEngine:
    def __init__(self, states: np.ndarray, prior: np.ndarray, b: float):
        states = np.asarray(states, dtype=int)
        prior = np.asarray(prior, dtype=float)
        if states.ndim != 2:
            raise ValueError("states must be K x N")
        if len(prior) != len(states):
            raise ValueError("prior length must equal number of states")
        if np.any(prior <= 0):
            raise ValueError("all prior state probabilities must be strictly positive")
        if not np.isclose(prior.sum(), 1.0, atol=1e-10):
            raise ValueError("prior must sum to 1")
        if b <= 0:
            raise ValueError("b must be > 0")

        self.states = states
        self.prior = prior
        self.b = float(b)
        self.q = np.zeros(len(states), dtype=float)  # state-contingent liabilities
        self.cash = 0.0  # collected net premiums = C(q)-C(0)

    def potential(self, q: Optional[np.ndarray] = None) -> float:
        if q is None:
            q = self.q
        q = np.asarray(q, dtype=float)
        return self.b * logsumexp(np.log(self.prior) + q / self.b)

    def state_prices(self, q: Optional[np.ndarray] = None) -> np.ndarray:
        if q is None:
            q = self.q
        q = np.asarray(q, dtype=float)
        return softmax_logweights(np.log(self.prior) + q / self.b)

    def claim_price(self, h: np.ndarray, q: Optional[np.ndarray] = None) -> float:
        h = self._validate_claim(h)
        return float(self.state_prices(q).dot(h))

    def trade_cost(self, h: np.ndarray, x: float, q: Optional[np.ndarray] = None) -> float:
        h = self._validate_claim(h)
        if q is None:
            q = self.q
        q = np.asarray(q, dtype=float)
        return self.potential(q + x * h) - self.potential(q)

    def average_execution_price(self, h: np.ndarray, x: float, q: Optional[np.ndarray] = None) -> float:
        if abs(x) < EPS:
            return self.claim_price(h, q)
        return self.trade_cost(h, x, q) / x

    def execute(self, h: np.ndarray, x: float) -> float:
        cost = self.trade_cost(h, x)
        self.q = self.q + x * self._validate_claim(h)
        self.cash += cost
        return cost

    def reserve_bound(self) -> float:
        return self.b * math.log(1.0 / float(np.min(self.prior)))

    def worst_state_liability(self) -> float:
        return float(np.max(self.q))

    def solvency_buffer(self, seed_reserve: float) -> float:
        # collateral = seed reserve + all collected net premiums
        return seed_reserve + self.cash - self.worst_state_liability()

    def _validate_claim(self, h: np.ndarray) -> np.ndarray:
        h = np.asarray(h, dtype=float)
        if h.shape != (len(self.states),):
            raise ValueError(f"claim must have shape ({len(self.states)},)")
        if np.any(h < -1e-12) or np.any(h > 1 + 1e-12):
            raise ValueError("V1 claim payouts must lie in [0,1]")
        return h


# ----------------------------
# Payoff compiler
# ----------------------------

def claim_event(states: np.ndarray, j: int) -> np.ndarray:
    return states[:, j].astype(float)


def claim_and(states: np.ndarray, idx: Sequence[int]) -> np.ndarray:
    return np.prod(states[:, list(idx)], axis=1).astype(float)


def claim_or(states: np.ndarray, idx: Sequence[int]) -> np.ndarray:
    return (np.max(states[:, list(idx)], axis=1) > 0).astype(float)


def claim_xor(states: np.ndarray, a: int, b: int) -> np.ndarray:
    return (states[:, a] != states[:, b]).astype(float)


def claim_n_of_m(states: np.ndarray, n_required: int, idx: Sequence[int]) -> np.ndarray:
    return (states[:, list(idx)].sum(axis=1) >= n_required).astype(float)


def claim_count_tranche(states: np.ndarray, idx: Sequence[int]) -> np.ndarray:
    """
    Tail-risk structured note:
      0 successes -> 0.00
      1 success   -> 0.20
      2 successes -> 0.60
      3 successes -> 1.00
    """
    count = states[:, list(idx)].sum(axis=1)
    table = np.array([0.0, 0.20, 0.60, 1.0])
    return table[count]


def make_five_claims(states: np.ndarray) -> Dict[str, np.ndarray]:
    if states.shape[1] < 3:
        raise ValueError("five-use-case suite requires at least 3 source conditions")
    return {
        "1_AND_A_B": claim_and(states, [0, 1]),
        "2_XOR_A_B": claim_xor(states, 0, 1),
        "3_OR_A_B": claim_or(states, [0, 1]),
        "4_2_OF_3": claim_n_of_m(states, 2, [0, 1, 2]),
        "5_TAIL_TRANCHE": claim_count_tranche(states, [0, 1, 2]),
    }


# ----------------------------
# Theorem/property tests
# ----------------------------

def run_property_tests(
    engine: StateLiquidityEngine,
    marginals: Sequence[float],
    claims: Dict[str, np.ndarray],
    stress_steps: int = 5000,
    seed: int = 123,
) -> pd.DataFrame:
    rows = []

    # 1. Marginal calibration
    state_p = engine.state_prices()
    for j, target in enumerate(marginals):
        implied = float(state_p.dot(engine.states[:, j]))
        rows.append({
            "test": f"Marginal calibration event {j+1}",
            "metric": abs(implied - target),
            "threshold": 1e-8,
            "pass": abs(implied - target) <= 1e-8,
        })

    # 2. Complete-set identity at instantaneous prices
    for name, h in claims.items():
        p_h = engine.claim_price(h)
        p_comp = engine.claim_price(1.0 - h)
        err = abs((p_h + p_comp) - 1.0)
        rows.append({
            "test": f"Complete-set identity {name}",
            "metric": err,
            "threshold": 1e-10,
            "pass": err <= 1e-10,
        })

    # 3. Exact payoff equivalence -> exact same price
    h1 = claims["1_AND_A_B"]
    h2 = claim_event(engine.states, 0) + claim_event(engine.states, 1) - claims["3_OR_A_B"]
    err = abs(engine.claim_price(h1) - engine.claim_price(h2))
    rows.append({
        "test": "Claim algebra A∧B = A + B - (A∨B)",
        "metric": err,
        "threshold": 1e-10,
        "pass": err <= 1e-10,
    })

    # 4. Path independence: cost of combined q displacement
    local = StateLiquidityEngine(engine.states, engine.prior, engine.b)
    h_a = claim_event(engine.states, 0)
    h_b = claims["2_XOR_A_B"]
    c_seq = local.execute(h_a, 17.0) + local.execute(h_b, 11.0)
    q_final = 17.0 * h_a + 11.0 * h_b
    c_direct = local.potential(q_final) - local.potential(np.zeros_like(q_final))
    err = abs(c_seq - c_direct)
    rows.append({
        "test": "Cost-function path independence",
        "metric": err,
        "threshold": 1e-9,
        "pass": err <= 1e-9,
    })

    # 5. Round-trip numerical no-arbitrage without fees
    rt = StateLiquidityEngine(engine.states, engine.prior, engine.b)
    h = claims["5_TAIL_TRANCHE"]
    c1 = rt.execute(h, 25.0)
    c2 = rt.execute(h, -25.0)
    err = abs(c1 + c2)
    rows.append({
        "test": "Round-trip cost returns to zero",
        "metric": err,
        "threshold": 1e-9,
        "pass": err <= 1e-9,
    })

    # 6. Price bounded by claim payoff range
    max_violation = 0.0
    rng = np.random.default_rng(seed)
    test_engine = StateLiquidityEngine(engine.states, engine.prior, engine.b)
    claim_list = list(claims.values())
    for _ in range(500):
        h = claim_list[int(rng.integers(0, len(claim_list)))]
        price = test_engine.claim_price(h)
        violation = max(float(np.min(h)) - price, price - float(np.max(h)), 0.0)
        max_violation = max(max_violation, violation)
        x = float(rng.uniform(-10, 20))
        test_engine.execute(h, x)
    rows.append({
        "test": "Claim prices remain within payoff convex hull",
        "metric": max_violation,
        "threshold": 1e-10,
        "pass": max_violation <= 1e-10,
    })

    # 7. Bounded-loss / solvency stress test
    stress = StateLiquidityEngine(engine.states, engine.prior, engine.b)
    reserve = stress.reserve_bound()
    min_buffer = float("inf")
    max_loss_gap = -float("inf")
    for _ in range(stress_steps):
        h = claim_list[int(rng.integers(0, len(claim_list)))]
        x = float(rng.uniform(-15, 35))
        stress.execute(h, x)
        min_buffer = min(min_buffer, stress.solvency_buffer(reserve))
        # market maker net worst-case loss = max(q) - C(q)
        max_loss_gap = max(max_loss_gap, stress.worst_state_liability() - stress.cash)
    rows.append({
        "test": "Seed reserve bound keeps solvency buffer nonnegative",
        "metric": min_buffer,
        "threshold": -1e-8,
        "pass": min_buffer >= -1e-8,
    })
    rows.append({
        "test": "Observed worst-case loss <= analytic reserve bound",
        "metric": max_loss_gap - reserve,
        "threshold": 1e-8,
        "pass": max_loss_gap <= reserve + 1e-8,
    })

    return pd.DataFrame(rows)


# ----------------------------
# Visualizations
# ----------------------------

def state_labels(states: np.ndarray) -> List[str]:
    return ["".join(str(int(x)) for x in row) for row in states]


def save_state_price_plot(
    engine: StateLiquidityEngine,
    claim: np.ndarray,
    trade_size: float,
    outdir: Path,
):
    before = engine.state_prices()
    after_q = engine.q + trade_size * claim
    after = engine.state_prices(after_q)
    labels = state_labels(engine.states)
    x = np.arange(len(labels))
    width = 0.38

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.bar(x - width/2, before, width, label="Before trade")
    ax.bar(x + width/2, after, width, label=f"After +{trade_size:g} units")
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylabel("State price / probability weight")
    ax.set_xlabel("Terminal state (A,B,C)")
    ax.set_title("PRISM shared state prices move coherently after a derivative trade")
    ax.legend()
    ax.grid(axis="y", alpha=0.25)
    fig.tight_layout()
    fig.savefig(outdir / "01_state_prices_before_after.png", dpi=170)
    plt.close(fig)


def save_clob_vs_prism_plot(
    engine: StateLiquidityEngine,
    snapshot: MarketSnapshot,
    event_claim: np.ndarray,
    outdir: Path,
):
    # Use quantities that are likely to fit both live and synthetic books.
    asks_depth = sum(x.size for x in snapshot.asks)
    max_qty = max(5.0, min(5000.0, asks_depth * 0.75 if asks_depth > 0 else 1000.0))
    qs = np.linspace(max_qty/60.0, max_qty, 60)

    prism = np.array([engine.average_execution_price(event_claim, q) for q in qs])
    clob = np.array([vwap(snapshot.asks, q, "buy") for q in qs])

    fig, ax = plt.subplots(figsize=(9, 5))
    ax.plot(qs, prism, label="PRISM Payoff AMM avg buy price")
    if np.any(np.isfinite(clob)):
        ax.plot(qs[np.isfinite(clob)], clob[np.isfinite(clob)], label="CLOB ask VWAP")
    ax.axhline(snapshot.midpoint, linestyle="--", alpha=0.7, label="CLOB midpoint")
    ax.set_xlabel("Trade size (shares)")
    ax.set_ylabel("Average price")
    ax.set_ylim(0, 1)
    ax.set_title(f"Base-event execution curve\n{snapshot.name[:90]}")
    ax.legend()
    ax.grid(alpha=0.25)
    fig.tight_layout()
    fig.savefig(outdir / "02_prism_vs_clob_execution_curve.png", dpi=170)
    plt.close(fig)


def save_five_claim_curves(
    engine: StateLiquidityEngine,
    claims: Dict[str, np.ndarray],
    outdir: Path,
):
    xs = np.linspace(-100, 250, 100)
    fig, ax = plt.subplots(figsize=(10, 6))
    for name, h in claims.items():
        prices = []
        for x in xs:
            # marginal price after hypothetical inventory displacement x*h
            q = engine.q + x * h
            prices.append(engine.claim_price(h, q))
        ax.plot(xs, prices, label=name)
    ax.set_xlabel("Hypothetical net claim inventory x")
    ax.set_ylabel("Instantaneous derivative price")
    ax.set_ylim(0, 1)
    ax.set_title("Five PRISM derivatives inherit one shared state-liquidity surface")
    ax.legend()
    ax.grid(alpha=0.25)
    fig.tight_layout()
    fig.savefig(outdir / "03_five_usecase_price_impact_curves.png", dpi=170)
    plt.close(fig)


def save_payoff_heatmap(
    states: np.ndarray,
    claims: Dict[str, np.ndarray],
    outdir: Path,
):
    data = np.vstack(list(claims.values()))
    fig, ax = plt.subplots(figsize=(10, 5))
    im = ax.imshow(data, aspect="auto", vmin=0, vmax=1)
    ax.set_xticks(np.arange(len(states)))
    ax.set_xticklabels(state_labels(states))
    ax.set_yticks(np.arange(len(claims)))
    ax.set_yticklabels(list(claims.keys()))
    ax.set_xlabel("Terminal state (A,B,C)")
    ax.set_title("Payoff compiler: every product is a vector over the same states")
    for i in range(data.shape[0]):
        for j in range(data.shape[1]):
            ax.text(j, i, f"{data[i,j]:.2f}", ha="center", va="center", fontsize=8)
    fig.colorbar(im, ax=ax, label="Payout per $1 face value")
    fig.tight_layout()
    fig.savefig(outdir / "04_payoff_matrix.png", dpi=170)
    plt.close(fig)


def save_capital_efficiency_plot(
    engine: StateLiquidityEngine,
    outdir: Path,
):
    n_claims = np.arange(1, 51)
    shared = np.full_like(n_claims, engine.reserve_bound(), dtype=float)
    isolated = n_claims * engine.b * math.log(2.0)

    fig, ax = plt.subplots(figsize=(9, 5))
    ax.plot(n_claims, isolated, label="N isolated binary LMSR reserves")
    ax.plot(n_claims, shared, label="One shared PRISM state-pool reserve")
    ax.set_xlabel("Number of listed derivative claims")
    ax.set_ylabel("Analytic worst-case maker reserve bound")
    ax.set_title("Listing more payoff vectors need not create another dedicated reserve")
    ax.legend()
    ax.grid(alpha=0.25)
    fig.tight_layout()
    fig.savefig(outdir / "05_capital_efficiency_bound.png", dpi=170)
    plt.close(fig)


def save_solvency_stress_plot(
    engine: StateLiquidityEngine,
    claims: Dict[str, np.ndarray],
    outdir: Path,
    steps: int = 1500,
    seed: int = 11,
):
    e = StateLiquidityEngine(engine.states, engine.prior, engine.b)
    reserve = e.reserve_bound()
    rng = np.random.default_rng(seed)
    vals = []
    liabilities = []
    collected = []
    claim_list = list(claims.values())

    for _ in range(steps):
        h = claim_list[int(rng.integers(0, len(claim_list)))]
        x = float(rng.uniform(-10, 25))
        e.execute(h, x)
        vals.append(e.solvency_buffer(reserve))
        liabilities.append(e.worst_state_liability())
        collected.append(e.cash)

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(np.arange(steps), vals, label="Solvency buffer")
    ax.axhline(0.0, linestyle="--", label="Insolvency boundary")
    ax.set_xlabel("Random trade step")
    ax.set_ylabel("Reserve + premiums - worst-state liability")
    ax.set_title("Adversarial/randomized solvency stress test")
    ax.legend()
    ax.grid(alpha=0.25)
    fig.tight_layout()
    fig.savefig(outdir / "06_solvency_stress.png", dpi=170)
    plt.close(fig)


def save_correlation_sensitivity(
    p_a: float,
    p_b: float,
    outdir: Path,
):
    rhos = np.linspace(-0.99, 0.99, 300)
    and_p, xor_p, or_p = [], [], []
    for rho in rhos:
        joint = two_event_joint_from_rho(p_a, p_b, rho)
        p00, p01, p10, p11 = joint
        and_p.append(p11)
        xor_p.append(p01 + p10)
        or_p.append(1 - p00)

    lo, hi = frechet_and_bounds(p_a, p_b)

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(rhos, and_p, label="A AND B")
    ax.plot(rhos, xor_p, label="A XOR B")
    ax.plot(rhos, or_p, label="A OR B")
    ax.axhline(lo, linestyle="--", alpha=0.5, label="AND Fréchet lower bound")
    ax.axhline(hi, linestyle="--", alpha=0.5, label="AND Fréchet upper bound")
    ax.set_xlabel("Explicit Bernoulli correlation assumption ρ")
    ax.set_ylabel("Implied derivative probability")
    ax.set_ylim(0, 1)
    ax.set_title("CLOB marginals do not identify joint derivative prices")
    ax.legend()
    ax.grid(alpha=0.25)
    fig.tight_layout()
    fig.savefig(outdir / "07_dependency_sensitivity_and_bounds.png", dpi=170)
    plt.close(fig)


# ----------------------------
# Reports and main experiment
# ----------------------------

def describe_use_cases(
    claims: Dict[str, np.ndarray],
    engine: StateLiquidityEngine,
) -> pd.DataFrame:
    descriptions = {
        "1_AND_A_B": "Joint-event claim: pays $1 only if A and B both resolve YES.",
        "2_XOR_A_B": "Divergence claim: pays $1 if exactly one of A or B resolves YES.",
        "3_OR_A_B": "Broad event exposure: pays $1 if A or B (or both) resolves YES.",
        "4_2_OF_3": "Basket/parlay primitive: pays $1 if at least two of A,B,C resolve YES.",
        "5_TAIL_TRANCHE": "Structured tranche: payout rises 0/.20/.60/1.00 with 0/1/2/3 YES outcomes.",
    }
    rows = []
    for name, h in claims.items():
        rows.append({
            "use_case": name,
            "description": descriptions[name],
            "initial_price": engine.claim_price(h),
            "min_payoff": float(h.min()),
            "max_payoff": float(h.max()),
        })
    return pd.DataFrame(rows)


def market_table(snapshots: Sequence[MarketSnapshot]) -> pd.DataFrame:
    rows = []
    for i, s in enumerate(snapshots):
        rows.append({
            "event": chr(ord("A") + i),
            "name": s.name,
            "source": s.source,
            "midpoint": s.midpoint,
            "best_bid": s.best_bid,
            "best_ask": s.best_ask,
            "spread": s.best_ask - s.best_bid,
            "liquidity": s.liquidity,
            "volume": s.volume,
            "market_id": s.market_id,
            "yes_token_id": s.yes_token_id,
        })
    return pd.DataFrame(rows)


def write_markdown_report(
    outdir: Path,
    markets: pd.DataFrame,
    usecases: pd.DataFrame,
    tests: pd.DataFrame,
    engine: StateLiquidityEngine,
    rho: float,
):
    p_a = float(markets.iloc[0]["midpoint"])
    p_b = float(markets.iloc[1]["midpoint"])
    flo, fhi = frechet_and_bounds(p_a, p_b)
    passed = int(tests["pass"].sum())
    total = len(tests)

    md = f"""# PRISM State Liquidity Engine — Experiment Report

## What this run establishes

This run is a numerical **falsification harness**, not a proof of commercial viability.
It tests whether the proposed shared-state cost-function market is internally coherent
under the stated model and whether it can be calibrated to observable CLOB marginals.

**Property tests passed:** {passed}/{total}

## External / fixture markets

{markets.to_markdown(index=False)}

## Dependency model

CLOB prices identify event marginals but do not identify their joint distribution.
This run used a Gaussian-copula prior with equicorrelation **rho = {rho:.3f}**, followed
by iterative proportional fitting so the final state distribution exactly reproduces
the observed CLOB marginals.

For A and B, the external midpoints are:

- P(A) = {p_a:.6f}
- P(B) = {p_b:.6f}

The mathematically admissible Fréchet interval for P(A AND B) is:

- lower = {flo:.6f}
- upper = {fhi:.6f}

Any point estimate inside that interval requires additional information or assumptions.

## Five derivative use cases

{usecases.to_markdown(index=False)}

## Shared-liquidity reserve theorem

The weighted cost function is

`C(q) = b log(sum_i pi_i exp(q_i / b))`

with **b = {engine.b:.4f}**.

Analytic market-maker seed reserve bound:

`R0 >= b log(1/min(pi)) = {engine.reserve_bound():.6f}`

This is independent of how many claim definitions are listed over the *same* finite
state universe. It is **not** a statement that unlimited order flow is free or that
oracle/manipulation risk disappears.

## Tests

{tests.to_markdown(index=False)}

## Generated figures

1. `01_state_prices_before_after.png`
2. `02_prism_vs_clob_execution_curve.png`
3. `03_five_usecase_price_impact_curves.png`
4. `04_payoff_matrix.png`
5. `05_capital_efficiency_bound.png`
6. `06_solvency_stress.png`
7. `07_dependency_sensitivity_and_bounds.png`

## Interpretation

A successful run supports four narrower claims:

1. One shared finite-state cost function can quote many payoff vectors coherently.
2. Marginal claims can be anchored to external CLOB probabilities.
3. Exact payoff-equivalent portfolios have identical instantaneous values under the
   same state-price vector.
4. The weighted-LMSR cost function has a finite analytic worst-case loss bound, which
   can be used as a seed-reserve requirement.

It does **not** establish that:
- the chosen joint-dependence model is correct;
- PRISM prices will outperform professional market makers;
- external CLOB prices cannot be manipulated;
- a production oracle is safe;
- real users will trade these products;
- legal/regulatory requirements are satisfied.

Those need separate empirical and operational validation.
"""
    (outdir / "REPORT.md").write_text(md, encoding="utf-8")