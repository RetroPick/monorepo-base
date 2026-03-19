import { Abi, erc20Abi } from 'viem';
import CollateralVaultABI from './abi/CollateralVault.json';
import ExecutionLedgerABI from './abi/ExecutionLedger.json';
import MarketRegistryABI from './abi/MarketRegistry.json';
import ChannelSettlementABI from './abi/ChannelSettlement.json';
import MarketDraftBoardABI from './abi/MarketDraftBoard.json';
import DraftClaimManagerABI from './abi/DraftClaimManager.json';
import LiquidityVaultFactoryABI from './abi/LiquidityVaultFactory.json';
import FaucetABI from './abi/Faucet.json';

// Verified deployed addresses on Avalanche Fuji (Testnet) V3 - aligned with DeploymentConfig.md
export const CONTRACT_ADDRESSES = {
    // Shared Mock Token
    USDC: "0x61c8d94ab8a729126a9FA41751FaD7F464604948" as const,

    // Core contracts (V3)
    CollateralVault: "0x792a065dD308A1Fc3d115Ea006b3093D8fBd7ea1" as const,
    MultiAssetVault: "0x71EEA55f90c028aEE2b0F0785d015ea4e9165aBF" as const,
    MarketRegistry: "0x3235094A8826a6205F0A0b74E2370A4AC39c6Cc2" as const,
    ChannelSettlement: "0xFA5D0e64B0B21374690345d4A88a9748C7E22182" as const,
    MarketDraftBoard: "0x8a81759d0A4383E4879b0Ff298Bf60ff24be8302" as const,
    DraftClaimManager: "0x0b7B98b10b2067a4918720Bc04f374c669B313d5" as const,
    OutcomeToken1155: "0x9B413811ecfD0e0679A7Ba785de44E15E7482044" as const,
    ExecutionLedger: "0x2222222222222222222222222222222222222222" as const, // Deprecated in V3
    Faucet: "0x4d74eCEc809D1DbbD8D4B9D1c26fFc8b8FbA9E89" as const,
};

export const ABIS = {
    CollateralVault: CollateralVaultABI as Abi,
    ExecutionLedger: ExecutionLedgerABI as Abi,
    MarketRegistry: MarketRegistryABI as Abi,
    ChannelSettlement: ChannelSettlementABI as Abi,
    MarketDraftBoard: MarketDraftBoardABI as Abi,
    DraftClaimManager: DraftClaimManagerABI as Abi,
    LiquidityVaultFactory: LiquidityVaultFactoryABI as Abi,
    Faucet: FaucetABI as Abi,
    ERC20: erc20Abi
};
