export type SectionInfoKey =
  | "home.yourMonths"
  | "home.yearAtGlance"
  | "home.yearFacts"
  | "home.whereMoneyWent"
  | "month.thisMonthsData"
  | "month.whereMoneyWent"
  | "month.recentMovements"
  | "movements.list"
  | "movements.page"
  | "wealth.netWorth"
  | "wealth.cashInAccounts"
  | "wealth.transfers"
  | "wealth.positions"
  | "target.globalIncome"
  | "target.netWorthTracked"
  | "target.planBase"
  | "target.incomePace"
  | "target.planCheck"
  | "target.spendingSavingsYtd"
  | "target.planSummary"
  | "target.categoryBudgets"
  | "target.pageOverview"
  | "target.monthlyPage"
  | "target.annualPage"
  | "wealth.page"
  | "control.overview"
  | "control.pay"
  | "control.receive"
  | "settings.currency"
  | "settings.savingsTarget"
  | "settings.incomeSources"
  | "settings.accounts"
  | "settings.categories";

export type SectionInfoContent = {
  title: string;
  paragraphs: string[];
};

export const SECTION_INFO: Record<SectionInfoKey, SectionInfoContent> = {
  "home.yourMonths": {
    title: "Your months",
    paragraphs: [
      "Each tile is one calendar month in the selected year.",
      "Saved amount and savings rate use imported movements for that month. Tap a month to open its detail page.",
    ],
  },
  "home.yearAtGlance": {
    title: "The year at a glance",
    paragraphs: [
      "Bar chart of income, spending, and savings for every month in the year.",
      "Months without data show as empty bars until you import movements.",
    ],
  },
  "home.yearFacts": {
    title: "A few things about your year",
    paragraphs: [
      "Quick stats aggregated across months that have data: averages and totals for the year.",
      "Most expensive category is based on categorized spending, not transfers or card payments.",
    ],
  },
  "home.whereMoneyWent": {
    title: "Where your money went",
    paragraphs: [
      "Annual view of spending by category for the selected year.",
      "Actuals come from categorized expenses; bars compare spend to your annual category targets when set.",
    ],
  },
  "month.thisMonthsData": {
    title: "This month's data",
    paragraphs: [
      "One row per account slot (UYU, USD, card). Shows whether the month has movements and when you last uploaded a file that added rows in this month.",
      "Use + to import or add movements; the eye opens filtered movements; trash removes this month's rows for that account only.",
    ],
  },
  "month.whereMoneyWent": {
    title: "Where your money went",
    paragraphs: [
      "Spending in this month by category, compared to your monthly category targets.",
      "Tap a row to see those movements.",
    ],
  },
  "month.recentMovements": {
    title: "Recent movements",
    paragraphs: [
      "Latest transactions in this month. Open Movements for search, filters, and edits.",
    ],
  },
  "movements.list": {
    title: "Movements list",
    paragraphs: [
      "All movements matching your filters. Edit, delete, tag transfers, or link refunds from each row.",
      "Amounts use the transaction date you set (including if you moved a payment to another month for budgeting).",
    ],
  },
  "movements.page": {
    title: "Movements",
    paragraphs: [
      "Full ledger of imported and manual transactions. Filter by month, year, account, category, or type.",
      "Use this page to fix categories, transfer tags, and dates after import.",
    ],
  },
  "wealth.netWorth": {
    title: "Net worth",
    paragraphs: [
      "Cash in tracked bank accounts (from balance anchors and movements) plus manual wealth positions, converted to USD.",
      "Positions are things imports do not cover fully (investments, fixed income, etc.).",
    ],
  },
  "wealth.cashInAccounts": {
    title: "Cash in accounts",
    paragraphs: [
      "Computed balance per account: opening anchor + movements since that date.",
      "Edit the anchor when your real balance differs from the app (e.g. after reconciling with the bank).",
    ],
  },
  "wealth.transfers": {
    title: "Transfers",
    paragraphs: [
      "Outgoing transfers in the year, grouped by how you tagged them: to wealth positions, between accounts, or untracked.",
      "Tagging helps reconcile money that left the bank but is not spending.",
    ],
  },
  "wealth.positions": {
    title: "Positions",
    paragraphs: [
      "Manual holdings you track outside normal account cash: funds, fixed income, property notes, etc.",
      "Amounts are in native currency with USD shown for the total.",
    ],
  },
  "target.globalIncome": {
    title: "Global income",
    paragraphs: [
      "Planned annual income from Settings vs income actually imported in the year.",
      "The delta highlights one-offs, missing paychecks, or other banks not in your plan.",
    ],
  },
  "target.netWorthTracked": {
    title: "Net worth tracked",
    paragraphs: [
      "Snapshot linking your plan to Wealth: cash in accounts plus tracked positions.",
      "Use Wealth to update anchors and positions; this card is read-only overview.",
    ],
  },
  "target.planBase": {
    title: "Plan base",
    paragraphs: [
      "Monthly and annual room to spend from your income sources and savings target in Settings.",
      "Room to spend = planned income minus goal to save.",
    ],
  },
  "target.incomePace": {
    title: "Income pace",
    paragraphs: [
      "Year-to-date planned income through the current month vs what actually arrived.",
      "Helps see if you are ahead or behind your recurring income assumption.",
    ],
  },
  "target.planCheck": {
    title: "Plan check",
    paragraphs: [
      "Compares sum of category targets to room to spend for the month and the full year.",
      "A gap means category budgets are higher or lower than what your plan allows.",
    ],
  },
  "target.spendingSavingsYtd": {
    title: "Spending & savings",
    paragraphs: [
      "Year-to-date spending and savings vs plan: room to spend YTD, save goal YTD, and how you are tracking.",
      "Uses transaction dates as stored in the app.",
    ],
  },
  "target.planSummary": {
    title: "Plan summary",
    paragraphs: [
      "Expected income, savings goal, room to spend, and category target total for this period.",
      "On annual view, spent YTD compares to the yearly category target.",
    ],
  },
  "target.categoryBudgets": {
    title: "Category budgets",
    paragraphs: [
      "Set a spending target per category. Progress bars show actual spend in the period.",
      "Monthly page is one month; annual page spreads the year.",
    ],
  },
  "target.pageOverview": {
    title: "Plan overview",
    paragraphs: [
      "Year-level view of income plan, room to spend, and progress vs category targets.",
      "Use Monthly and Annual tabs to edit category budgets in detail.",
    ],
  },
  "target.monthlyPage": {
    title: "Monthly target",
    paragraphs: [
      "Category budgets and spend for one month. Plan summary shows room to spend from Settings.",
    ],
  },
  "target.annualPage": {
    title: "Annual target",
    paragraphs: [
      "Category budgets for the full year with YTD spend on each row.",
    ],
  },
  "wealth.page": {
    title: "Wealth",
    paragraphs: [
      "Net worth from bank cash (anchors + movements) plus manual positions.",
      "Tag transfers from Movements so money moving to investments is not lost.",
    ],
  },
  "control.overview": {
    title: "Control",
    paragraphs: [
      "Monthly checklist of commitments to pay or receive: rent, salary, subscriptions, etc.",
      "Mark done, reconcile to a bank movement, or copy commitments from a previous month.",
    ],
  },
  "control.pay": {
    title: "Pay",
    paragraphs: [
      "Money you expect to send this month. Reconcile links a row to an expense or transfer from your imports.",
      "Search includes movements from this month and the next for late postings.",
    ],
  },
  "control.receive": {
    title: "Receive",
    paragraphs: [
      "Income or inflows you expect this month. Reconcile when the deposit appears in Movements.",
    ],
  },
  "settings.currency": {
    title: "Currency",
    paragraphs: [
      "Base currency for summaries and the UYU→USD rate used to convert peso amounts.",
    ],
  },
  "settings.savingsTarget": {
    title: "Savings target",
    paragraphs: [
      "Default percentage of planned income reserved as savings. Drives room to spend on Targets and Home.",
    ],
  },
  "settings.incomeSources": {
    title: "Income sources",
    paragraphs: [
      "Recurring income you plan around (salary, rent received, etc.). Active sources sum to expected monthly income.",
    ],
  },
  "settings.accounts": {
    title: "Accounts",
    paragraphs: [
      "Bank accounts and cards you import into. Inactive accounts stay in history but hide from pickers.",
    ],
  },
  "settings.categories": {
    title: "Categories",
    paragraphs: [
      "Spending groups for expenses and rules. Essential vs discretionary affects core vs extraordinary splits on Home.",
    ],
  },
};
