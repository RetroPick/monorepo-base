import { compareDecimalString } from "./compareDecimalString";

const MIN_PRICE = "0.01";
const MAX_PRICE = "0.99";

export type TicketValidationResult = { ok: true } | { ok: false; message: string };

export function validateTicketFields(side: "BUY" | "SELL", price: string, size: string): TicketValidationResult {
  const trimmedPrice = price.trim();
  const trimmedSize = size.trim();

  if (!trimmedPrice) {
    return { ok: false, message: "Enter a limit price." };
  }
  if (!/^\d+(\.\d+)?$/.test(trimmedPrice)) {
    return { ok: false, message: "Price must be a decimal number." };
  }
  if (compareDecimalString(trimmedPrice, MIN_PRICE) < 0 || compareDecimalString(trimmedPrice, MAX_PRICE) > 0) {
    return { ok: false, message: "Limit price must be between 0.01 and 0.99." };
  }

  if (!trimmedSize) {
    return { ok: false, message: "Enter an order size." };
  }
  if (!/^\d+(\.\d+)?$/.test(trimmedSize)) {
    return { ok: false, message: "Size must be a decimal number." };
  }
  if (compareDecimalString(trimmedSize, "0") <= 0) {
    return { ok: false, message: "Size must be greater than zero." };
  }

  if (side !== "BUY" && side !== "SELL") {
    return { ok: false, message: "Select buy or sell." };
  }

  return { ok: true };
}
