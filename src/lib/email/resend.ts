import { formatControlAmount } from "@/lib/control/logic";
import type { Currency } from "@/types/database";

export type DueCommitmentEmailItem = {
  name: string;
  direction: "pay" | "receive";
  amountLabel: string;
  dueLabel: string;
  daysUntil: number;
};

export async function sendDueCommitmentsEmail(input: {
  to: string;
  dateLabel: string;
  items: DueCommitmentEmailItem[];
  controlUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "financeX <onboarding@resend.dev>";

  if (!apiKey) {
    return { ok: false, error: "Missing RESEND_API_KEY" };
  }

  if (input.items.length === 0) {
    return { ok: true };
  }

  const hasToday = input.items.some((item) => item.daysUntil === 0);
  const subject =
    input.items.length === 1
      ? `${input.items[0].dueLabel}: ${input.items[0].name}`
      : hasToday
        ? `${input.items.length} commitments due soon`
        : `${input.items.length} commitments coming up`;

  const lines = input.items
    .map((item) => {
      const verb = item.direction === "pay" ? "Pay" : "Receive";
      return `• ${verb}: ${item.name} — ${item.amountLabel} (${item.dueLabel})`;
    })
    .join("\n");

  const text = [
    `Good morning — these commitments are due within the next 3 days (${input.dateLabel}):`,
    "",
    lines,
    "",
    `Open Control: ${input.controlUrl}`,
    "",
    "— financeX",
  ].join("\n");

  const htmlItems = input.items
    .map((item) => {
      const verb = item.direction === "pay" ? "Pay" : "Receive";
      return `<li><strong>${verb}</strong>: ${escapeHtml(item.name)} — ${escapeHtml(item.amountLabel)} <span style="color:#6E6B82">(${escapeHtml(item.dueLabel)})</span></li>`;
    })
    .join("");

  const html = `
    <div style="font-family:Manrope,Helvetica,Arial,sans-serif;color:#1C1B29;line-height:1.5">
      <p>Good morning — these commitments are due within the next 3 days (<strong>${escapeHtml(input.dateLabel)}</strong>):</p>
      <ul>${htmlItems}</ul>
      <p><a href="${escapeHtml(input.controlUrl)}" style="color:#6C3FD1;font-weight:700">Open Control →</a></p>
      <p style="color:#6E6B82;font-size:13px">— financeX</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, error: `Resend ${response.status}: ${body}` };
  }

  return { ok: true };
}

export function formatDueItemAmount(input: {
  amount: number | null;
  currency: Currency;
  amountType: "fixed" | "variable";
}): string {
  return formatControlAmount(input.amount, input.currency, input.amountType);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
