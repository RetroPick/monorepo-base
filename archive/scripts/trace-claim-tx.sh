#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/trace-claim-tx.sh --tx <0xTxHash> [--api-url <url>] [--rpc-url <url>] [--wallet <0x...>]

What it does (read-only):
  1) Loads tx receipt from RPC
  2) Detects MarketEngine Claimed events in logs
  3) Prints templateId/epochId/user/amount per claim log
  4) Cross-checks backend indexed state:
     - /api/v1/markets/{templateId}/epochs
     - /api/v1/user/claims?wallet=
     - /api/v1/user/positions?wallet=&templateId=&epochId=

Defaults:
  --api-url http://127.0.0.1:8080
  --rpc-url env RPC_URL, else https://sepolia.base.org

Examples:
  ./scripts/trace-claim-tx.sh --tx 0xabc...
  ./scripts/trace-claim-tx.sh --tx 0xabc... --wallet 0x123... --rpc-url https://sepolia.base.org
EOF
}

TX_HASH=""
API_URL="${API_URL:-http://127.0.0.1:8080}"
RPC_URL="${RPC_URL:-https://sepolia.base.org}"
WALLET=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tx)
      TX_HASH="${2:-}"
      shift 2
      ;;
    --api-url)
      API_URL="${2:-}"
      shift 2
      ;;
    --rpc-url)
      RPC_URL="${2:-}"
      shift 2
      ;;
    --wallet)
      WALLET="${2:-}"
      shift 2
      ;;
    -h|--help|help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$TX_HASH" ]]; then
  echo "error: --tx is required" >&2
  usage
  exit 1
fi

if [[ ! "$TX_HASH" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
  echo "error: invalid tx hash format: $TX_HASH" >&2
  exit 1
fi

tmp_receipt="$(mktemp)"
tmp_decode="$(mktemp)"
trap 'rm -f "$tmp_receipt" "$tmp_decode"' EXIT

echo "== trace-claim-tx =="
echo "txHash=$TX_HASH"
echo "apiUrl=$API_URL"
echo "rpcUrl=$RPC_URL"
echo

# Load tx receipt via raw JSON-RPC.
curl -sS "$RPC_URL" \
  -H "Content-Type: application/json" \
  --data "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_getTransactionReceipt\",\"params\":[\"$TX_HASH\"]}" \
  > "$tmp_receipt"

CLAIMED_TOPIC="0xdd7a4f019412b47814d3f84b9e95f3c96087108214945d5f71197d53808b958f"

python3 - "$tmp_receipt" "$CLAIMED_TOPIC" > "$tmp_decode" <<'PY'
import json
import sys

path = sys.argv[1]
claimed_topic = sys.argv[2].lower()

with open(path, "r", encoding="utf-8") as f:
    payload = json.load(f)

receipt = payload.get("result")
if not receipt:
    print("receipt_missing")
    sys.exit(0)

status_hex = receipt.get("status", "0x0")
status = int(status_hex, 16)
block_number = int(receipt.get("blockNumber", "0x0"), 16)
logs = receipt.get("logs", [])

print(f"receipt_status={status}")
print(f"receipt_block={block_number}")
print(f"receipt_log_count={len(logs)}")

claim_idx = 0
for lg in logs:
    topics = lg.get("topics", [])
    if len(topics) < 4:
        continue
    if topics[0].lower() != claimed_topic:
        continue

    template_id = topics[1].lower()
    epoch_id = int(topics[2], 16)
    # indexed address topic: last 20 bytes
    user = "0x" + topics[3][-40:].lower()

    data_hex = (lg.get("data") or "0x")[2:]
    amount = 0
    if len(data_hex) >= 64:
        amount = int(data_hex[:64], 16)

    txh = (lg.get("transactionHash") or "").lower()
    lidx = int(lg.get("logIndex", "0x0"), 16)
    claim_idx += 1
    print(f"claim[{claim_idx}].templateId={template_id}")
    print(f"claim[{claim_idx}].epochId={epoch_id}")
    print(f"claim[{claim_idx}].user={user}")
    print(f"claim[{claim_idx}].amount={amount}")
    print(f"claim[{claim_idx}].txHash={txh}")
    print(f"claim[{claim_idx}].logIndex={lidx}")

print(f"claims_found={claim_idx}")
PY

cat "$tmp_decode"
echo

if rg -n "^receipt_missing$" "$tmp_decode" >/dev/null; then
  echo "result=NO_RECEIPT (transaction not found on this RPC/network)"
  exit 2
fi

receipt_status="$(python3 - "$tmp_decode" <<'PY'
import re,sys
txt=open(sys.argv[1],"r",encoding="utf-8").read()
m=re.search(r"^receipt_status=(\d+)$", txt, re.M)
print(m.group(1) if m else "0")
PY
)"

if [[ "$receipt_status" != "1" ]]; then
  echo "result=TX_REVERTED_OR_FAILED (status=$receipt_status)"
  exit 3
fi

claims_found="$(python3 - "$tmp_decode" <<'PY'
import re,sys
txt=open(sys.argv[1],"r",encoding="utf-8").read()
m=re.search(r"^claims_found=(\d+)$", txt, re.M)
print(m.group(1) if m else "0")
PY
)"

