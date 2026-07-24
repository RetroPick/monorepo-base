export type ClaimPayload = {
  wallet: string;
  rewardId: number;
  claimNonce?: string;
  data?: Record<string, unknown>;
};

export async function prepareEngagementClaim(
  apiBase: string,
  wallet: string,
  rewardId: number,
): Promise<ClaimPayload> {
  const res = await fetch(`${apiBase.replace(/\/$/, "")}/api/v1/rewards/prepare-claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, rewardId }),
  });
  if (!res.ok) {
    throw new Error(`prepare-claim failed: ${res.status}`);
  }
  return (await res.json()) as ClaimPayload;
}
