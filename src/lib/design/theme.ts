export const theme = {
  bg: "#F3F1F9",
  surface: "#FFFFFF",
  text: "#1C1B29",
  muted: "#6E6B82",
  mutedLight: "#9E9AB0",
  border: "#F1EFF7",
  borderDash: "#E2DEF0",
  purple: "#6C3FD1",
  purpleDark: "#5F3DC4",
  purpleLight: "#9B6FF0",
  purpleTint: "#F3F1F9",
  gradient: "linear-gradient(135deg, #9B6FF0, #5F3DC4)",
  gradientButton: "linear-gradient(135deg, #9B6FF0, #6C3FD1)",
  shadow: "0 6px 20px rgba(28, 27, 41, 0.06)",
  shadowSm: "0 2px 8px rgba(28, 27, 41, 0.06)",
  shadowFab: "0 8px 24px rgba(108, 63, 209, 0.35)",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#B45309",
} as const;

export const categoryVisuals: Record<
  string,
  { emoji: string; chipColor: string }
> = {
  vivienda: { emoji: "🏠", chipColor: "#3B5BDB" },
  comida: { emoji: "🍝", chipColor: "#F59E0B" },
  transporte: { emoji: "🚕", chipColor: "#10B981" },
  "salud-deporte": { emoji: "🏃", chipColor: "#EC4899" },
  servicios: { emoji: "💡", chipColor: "#0EA5E9" },
  suscripciones: { emoji: "📱", chipColor: "#8B5CF6" },
  "ocio-compras": { emoji: "🛍", chipColor: "#EF4444" },
  viajes: { emoji: "✈", chipColor: "#06B6D4" },
  "donaciones-regalos": { emoji: "🎁", chipColor: "#D946EF" },
  "impuestos-profesionales": { emoji: "🧾", chipColor: "#475569" },
  otros: { emoji: "📦", chipColor: "#94A3B8" },
  sueldo: { emoji: "💼", chipColor: "#10B981" },
  "renta-fija": { emoji: "🏦", chipColor: "#0EA5E9" },
  "renta-variable": { emoji: "📈", chipColor: "#F59E0B" },
  "otros-ingresos": { emoji: "➕", chipColor: "#64748B" },
};

export function getCategoryVisual(slug: string | undefined) {
  if (!slug) return { emoji: "💳", chipColor: "#94A3B8" };
  return categoryVisuals[slug] ?? { emoji: "💳", chipColor: "#94A3B8" };
}
