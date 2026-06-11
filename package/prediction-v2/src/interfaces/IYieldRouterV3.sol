// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IYieldRouterV2} from "./IYieldRouterV2.sol";

/// @title IYieldRouterV3
/// @notice Route-policy layer for production yield routing.
/// @dev V2 accounting stays intact. V3 adds an explicit, admin-configured route that the engine can
///      validate and lock at market initialization so a market cannot silently inherit the wrong yield path.
interface IYieldRouterV3 is IYieldRouterV2 {
    enum StrategyKind {
        None,
        AaveV3,
        ERC4626
    }

    struct RouteConfigView {
        bytes32 routeId;
        StrategyKind kind;
        address strategy;
        bool enabled;
        uint256 cap;
    }

    struct TemplateYieldRouteView {
        bytes32 routeId;
        StrategyKind kind;
        address strategy;
        bool enabled;
        bool locked;
        uint256 cap;
    }

    /// @notice Configure a reusable yield route.
    /// @dev `AaveV3` routes use the router's immutable Aave pool. `ERC4626` routes require a vault whose
    ///      asset is the immutable stake token.
    function setYieldRoute(bytes32 routeId, StrategyKind kind, address strategy, bool enabled, uint256 cap) external;

    /// @notice Assign a route to a template before market initialization.
    function setTemplateYieldRoute(bytes32 templateId, bytes32 routeId) external;

    /// @notice Called by MarketEngine during `initializeMarket` to validate and freeze the template route.
    function lockTemplateYieldRoute(bytes32 templateId)
        external
        returns (bytes32 routeId, address strategy, StrategyKind kind);

    /// @notice Strict route validity check used by operators and the engine.
    function validateTemplateRoute(bytes32 templateId) external view returns (bool);

    function getYieldRoute(bytes32 routeId) external view returns (RouteConfigView memory);

    function getTemplateYieldRoute(bytes32 templateId) external view returns (TemplateYieldRouteView memory);
}
