import { format, parseISO } from "date-fns";

export function safeReturnPath(path: string | undefined | null): string | null {
  if (!path) return null;

  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  if (decoded.includes("://")) return null;

  return decoded;
}

export function buildMovementsHref(options: {
  categoryId?: string;
  month?: string;
  year?: number | string;
  type?: string;
  accountId?: string;
  transferTo?: string;
  wealthPositionId?: string;
  extraordinary?: boolean;
  returnTo?: string;
}): string {
  const params = new URLSearchParams();
  if (options.categoryId) params.set("category", options.categoryId);
  if (options.accountId) params.set("account", options.accountId);
  if (options.month) params.set("month", options.month);
  if (options.year) params.set("year", String(options.year));
  if (options.type) params.set("type", options.type);
  if (options.transferTo) params.set("transferTo", options.transferTo);
  if (options.wealthPositionId) {
    params.set("type", "transfer");
    params.set("transferTo", `wealth:${options.wealthPositionId}`);
  }
  if (options.extraordinary) params.set("extraordinary", "yes");
  if (options.returnTo) params.set("from", options.returnTo);

  const query = params.toString();
  return query ? `/movements?${query}` : "/movements";
}

export function getReturnLabel(from: string): string {
  const [pathname, search = ""] = from.split("?");
  const monthMatch = pathname.match(/^\/month\/(\d{4}-\d{2})$/);
  if (monthMatch) {
    return format(parseISO(`${monthMatch[1]}-01`), "MMMM yyyy");
  }

  if (pathname === "/home") {
    const yearMatch = search.match(/(?:^|&)year=(\d{4})(?:&|$)/);
    return yearMatch ? yearMatch[1] : "Home";
  }

  return "Back";
}

const MOVEMENTS_BACK_TARGETS: Record<string, string> = {
  "/wealth": "Wealth",
  "/target": "Targets",
  "/home": "Home",
};

export function getMovementsBackTarget(options: {
  month?: string;
  year?: string;
  from?: string;
}): { href: string; label: string } | null {
  const from = safeReturnPath(options.from);
  if (from && MOVEMENTS_BACK_TARGETS[from]) {
    return { href: from, label: MOVEMENTS_BACK_TARGETS[from] };
  }

  if (options.year && /^\d{4}$/.test(options.year)) {
    return { href: `/home?year=${options.year}`, label: options.year };
  }

  if (options.month && /^\d{4}-\d{2}$/.test(options.month)) {
    return {
      href: `/month/${options.month}`,
      label: format(parseISO(`${options.month}-01`), "MMMM yyyy"),
    };
  }

  return null;
}
