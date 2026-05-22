/** Basic RFC-style email check (not exhaustive). */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(trimmed);
}

/** Minecraft-style username: 3–16 chars, letters, numbers, underscore. */
export function isValidMinecraftUsername(username: string): boolean {
  const trimmed = username.trim();
  return /^[a-zA-Z0-9_]{3,16}$/.test(trimmed);
}

export function normalizeMinecraftUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function passwordResetUrl(): string {
  const base =
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_APP_URL) ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${String(base).replace(/\/$/, "")}/reset-password`;
}

export function emailFromRecord(
  record: Record<string, unknown> | null | undefined,
): string {
  if (!record) return "";
  const email = record.email;
  return typeof email === "string" ? email.trim() : "";
}

export function isEmailVerified(
  record: Record<string, unknown> | null | undefined,
): boolean {
  if (!record) return false;
  return Boolean(record.verified);
}
