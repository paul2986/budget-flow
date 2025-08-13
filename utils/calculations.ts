
import { Person, Expense, Frequency, CreditCardPayoffResult, CreditCardPaymentRow } from '../types/budget';

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

export const roundTo = (val: number, digits: number): number => {
  const factor = Math.pow(10, digits);
  return Math.round(val * factor) / factor;
};

/**
 * Compute the interest-only minimum payment suggestion.
 * Monthly rate i = APR / 12 / 100
 * Minimum = round(balance * i, fractionDigits)
 */
export const computeInterestOnlyMinimum = (
  balance: number,
  aprPercent: number,
  fractionDigits: number = 2
): number => {
  const B = Math.max(0, balance);
  const i = Math.max(0, aprPercent) / 12 / 100;
  return roundTo(B * i, fractionDigits);
};

/**
 * Compute credit card payoff metrics.
 * i = APR / 12 / 100
 * If P <= i * B -> never repaid
 * months n = ceil( ln(P / (P - i*B)) / ln(1+i) )
 * total interest = (n * P) - B
 * For i=0, n = ceil(B / P), interest=0
 */
export const computeCreditCardPayoff = (balance: number, aprPercent: number, monthlyPayment: number): CreditCardPayoffResult => {
  const B = Math.max(0, balance);
  const P = Math.max(0, monthlyPayment);
  const i = Math.max(0, aprPercent) / 12 / 100;

  if (B === 0 || P === 0) {
    return {
      neverRepaid: true,
      months: 0,
      totalInterest: 0,
      schedule: [],
      inputs: { balance: B, apr: Math.max(0, aprPercent), monthlyPayment: P },
      monthlyRate: i,
    };
  }

  if (i === 0) {
    const n = Math.ceil(B / P);
    const totalInterest = Math.max(0, n * P - B);
    const schedule: CreditCardPaymentRow[] = [];
    let bal = B;
    for (let m = 1; m <= 3 && bal > 0; m++) {
      const interest = 0;
      const principal = Math.min(P, bal);
      bal = Math.max(0, bal - principal);
      schedule.push({
        month: m,
        payment: principal + interest,
        interest,
        principal,
        remaining: bal,
      });
    }
    return {
      neverRepaid: false,
      months: n,
      totalInterest,
      schedule,
      inputs: { balance: B, apr: Math.max(0, aprPercent), monthlyPayment: P },
      monthlyRate: i,
    };
  }

  // Never repaid if payment doesn't exceed monthly interest
  if (P <= i * B) {
    return {
      neverRepaid: true,
      months: 0,
      totalInterest: 0,
      schedule: [],
      inputs: { balance: B, apr: Math.max(0, aprPercent), monthlyPayment: P },
      monthlyRate: i,
    };
  }

  // n = ceil( ln(P / (P - i*B)) / ln(1+i) )
  const numerator = Math.log(P / (P - i * B));
  const denominator = Math.log(1 + i);
  const nRaw = numerator / denominator;
  const n = Math.max(1, Math.ceil(nRaw));
  const totalInterest = Math.max(0, n * P - B);

  // First 3 months schedule
  const schedule: CreditCardPaymentRow[] = [];
  let bal = B;
  for (let m = 1; m <= 3 && bal > 0; m++) {
    const interest = bal * i;
    const principal = Math.max(0, P - interest);
    bal = Math.max(0, bal - principal);
    schedule.push({
      month: m,
      payment: Math.min(P, principal + interest),
      interest,
      principal: Math.min(principal, principal + interest), // guard
      remaining: bal,
    });
  }

  return {
    neverRepaid: false,
    months: n,
    totalInterest,
    schedule,
    inputs: { balance: B, apr: Math.max(0, aprPercent), monthlyPayment: P },
    monthlyRate: i,
  };
};
