import type { TxPrepareResponse } from "./api";

/** Blob download compatible with RETRODEPLOYER `send <file>`. */
export function downloadPreparedJson(
  data: TxPrepareResponse,
  filename = `retropick-prepared-${Date.now()}.json`,
) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function castSendHint(data: TxPrepareResponse): string {
  const target = data.target;
  const cd = data.calldata;
  return `cast send ${target} ${cd} --rpc-url $RPC_URL --account $CAST_ACCOUNT`;
}
