const AUTH_TOKEN_KEY = "retropick:auth:jwt";

export function getBackendAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return null;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function setBackendAuthToken(token: string | null | undefined) {
  if (typeof window === "undefined") return;
  const normalized = token?.trim() ?? "";
  if (!normalized) {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_TOKEN_KEY, normalized);
}

export function clearBackendAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

