
import { Person, Expense, Frequency } from '../types/budget';

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
  return expenses.reduce((total, expense) => {
    return total + calculateAnnualAmount(expense.amount, expense.frequency);
  }, 0);
};

export const calculateHouseholdExpenses = (expenses: Expense[]): number => {
  return expenses
    .filter(expense => expense.category === 'household')
    .reduce((total, expense) => {
      return total + calculateAnnualAmount(expense.amount, expense.frequency);
    }, 0);
};

export const calculatePersonalExpenses = (expenses: Expense[], personId?: string): number => {
  return expenses
    .filter(expense => expense.category === 'personal' && (!personId || expense.personId === personId))
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
    
    const person = people.find(p => p.id === personId);
    if (!person) return 0;
    
    const personIncome = calculatePersonIncome(person);
    return (personIncome / totalIncome) * householdExpenses;
  }
};
