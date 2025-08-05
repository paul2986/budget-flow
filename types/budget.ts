
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

export interface BudgetData {
  people: Person[];
  expenses: Expense[];
  householdSettings: HouseholdSettings;
}
