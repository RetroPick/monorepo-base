package com.retropick.core.network

import java.math.BigDecimal

data class Eip712Domain(
    val name: String = "Polymarket CTF Exchange",
    val version: String = "1",
    val chainId: Long = 137, // Polygon Mainnet
    val verifyingContract: String = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E"
)

data class Eip712OrderMessage(
    val maker: String,
    val taker: String = "0x0000000000000000000000000000000000000000",
    val tokenId: String,
    val makerAmount: BigDecimal,
    val takerAmount: BigDecimal,
    val side: String, // BUY or SELL
    val feeRateBps: Int = 10, // 10 bps builder fee
    val nonce: String,
    val expirationTimestamp: Long,
    val builderCode: String = "RETROPICK_BUILDER_V2"
)

data class Eip712OrderTypedData(
    val primaryType: String = "Order",
    val domain: Eip712Domain = Eip712Domain(),
    val message: Eip712OrderMessage
)
