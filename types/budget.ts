
export interface Person {
  id: string;
  name: string;
  income: Income[];
}

export interface Income {
  id: string;
  amount: number;
  label: string;
  frequency: Frequency;
  personId: string;
}

export type ExpenseCategory =
  | 'Food'
  | 'Housing'
  | 'Transportation'
  | 'Entertainment'
  | 'Utilities'
  | 'Healthcare'
  | 'Clothing'
  | 'Misc';

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: 'household' | 'personal';
  frequency: Frequency;
  personId?: string; // Only for personal expenses
  date: string;
  notes?: string; // Optional notes for additional context
  categoryTag?: ExpenseCategory; // Optional category tag for filtering/reporting
}

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'one-time';

export interface HouseholdSettings {
  distributionMethod: 'even' | 'income-based';
}

// New multi-budget entities (v2)
export interface Budget {
  id: string;
  name: string;
  people: Person[];
  expenses: Expense[];
  householdSettings: HouseholdSettings;
  createdAt: number; // epoch millis
}

export interface AppDataV2 {
  version: 2;
  budgets: Budget[];
  activeBudgetId: string;
}
