'use client'

/**
 * Conditional Token Framework (CTF) Service & Negative Risk Engine
 * Implements Polymarket CTF Operations according to docs/MARKETS_PRODUCT_SPEC.md
 * Handles Collateral Split, Token Merge, Redemption, and Negative Risk Conversions
 */

export interface CTFSplitPreview {
  collateralUsdc: number
  yesTokensOutput: number
  noTokensOutput: number
  builderFeeUsdc: string
  networkFeeUsdc: string
}

export interface CTFMergePreview {
  yesTokensInput: number
  noTokensInput: number
  collateralUsdcOutput: number
  builderFeeUsdc: string
}

export interface CTFRedeemPreview {
  winningTokensInput: number
  payoutUsdcOutput: number
  redemptionVenue: string
}

class CTFService {
  public previewSplit(amountUsdc: number): CTFSplitPreview {
    const validAmount = Math.max(0, amountUsdc)
    return {
      collateralUsdc: validAmount,
      yesTokensOutput: validAmount,
      noTokensOutput: validAmount,
      builderFeeUsdc: '0.00 USDC (0.0%)',
      networkFeeUsdc: 'Gasless (Relayed)',
    }
  }

  public previewMerge(amountShares: number): CTFMergePreview {
    const validShares = Math.max(0, amountShares)
    return {
      yesTokensInput: validShares,
      noTokensInput: validShares,
      collateralUsdcOutput: validShares,
      builderFeeUsdc: '0.00 USDC (0.0%)',
    }
  }

  public previewRedeem(winningShares: number): CTFRedeemPreview {
    const validShares = Math.max(0, winningShares)
    return {
      winningTokensInput: validShares,
      payoutUsdcOutput: validShares * 1.0, // Each winning outcome token pays $1.00 USDC
      redemptionVenue: 'Polymarket CTF Contract (Polygon)',
    }
  }

  public getNegativeRiskConversion(noShares: number, remainingOptions: number) {
    if (remainingOptions <= 1 || noShares <= 0) return { convertible: false, sharesPerOption: 0 }
    const sharesPerOption = (noShares / (remainingOptions - 1)).toFixed(2)
    return {
      convertible: true,
      sharesPerOption: parseFloat(sharesPerOption),
    }
  }
}

export const ctfService = new CTFService()
