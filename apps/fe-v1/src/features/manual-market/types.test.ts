import { describe, expect, it } from "vitest";
import { manualMarketFromChainDetail } from "./types";

describe("manualMarketFromChainDetail", () => {
  it("prefers decorated titles and outcome labels from the API", () => {
    const model = manualMarketFromChainDetail({
      templateId: "0xabc",
      slug: "eth-5d-range-2250-2300-manual",
      title: "Where will ETH close by resolve?",
      subtitle: "Five-day ETH/USD range market.",
      outcomeLabels: ["< $2,250", "$2,250 to < $2,300", ">= $2,300"],
      marketType: 2,
      outcomeCount: 3,
      initialized: true,
      executionMode: 0,
      rollingPhase: 0,
      rollingHaltReason: 0,
      lastIndexedBlock: 1,
      lastIndexedAt: null,
      outcomes: [
        { outcomeIndex: 0, label: "< $2,250", poolSize: "10", impliedProbabilityE6: "250000" },
        { outcomeIndex: 1, label: "$2,250 to < $2,300", poolSize: "10", impliedProbabilityE6: "250000" },
        { outcomeIndex: 2, label: ">= $2,300", poolSize: "10", impliedProbabilityE6: "250000" },
      ],
    });

    expect(model.title).toBe("Where will ETH close by resolve?");
    expect(model.description).toBe("Five-day ETH/USD range market.");
    expect(model.outcomes.map((outcome) => outcome.label)).toEqual([
      "< $2,250",
      "$2,250 to < $2,300",
      ">= $2,300",
    ]);
  });
});
