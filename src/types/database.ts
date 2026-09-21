export type Currency = "USD" | "UYU";

export type AccountType =
  | "bank_account"
  | "checking"
  | "savings"
  | "credit_card"
  | "cash"
  | "investment";

export type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "credit_card_payment"
  | "refund"
  | "investment";

export type CategorizationStatus =
  | "auto"
  | "suggested"
  | "needs_review"
  | "manual";

export type CategoryGroup = "essential" | "discretionary" | "extraordinary" | "income";

export type RuleMatchType = "contains" | "exact" | "starts_with";

export type ImportStatus = "processing" | "review" | "completed" | "failed";

export type IncomeSourceType = "salary" | "property" | "other";

export type WealthPositionKind =
  | "cash"
  | "checking"
  | "savings"
  | "investment"
  | "other";

export type TransferDestinationKind =
  | "internal_account"
  | "wealth_position"
  | "external";

export type CommitmentDirection = "pay" | "receive";
export type CommitmentAmountType = "fixed" | "variable";
export type CommitmentRecurrenceType = "monthly" | "annual" | "one_time" | "custom";
export type CommitmentOccurrenceStatus =
  | "pending"
  | "completed"
  | "reconciled"
  | "skipped";

/** Positive = money entering the account, negative = money leaving. */
export interface Account {
  id: string;
  user_id: string;
  name: string;
  institution: string | null;
  type: AccountType;
  currency: Currency;
  active: boolean;
  opening_balance: number | null;
  opening_balance_date: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  group: CategoryGroup;
  icon: string | null;
  active: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  import_id: string | null;
  transaction_date: string;
  description: string;
  normalized_description: string;
  amount: number;
  currency: Currency;
  transaction_type: TransactionType;
  category_id: string | null;
  is_recurring: boolean;
  is_extraordinary: boolean;
  excluded_from_spending: boolean;
  categorization_status: CategorizationStatus;
  categorization_rule_id: string | null;
  notes: string | null;
  fingerprint: string;
  refunds_transaction_id: string | null;
  transfer_destination_kind: TransferDestinationKind | null;
  transfer_destination_account_id: string | null;
  transfer_destination_wealth_position_id: string | null;
  income_wealth_position_id: string | null;
  income_principal_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionWithRelations extends Transaction {
  accounts?: Pick<Account, "id" | "name" | "type" | "currency"> | null;
  categories?: Pick<Category, "id" | "name" | "slug" | "group"> | null;
}

export interface CategorizationRule {
  id: string;
  user_id: string;
  name: string;
  match_type: RuleMatchType;
  pattern: string;
  transaction_type: TransactionType;
  category_id: string | null;
  excluded_from_spending: boolean;
  is_recurring: boolean;
  is_extraordinary: boolean;
  priority: number;
  active: boolean;
  created_at: string;
}

export interface Import {
  id: string;
  user_id: string;
  filename: string;
  source_type: string | null;
  account_id: string | null;
  currency: Currency | null;
  imported_at: string;
  transaction_count: number;
  status: ImportStatus;
}

export interface IncomeSource {
  id: string;
  user_id: string;
  name: string;
  type: IncomeSourceType;
  expected_monthly_amount: number;
  currency: Currency;
  active: boolean;
}

export interface WealthPosition {
  id: string;
  user_id: string;
  name: string;
  kind: WealthPositionKind;
  amount: number;
  currency: Currency;
  account_id: string | null;
  notes: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonthlyBudget {
  id: string;
  user_id: string;
  category_id: string;
  month: string;
  budget_amount: number;
  currency: Currency;
}

export interface AnnualBudget {
  id: string;
  user_id: string;
  year: number;
  category_id: string;
  budget_amount: number;
  currency: Currency;
}

export interface Commitment {
  id: string;
  user_id: string;
  name: string;
  direction: CommitmentDirection;
  amount: number | null;
  currency: Currency;
  amount_type: CommitmentAmountType;
  recurrence_type: CommitmentRecurrenceType;
  due_day: number | null;
  due_month: number | null;
  custom_months: number[] | null;
  start_date: string | null;
  end_date: string | null;
  match_hint: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CommitmentOccurrence {
  id: string;
  user_id: string;
  commitment_id: string;
  year: number;
  month: number;
  expected_amount: number | null;
  actual_amount: number | null;
  status: CommitmentOccurrenceStatus;
  manually_completed_at: string | null;
  reconciled_transaction_id: string | null;
  reconciled_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommitmentOccurrenceWithCommitment extends CommitmentOccurrence {
  commitments: Commitment;
}

export interface UserSettings {
  id: string;
  user_id: string;
  base_currency: Currency;
  savings_target_percent: number;
  uyu_to_usd_rate: number;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: Account;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          institution?: string | null;
          type?: AccountType;
          currency: Currency;
          active?: boolean;
          opening_balance?: number | null;
          opening_balance_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          institution?: string | null;
          type?: AccountType;
          currency?: Currency;
          active?: boolean;
          opening_balance?: number | null;
          opening_balance_date?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          group?: CategoryGroup;
          icon?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string;
          group?: CategoryGroup;
          icon?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          import_id?: string | null;
          transaction_date: string;
          description: string;
          normalized_description: string;
          amount: number;
          currency: Currency;
          transaction_type?: TransactionType;
          category_id?: string | null;
          is_recurring?: boolean;
          is_extraordinary?: boolean;
          excluded_from_spending?: boolean;
          categorization_status?: CategorizationStatus;
          categorization_rule_id?: string | null;
          notes?: string | null;
          fingerprint: string;
          refunds_transaction_id?: string | null;
          transfer_destination_kind?: TransferDestinationKind | null;
          transfer_destination_account_id?: string | null;
          transfer_destination_wealth_position_id?: string | null;
          income_wealth_position_id?: string | null;
          income_principal_amount?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string;
          import_id?: string | null;
          transaction_date?: string;
          description?: string;
          normalized_description?: string;
          amount?: number;
          currency?: Currency;
          transaction_type?: TransactionType;
          category_id?: string | null;
          is_recurring?: boolean;
          is_extraordinary?: boolean;
          excluded_from_spending?: boolean;
          categorization_status?: CategorizationStatus;
          categorization_rule_id?: string | null;
          notes?: string | null;
          fingerprint?: string;
          refunds_transaction_id?: string | null;
          transfer_destination_kind?: TransferDestinationKind | null;
          transfer_destination_account_id?: string | null;
          transfer_destination_wealth_position_id?: string | null;
          income_wealth_position_id?: string | null;
          income_principal_amount?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categorization_rules: {
        Row: CategorizationRule;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          match_type?: RuleMatchType;
          pattern: string;
          transaction_type?: TransactionType;
          category_id?: string | null;
          excluded_from_spending?: boolean;
          is_recurring?: boolean;
          is_extraordinary?: boolean;
          priority?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          match_type?: RuleMatchType;
          pattern?: string;
          transaction_type?: TransactionType;
          category_id?: string | null;
          excluded_from_spending?: boolean;
          is_recurring?: boolean;
          is_extraordinary?: boolean;
          priority?: number;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      imports: {
        Row: Import;
        Insert: {
          id?: string;
          user_id: string;
          filename: string;
          source_type?: string | null;
          account_id?: string | null;
          currency?: Currency | null;
          imported_at?: string;
          transaction_count?: number;
          status?: ImportStatus;
        };
        Update: {
          id?: string;
          user_id?: string;
          filename?: string;
          source_type?: string | null;
          account_id?: string | null;
          currency?: Currency | null;
          imported_at?: string;
          transaction_count?: number;
          status?: ImportStatus;
        };
        Relationships: [];
      };
      income_sources: {
        Row: IncomeSource;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type?: IncomeSourceType;
          expected_monthly_amount?: number;
          currency: Currency;
          active?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: IncomeSourceType;
          expected_monthly_amount?: number;
          currency?: Currency;
          active?: boolean;
        };
        Relationships: [];
      };
      wealth_positions: {
        Row: WealthPosition;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          kind?: WealthPositionKind;
          amount?: number;
          currency: Currency;
          account_id?: string | null;
          notes?: string | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          kind?: WealthPositionKind;
          amount?: number;
          currency?: Currency;
          account_id?: string | null;
          notes?: string | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      monthly_budgets: {
        Row: MonthlyBudget;
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          month: string;
          budget_amount: number;
          currency?: Currency;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          month?: string;
          budget_amount?: number;
          currency?: Currency;
        };
        Relationships: [];
      };
      annual_budgets: {
        Row: AnnualBudget;
        Insert: {
          id?: string;
          user_id: string;
          year: number;
          category_id: string;
          budget_amount: number;
          currency?: Currency;
        };
        Update: {
          id?: string;
          user_id?: string;
          year?: number;
          category_id?: string;
          budget_amount?: number;
          currency?: Currency;
        };
        Relationships: [];
      };
      commitments: {
        Row: Commitment;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          direction: CommitmentDirection;
          amount?: number | null;
          currency: Currency;
          amount_type?: CommitmentAmountType;
          recurrence_type?: CommitmentRecurrenceType;
          due_day?: number | null;
          due_month?: number | null;
          custom_months?: number[] | null;
          start_date?: string | null;
          end_date?: string | null;
          match_hint?: string | null;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Commitment>;
        Relationships: [];
      };
      commitment_occurrences: {
        Row: CommitmentOccurrence;
        Insert: {
          id?: string;
          user_id: string;
          commitment_id: string;
          year: number;
          month: number;
          expected_amount?: number | null;
          actual_amount?: number | null;
          status?: CommitmentOccurrenceStatus;
          manually_completed_at?: string | null;
          reconciled_transaction_id?: string | null;
          reconciled_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<CommitmentOccurrence>;
        Relationships: [];
      };
      user_settings: {
        Row: UserSettings;
        Insert: {
          id?: string;
          user_id: string;
          base_currency?: Currency;
          savings_target_percent?: number;
          uyu_to_usd_rate?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          base_currency?: Currency;
          savings_target_percent?: number;
          uyu_to_usd_rate?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      exchange_rates: {
        Row: {
          id: string;
          user_id: string;
          from_currency: Currency;
          to_currency: Currency;
          rate: number;
          effective_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          from_currency: Currency;
          to_currency: Currency;
          rate: number;
          effective_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          from_currency?: Currency;
          to_currency?: Currency;
          rate?: number;
          effective_date?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
