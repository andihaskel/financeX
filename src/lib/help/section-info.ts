export type SectionInfoKey =
  | "home.page"
  | "month.page"
  | "movements.page"
  | "wealth.page"
  | "target.pageOverview"
  | "target.monthlyPage"
  | "target.annualPage"
  | "control.overview"
  | "settings.page";

export type SectionInfoBlock = {
  title: string;
  paragraphs: string[];
};

export type SectionInfoContent = {
  title: string;
  paragraphs?: string[];
  sections?: SectionInfoBlock[];
};

export const SECTION_INFO: Record<SectionInfoKey, SectionInfoContent> = {
  "home.page": {
    title: "Your year at a glance",
    paragraphs: [
      "Year view of income, spending, savings, and how each month is going. Use the arrows to change year.",
    ],
    sections: [
      {
        title: "Your months",
        paragraphs: [
          "Each tile is one calendar month. Saved amount and savings rate use imported movements for that month.",
        ],
      },
      {
        title: "The year at a glance",
        paragraphs: [
          "Bar chart of income, spending, and savings per month. Empty bars mean no data yet.",
        ],
      },
      {
        title: "A few things about your year",
        paragraphs: [
          "Averages and totals across months with data. Most expensive category uses categorized spending, not transfers or card payments.",
        ],
      },
      {
        title: "Where your money went",
        paragraphs: [
          "Annual spending by category vs annual category targets when you set them.",
        ],
      },
    ],
  },
  "month.page": {
    title: "Month",
    paragraphs: [
      "One month’s KPIs, import coverage, spending breakdown, and latest movements.",
    ],
    sections: [
      {
        title: "This month’s data",
        paragraphs: [
          "One row per account slot (UYU, USD, card): coverage, last upload for this month, import, view movements, or delete this month’s rows for that account.",
        ],
      },
      {
        title: "Where your money went",
        paragraphs: [
          "Spend by category vs monthly targets. Tap a row to open those movements.",
        ],
      },
      {
        title: "Recent movements",
        paragraphs: [
          "Latest transactions in the month. Use Movements for full search and edits.",
        ],
      },
    ],
  },
  "movements.page": {
    title: "Movements",
    paragraphs: [
      "Full ledger of imported and manual transactions. Filter by month, year, account, category, or type.",
      "Fix categories, transfer tags, refund links, and dates after import. Amounts follow the transaction date you set (including budget-month shifts).",
    ],
  },
  "wealth.page": {
    title: "Wealth",
    paragraphs: [
      "Net worth in USD: cash in tracked accounts plus manual positions. Tag transfers in Movements so money moving to investments is not counted as spending.",
    ],
    sections: [
      {
        title: "Net worth",
        paragraphs: [
          "Cash from balance anchors and movements, plus positions imports do not fully represent.",
        ],
      },
      {
        title: "Cash in accounts",
        paragraphs: [
          "Per-account balance = opening anchor + movements since that date. Edit anchors after reconciling with the bank.",
        ],
      },
      {
        title: "Transfers",
        paragraphs: [
          "Outgoing transfers in the year by tag: to positions, between accounts, or untracked.",
        ],
      },
      {
        title: "Positions",
        paragraphs: [
          "Manual holdings (funds, fixed income, etc.) in native currency with USD in the total.",
        ],
      },
    ],
  },
  "target.pageOverview": {
    title: "Plan overview",
    paragraphs: [
      "Year-level plan vs actuals. Edit category budgets under Monthly and Annual.",
    ],
    sections: [
      {
        title: "Global income",
        paragraphs: [
          "Planned annual income from Settings vs income imported in the year.",
        ],
      },
      {
        title: "Net worth tracked",
        paragraphs: [
          "Read-only link to Wealth: cash in accounts plus tracked positions.",
        ],
      },
      {
        title: "Plan base",
        paragraphs: [
          "Room to spend from income sources and savings target: planned income minus goal to save.",
        ],
      },
      {
        title: "Income pace · YTD",
        paragraphs: [
          "Planned income through the current month vs what actually arrived.",
        ],
      },
      {
        title: "Plan check",
        paragraphs: [
          "Sum of category targets vs room to spend for the month and full year.",
        ],
      },
      {
        title: "Spending & savings · YTD",
        paragraphs: [
          "Spent and saved year-to-date vs plan, using stored transaction dates.",
        ],
      },
    ],
  },
  "target.monthlyPage": {
    title: "Monthly target",
    paragraphs: [
      "Category budgets and spend for one month. Plan summary shows room to spend from Settings.",
    ],
    sections: [
      {
        title: "Plan summary",
        paragraphs: [
          "Expected income, savings goal, room to spend, and category target total for the month.",
        ],
      },
      {
        title: "Category budgets",
        paragraphs: [
          "Target per category with progress from actual spend in the month.",
        ],
      },
    ],
  },
  "target.annualPage": {
    title: "Annual target",
    paragraphs: [
      "Category budgets for the full year with year-to-date spend on each row.",
    ],
    sections: [
      {
        title: "Plan summary",
        paragraphs: [
          "Annual expected income, savings, room to spend, and category targets; spent YTD vs yearly target.",
        ],
      },
      {
        title: "Category budgets",
        paragraphs: [
          "Set yearly targets; bars compare to spend accumulated so far in the year.",
        ],
      },
    ],
  },
  "control.overview": {
    title: "Control",
    paragraphs: [
      "Monthly checklist of what you expect to pay or receive. Mark done, reconcile to a bank movement, or copy from a previous month.",
    ],
    sections: [
      {
        title: "Pay",
        paragraphs: [
          "Expected outflows. Reconcile links a row to an expense or transfer. Search includes this month and the next for late postings.",
        ],
      },
      {
        title: "Receive",
        paragraphs: [
          "Expected inflows. Reconcile when the deposit appears in Movements.",
        ],
      },
    ],
  },
  "settings.page": {
    title: "Settings",
    paragraphs: [
      "Configure how the app plans, converts currency, and sorts imports. Use Incognito and Dark mode in the sidebar menu (above Settings). Incognito hides amounts in the UI without changing stored data.",
    ],
    sections: [
      {
        title: "General",
        paragraphs: [
          "Currency and UYU→USD rate for summaries. Savings target % drives room to spend on Home and Targets. Income sources sum to planned monthly income.",
        ],
      },
      {
        title: "Accounts",
        paragraphs: [
          "Banks and cards you import into. Inactive accounts stay in history but hide from pickers.",
        ],
      },
      {
        title: "Categories",
        paragraphs: [
          "Spending groups for expenses and rules. Essential vs discretionary affects core vs extraordinary splits on Home.",
        ],
      },
      {
        title: "Rules",
        paragraphs: [
          "Auto-categorization patterns applied on import. Higher priority rules win.",
        ],
      },
    ],
  },
};
