#!/usr/bin/env python3
"""Unit tests for estimate_deploy_and_epoch_costs fork RPC and timeout behavior."""

from __future__ import annotations

import subprocess
import sys
import unittest
from pathlib import Path
from unittest import mock

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import estimate_deploy_and_epoch_costs as est  # noqa: E402


class ResolveDeployForkRpcTests(unittest.TestCase):
    def test_mainnet_pricing_defaults_to_sepolia_fork(self) -> None:
        fork, reason = est.resolve_deploy_fork_rpc(
            "https://mainnet.base.org",
            None,
            est.BASE_MAINNET_CHAIN_ID,
        )
        self.assertEqual(fork, est.DEFAULT_BASE_SEPOLIA_RPC)
        self.assertIsNotNone(reason)
        self.assertIn("Sepolia", reason or "")

    def test_sepolia_pricing_uses_same_fork(self) -> None:
        rpc = "https://sepolia.base.org"
        fork, reason = est.resolve_deploy_fork_rpc(
            rpc,
            None,
            est.BASE_SEPOLIA_CHAIN_ID,
        )
        self.assertEqual(fork, rpc)
        self.assertIsNone(reason)

    def test_explicit_fork_override(self) -> None:
        custom = "https://custom.example/rpc"
        fork, reason = est.resolve_deploy_fork_rpc(
            "https://mainnet.base.org",
            custom,
            est.BASE_MAINNET_CHAIN_ID,
        )
        self.assertEqual(fork, custom)
        self.assertIsNone(reason)


class SimulateDeployTimeoutTests(unittest.TestCase):
    def test_timeout_returns_snapshot_fallback(self) -> None:
        with mock.patch.object(est.shutil, "which", return_value="/usr/bin/forge"):
            with mock.patch.object(
                est.subprocess,
                "run",
                side_effect=subprocess.TimeoutExpired(cmd=["forge"], timeout=1),
            ):
                dep = est.simulate_deploy(
                    label="test",
                    script_ref="script/production/DeployProduction.s.sol:DeployProduction",
                    env_overrides=est.default_production_env(est.BASE_SEPOLIA_CHAIN_ID),
                    fork_rpc_url=est.DEFAULT_BASE_SEPOLIA_RPC,
                    fork_chain_id=est.BASE_SEPOLIA_CHAIN_ID,
                    pricing_rpc_url="https://mainnet.base.org",
                    pricing_chain_id=est.BASE_MAINNET_CHAIN_ID,
                    gas_price_wei=1_000_000,
                    fallback_gas_units=42_000,
                    forge_timeout=1,
                )
        self.assertFalse(dep.simulation_ok)
        self.assertEqual(dep.gas_source, "snapshot/fallback")
        self.assertEqual(dep.gas_units, 42_000)
        self.assertTrue(any("timed out" in n for n in dep.notes))


if __name__ == "__main__":
    unittest.main()
