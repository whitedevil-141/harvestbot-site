// Value formatters shared by every admin screen.
//
// These are display concerns only -- nothing here talks to the API. The
// null-handling is deliberate in each case and is the reason they are shared:
// "n/a", "—" and "0" mean different things to an operator.

export const formatNumber = (value: unknown, fractionDigits = 0): string => {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString("en-US", { maximumFractionDigits: fractionDigits });
};

export const formatUsd = (value: unknown, fractionDigits = 4): string => {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "—";
  return `$${num.toLocaleString("en-US", { maximumFractionDigits: fractionDigits })}`;
};

/** Whole-dollar currency, for the payments surfaces. */
export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);

export const formatBytes = (value: number | null | undefined): string => {
  // null is meaningful: the Supabase storage backend does not report a size.
  if (value === null || value === undefined || !Number.isFinite(value)) return "n/a";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
};

export const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds)}s`;
};

export const formatTimestamp = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/** Split date and time so a table cell can stack them. */
export const formatDateTime = (isoString: string) => {
  const date = new Date(isoString);
  return {
    dateStr: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date),
    timeStr: new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(date),
  };
};

export const truncateHash = (hash?: string | null) => {
  if (!hash) return "N/A";
  if (hash.length < 12) return hash;
  return `${hash.substring(0, 6)}…${hash.substring(hash.length - 4)}`;
};

export const humanize = (key: string) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Copy without the deprecated execCommand path, falling back to a hidden
 * textarea only where the async clipboard API is unavailable (insecure origins).
 */
export const copyText = async (value: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const node = document.createElement("textarea");
    node.value = value;
    node.setAttribute("readonly", "");
    node.style.position = "fixed";
    node.style.opacity = "0";
    document.body.appendChild(node);
    node.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(node);
    return ok;
  } catch {
    return false;
  }
};
