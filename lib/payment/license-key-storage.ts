export const LICENSE_KEY_STORAGE_KEY = "harvestbot_license_key";
export const LICENSE_KEY_TTL_MS = 60 * 60 * 1000;

export type StoredLicenseKey = {
  key: string;
  expiresAt: number;
};

export const clearLicenseKey = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LICENSE_KEY_STORAGE_KEY);
  } catch {
    // Storage may be unavailable (private mode, blocked site data).
  }
};

export const saveLicenseKey = (key: string): StoredLicenseKey | null => {
  if (typeof window === "undefined") return null;
  const entry: StoredLicenseKey = { key, expiresAt: Date.now() + LICENSE_KEY_TTL_MS };
  try {
    localStorage.setItem(LICENSE_KEY_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Still show the key for this session even if it can't be persisted.
  }
  return entry;
};

export const loadLicenseKey = (): StoredLicenseKey | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LICENSE_KEY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredLicenseKey> | null;
    if (
      parsed &&
      typeof parsed.key === "string" &&
      parsed.key &&
      typeof parsed.expiresAt === "number" &&
      parsed.expiresAt > Date.now()
    ) {
      return { key: parsed.key, expiresAt: parsed.expiresAt };
    }
  } catch {
    // Fall through and drop the unreadable entry.
  }
  clearLicenseKey();
  return null;
};

export const formatLicenseKeyExpiry = (expiresAt: number) =>
  new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
