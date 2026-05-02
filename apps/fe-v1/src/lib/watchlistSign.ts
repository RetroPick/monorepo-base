import { DEPLOYMENT_CHAIN_ID } from "@/config/chains";

function normWallet(wallet: string): string {
  return wallet.trim().toLowerCase();
}

function normTemplateIdHex(templateId: string): string {
  let t = templateId.trim();
  if (!t.startsWith("0x")) t = `0x${t}`;
  return t.toLowerCase();
}

/** Matches backend `WatchlistSignMessage` (personal_sign payload). */
export function buildWatchlistAddSignMessage(
  chainId: number,
  wallet: string,
  templateId: string,
  deadline: number,
  nonce: number,
): string {
  const w = normWallet(wallet);
  const tid = normTemplateIdHex(templateId);
  return `RetroPick watchlist v1\nchainId=${chainId}\nwallet=${w}\ntemplateId=${tid}\naction=add\ndeadline=${deadline}\nnonce=${nonce}\n`;
}

/** Matches backend `WatchlistImportSignMessage`; `templateIds` must be sorted lexicographically. */
export function buildWatchlistImportSignMessage(
  chainId: number,
  wallet: string,
  sortedTemplateIds: string[],
  deadline: number,
  nonce: number,
): string {
  const w = normWallet(wallet);
  const ids = [...sortedTemplateIds].map(normTemplateIdHex).sort();
  return `RetroPick watchlist import v1\nchainId=${chainId}\nwallet=${w}\ntemplateIds=${ids.join(",")}\ndeadline=${deadline}\nnonce=${nonce}\n`;
}

export function defaultWatchlistChainId(): number {
  return Number(DEPLOYMENT_CHAIN_ID);
}
