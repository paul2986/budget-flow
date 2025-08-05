
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BudgetData, Person, Expense, HouseholdSettings } from '../types/budget';

const STORAGE_KEYS = {
  BUDGET_DATA: 'budget_data',
};

const defaultData: BudgetData = {
  people: [],
  expenses: [],
  householdSettings: {
    distributionMethod: 'even',
  },
};

export const loadBudgetData = async (): Promise<BudgetData> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BUDGET_DATA);
    if (data) {
      return JSON.parse(data);
    }
    return defaultData;
  } catch (error) {
    console.error('Error loading budget data:', error);
    return defaultData;
  }
};

export const saveBudgetData = async (data: BudgetData): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.BUDGET_DATA, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving budget data:', error);
  }
};

export const addPerson = async (person: Person): Promise<void> => {
  const data = await loadBudgetData();
  data.people.push(person);
  await saveBudgetData(data);
};

export const removePerson = async (personId: string): Promise<void> => {
  const data = await loadBudgetData();
  data.people = data.people.filter(p => p.id !== personId);
  data.expenses = data.expenses.filter(e => e.personId !== personId);
  await saveBudgetData(data);
};

export const addExpense = async (expense: Expense): Promise<void> => {
  const data = await loadBudgetData();
  data.expenses.push(expense);
  await saveBudgetData(data);
};

export const removeExpense = async (expenseId: string): Promise<void> => {
  const data = await loadBudgetData();
  data.expenses = data.expenses.filter(e => e.id !== expenseId);
  await saveBudgetData(data);
};

export const updateHouseholdSettings = async (settings: HouseholdSettings): Promise<void> => {
  const data = await loadBudgetData();
  data.householdSettings = settings;
  await saveBudgetData(data);
};
