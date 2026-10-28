const STORAGE_KEY = "elfmatch-pending-invite";
const NUDGED_KEY = "elfmatch-pending-invite-nudged";

export function invitePath(token: string): string {
  return `/invite/${encodeURIComponent(token)}`;
}

export function inviteTokenFromPath(path: string): string | null {
  if (!path.startsWith("/invite/") || path.startsWith("//")) return null;
  const token = path.slice("/invite/".length).split(/[?#]/)[0];
  if (!token || token.includes("/")) return null;
  try {
    return decodeURIComponent(token);
  } catch {
    return null;
  }
}

export function rememberInvite(token: string) {
  if (!token || typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, token);
}

export function rememberedInvite(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(STORAGE_KEY);
}

export function forgetInvite() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(NUDGED_KEY);
}

export function inviteWasNudged(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(NUDGED_KEY) === "1";
}

export function markInviteNudged() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(NUDGED_KEY, "1");
}
