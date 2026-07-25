const STABLE_SYMBOLS = new Set([
  "USDT",
  "USDC",
  "DAI",
  "FDUSD",
  "TUSD",
  "USDE",
  "USDD",
  "FRAX",
  "PYUSD",
  "BUSD",
  "GUSD",
  "LUSD",
  "SUSD",
  "USDP",
  "CRVUSD",
]);

const STABLE_IDS = new Set([
  "tether",
  "usd-coin",
  "dai",
  "first-digital-usd",
  "true-usd",
  "ethena-usde",
  "usdd",
  "frax",
  "paypal-usd",
  "binance-usd",
  "gemini-dollar",
  "liquity-usd",
  "nusd",
  "pax-dollar",
  "curve-usd",
]);

export function isStablecoin(input: { id?: string; symbol?: string; name?: string }) {
  const id = (input.id ?? "").toLowerCase();
  const symbol = (input.symbol ?? "").toUpperCase();
  const name = (input.name ?? "").toLowerCase();

  if (STABLE_IDS.has(id)) return true;
  if (STABLE_SYMBOLS.has(symbol)) return true;

  return name.includes("usd") && (name.includes("stable") || name.includes("dollar") || name.includes("usd coin"));
}
