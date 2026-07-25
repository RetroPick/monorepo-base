import { useState } from "react";
import { useAccount } from "wagmi";

import { apiBaseUrl } from "@/features/gooddollar/config";

export default function InvitePage() {
  const { address } = useAccount();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const inviteLink = address
    ? `${window.location.origin}/app/gooddollar/invite?ref=${encodeURIComponent(address)}`
    : "";

  async function applyCode() {
    if (!address || !code) return;
    const res = await fetch(`${apiBaseUrl()}/api/v1/referrals/apply-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: address, code }),
    });
    setMessage(res.ok ? "Invite code applied." : "Could not apply code.");
  }

  return (
    <div className="mx-auto max-w-lg p-4 space-y-4">
      <h1 className="text-2xl font-bold">Invite</h1>
      <p className="text-muted-foreground">Share your link. Earn when friends generate real protocol fees.</p>
      {inviteLink ? (
        <div className="rounded-lg border p-3 text-sm break-all">{inviteLink}</div>
      ) : (
        <p className="text-sm">Connect wallet to get your invite link.</p>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium">Have a code?</label>
        <input
          className="w-full rounded-md border px-3 py-2"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste invite code"
        />
        <button type="button" onClick={applyCode} className="rounded-md bg-primary text-primary-foreground px-4 py-2">
          Apply code
        </button>
        {message ? <p className="text-sm">{message}</p> : null}
      </div>
    </div>
  );
}
