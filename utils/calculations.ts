
import { Person, Expense, Frequency } from '../types/budget';

const toYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const todayYMD = (): string => toYMD(new Date());

// Active if:
// - One-time: always included (treated as active on totals)
// - Recurring: no endDate or endDate >= asOf
export const isExpenseActive = (expense: Expense, asOfDate?: string): boolean => {
  const asOf = asOfDate || todayYMD();
  if (expense.frequency === 'one-time') return true;
  const end = (expense.endDate || '').slice(0, 10);
  if (!end) return true;
  return end >= asOf;
};

// Returns recurring expenses with an endDate that is either already ended OR
// will end within the next N days. Sorted by endDate ascending.
export const getEndingSoon = (expenses: Expense[], days: number = 30): Expense[] => {
  const now = new Date();
  const startYMD = toYMD(now);
  const limit = new Date(now);
  limit.setDate(limit.getDate() + days);
  const limitYMD = toYMD(limit);

  const list = expenses
    .filter((e) => e.frequency !== 'one-time' && typeof e.endDate === 'string' && e.endDate)
    .filter((e) => {
      const end = (e.endDate as string).slice(0, 10);
      // Include if already ended OR ending within next N days
      return end < startYMD || (end >= startYMD && end <= limitYMD);
    })
    .sort((a, b) => {
      const ea = (a.endDate as string).slice(0, 10);
      const eb = (b.endDate as string).slice(0, 10);
      return ea.localeCompare(eb);
    });

  const byId = new Map<string, Expense>();
  list.forEach((e) => byId.set(e.id, e));
  return Array.from(byId.values());
};

export const calculateAnnualAmount = (amount: number, frequency: Frequency): number => {
  switch (frequency) {
    case 'daily':
      return amount * 365;
    case 'weekly':
      return amount * 52;
    case 'monthly':
      return amount * 12;
    case 'yearly':
      return amount;
    case 'one-time':
      return amount;
    default:
      return amount;
  }
};

export const calculateMonthlyAmount = (amount: number, frequency: Frequency): number => {
  return calculateAnnualAmount(amount, frequency) / 12;
};

export const calculateTotalIncome = (people: Person[]): number => {
  return people.reduce((total, person) => {
    const personIncome = person.income.reduce((sum, income) => {
      return sum + calculateAnnualAmount(income.amount, income.frequency);
    }, 0);
    return total + personIncome;
  }, 0);
};

export const calculatePersonIncome = (person: Person): number => {
  return person.income.reduce((sum, income) => {
    return sum + calculateAnnualAmount(income.amount, income.frequency);
  }, 0);
};

export const calculateTotalExpenses = (expenses: Expense[]): number => {
  const asOf = todayYMD();
  return expenses.reduce((total, expense) => {
    if (!isExpenseActive(expense, asOf)) return total;
    return total + calculateAnnualAmount(expense.amount, expense.frequency);
  }, 0);
};

export const calculateHouseholdExpenses = (expenses: Expense[]): number => {
  const asOf = todayYMD();
  return expenses
    .filter((expense) => expense.category === 'household')
    .filter((expense) => isExpenseActive(expense, asOf))
    .reduce((total, expense) => {
      return total + calculateAnnualAmount(expense.amount, expense.frequency);
    }, 0);
};

export const calculatePersonalExpenses = (expenses: Expense[], personId?: string): number => {
  const asOf = todayYMD();
  return expenses
    .filter((expense) => expense.category === 'personal' && (!personId || expense.personId === personId))
    .filter((expense) => isExpenseActive(expense, asOf))
    .reduce((total, expense) => {
      return total + calculateAnnualAmount(expense.amount, expense.frequency);
    }, 0);
};

export const calculateHouseholdShare = (
  householdExpenses: number,
  people: Person[],
  distributionMethod: 'even' | 'income-based',
  personId: string
): number => {
  if (people.length === 0) return 0;

  if (distributionMethod === 'even') {
    return householdExpenses / people.length;
  } else {
    const totalIncome = calculateTotalIncome(people);
    if (totalIncome === 0) return householdExpenses / people.length;

    const person = people.find((p) => p.id === personId);
    if (!person) return 0;

    const personIncome = calculatePersonIncome(person);
    return (personIncome / totalIncome) * householdExpenses;
  }
};