if [[ "$claims_found" == "0" ]]; then
  echo "result=NO_CLAIMED_EVENT_IN_TX (tx succeeded but no MarketEngine Claimed log)"
  exit 4
fi

echo "== backend cross-check =="
python3 - "$tmp_decode" "$API_URL" "$WALLET" <<'PY'
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

decode_path, api_url, wallet_hint = sys.argv[1], sys.argv[2].rstrip("/"), sys.argv[3].lower()
txt = open(decode_path, "r", encoding="utf-8").read()

claims = []
i = 1
while True:
    m_t = re.search(rf"^claim\[{i}\]\.templateId=(0x[0-9a-f]+)$", txt, re.M)
    if not m_t:
        break
    m_e = re.search(rf"^claim\[{i}\]\.epochId=(\d+)$", txt, re.M)
    m_u = re.search(rf"^claim\[{i}\]\.user=(0x[0-9a-f]+)$", txt, re.M)
    m_a = re.search(rf"^claim\[{i}\]\.amount=(\d+)$", txt, re.M)
    claims.append({
        "templateId": m_t.group(1),
        "epochId": int(m_e.group(1)) if m_e else None,
        "user": m_u.group(1) if m_u else "",
        "amount": int(m_a.group(1)) if m_a else 0,
    })
    i += 1

def get_json(url):
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode("utf-8"))

overall_ok = True
for c in claims:
    wallet = wallet_hint or c["user"]
    print(f"-- claim templateId={c['templateId']} epochId={c['epochId']} user={wallet} amount={c['amount']}")

    # Epoch status
    epochs_url = f"{api_url}/api/v1/markets/{c['templateId']}/epochs?limit=500"
    try:
        epochs = get_json(epochs_url).get("epochs", [])
        e = next((x for x in epochs if int(x.get("epochId", -1)) == int(c["epochId"])), None)
        if e:
            print(f"   epoch.status={e.get('status')} claimable={e.get('claimable')} refMode={e.get('refMode')}")
        else:
            print("   epoch.status=NOT_FOUND_IN_INDEX")
            overall_ok = False
    except urllib.error.HTTPError as ex:
        print(f"   epoch.fetch=HTTP_{ex.code}")
        overall_ok = False
    except Exception as ex:
        print(f"   epoch.fetch=ERROR {ex}")
        overall_ok = False

    # User claims list
    try:
        claims_url = f"{api_url}/api/v1/user/claims?wallet={urllib.parse.quote(wallet)}"
        uclaims = get_json(claims_url).get("claims", [])
        found = any(
            str(x.get("templateId", "")).lower() == c["templateId"].lower()
            and int(x.get("epochId", -1)) == int(c["epochId"])
            for x in uclaims
        )
        print(f"   indexed.claim_event_present={str(found).lower()}")
        if not found:
            overall_ok = False
    except Exception as ex:
        print(f"   indexed.claims_fetch=ERROR {ex}")
        overall_ok = False

    # Position state
    try:
        pos_url = (
            f"{api_url}/api/v1/user/positions?wallet={urllib.parse.quote(wallet)}"
            f"&templateId={urllib.parse.quote(c['templateId'])}&epochId={c['epochId']}"
        )
        positions = get_json(pos_url).get("positions", [])
        p = positions[0] if positions else None
        if p:
            print(
                "   indexed.position"
                f" claimed={p.get('claimed')} claimableNow={p.get('claimableNow')}"
                f" claimedAmount={p.get('claimedAmount')} pendingClaimAmount={p.get('pendingClaimAmount')}"
                f" pendingRefundAmount={p.get('pendingRefundAmount')}"
            )
        else:
            print("   indexed.position=NOT_FOUND")
            overall_ok = False
    except Exception as ex:
        print(f"   indexed.position_fetch=ERROR {ex}")
        overall_ok = False

print()
if overall_ok:
    print("final_result=SUCCESS_CONFIRMED (on-chain claim event + indexed state match)")
else:
    print("final_result=PARTIAL_OR_STALE (on-chain success but index/UI mismatch or missing projection)")
PY
