import {
  ClipboardCheck,
  Home,
  Landmark,
  LineChart,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const appNavItems: {
  href: string;
  label: string;
  icon: LucideIcon;
  match: string[];
}[] = [
  { href: "/home", label: "Home", icon: Home, match: ["/home", "/month"] },
  {
    href: "/movements",
    label: "Movements",
    icon: Wallet,
    match: ["/movements", "/transactions"],
  },
  { href: "/control", label: "Control", icon: ClipboardCheck, match: ["/control"] },
  {
    href: "/target",
    label: "Targets",
    icon: LineChart,
    match: ["/target", "/target/month", "/target/annual", "/plan", "/budget"],
  },
  { href: "/wealth", label: "Wealth", icon: Landmark, match: ["/wealth"] },
];

export const settingsNavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
  match: ["/settings"],
};

export function isNavActive(pathname: string, match: string[]) {
  return match.some((m) => pathname.startsWith(m));
}
