
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

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: 'household' | 'personal';
  frequency: Frequency;
  personId?: string; // Only for personal expenses
  date: string;
}

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'one-time';

export interface HouseholdSettings {
  distributionMethod: 'even' | 'income-based';
}

// Legacy single-budget data shape (v1)
export interface BudgetData {
  people: Person[];
  expenses: Expense[];
  householdSettings: HouseholdSettings;
}

// New multi-budget entities (v2)
export interface Budget extends BudgetData {
  id: string;
  name: string;
  createdAt: number; // epoch millis
}

export interface AppDataV2 {
  version: 2;
  budgets: Budget[];
  activeBudgetId: string;
}
