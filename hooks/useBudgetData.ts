
import { useState, useEffect } from 'react';
import { BudgetData, Person, Expense, Income, HouseholdSettings } from '../types/budget';
import { loadBudgetData, saveBudgetData } from '../utils/storage';

export const useBudgetData = () => {
  const [data, setData] = useState<BudgetData>({
    people: [],
    expenses: [],
    householdSettings: { distributionMethod: 'even' },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const budgetData = await loadBudgetData();
      setData(budgetData);
    } catch (error) {
      console.error('Error loading budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (newData: BudgetData) => {
    try {
      await saveBudgetData(newData);
      setData(newData);
    } catch (error) {
      console.error('Error saving budget data:', error);
    }
  };

  const addPerson = async (person: Person) => {
    const newData = { ...data, people: [...data.people, person] };
    await saveData(newData);
  };

  const removePerson = async (personId: string) => {
    const newData = {
      ...data,
      people: data.people.filter(p => p.id !== personId),
      expenses: data.expenses.filter(e => e.personId !== personId),
    };
    await saveData(newData);
  };

  const updatePerson = async (updatedPerson: Person) => {
    const newData = {
      ...data,
      people: data.people.map(p => p.id === updatedPerson.id ? updatedPerson : p),
    };
    await saveData(newData);
  };

  const addIncome = async (personId: string, income: Income) => {
    const newData = {
      ...data,
      people: data.people.map(p => 
        p.id === personId 
          ? { ...p, income: [...p.income, income] }
          : p
      ),
    };
    await saveData(newData);
  };

  const removeIncome = async (personId: string, incomeId: string) => {
    const newData = {
      ...data,
      people: data.people.map(p => 
        p.id === personId 
          ? { ...p, income: p.income.filter(i => i.id !== incomeId) }
          : p
      ),
    };
    await saveData(newData);
  };

  const addExpense = async (expense: Expense) => {
    const newData = { ...data, expenses: [...data.expenses, expense] };
    await saveData(newData);
  };

  const removeExpense = async (expenseId: string) => {
    const newData = {
      ...data,
      expenses: data.expenses.filter(e => e.id !== expenseId),
    };
    await saveData(newData);
  };

  const updateExpense = async (updatedExpense: Expense) => {
    const newData = {
      ...data,
      expenses: data.expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e),
    };
    await saveData(newData);
  };

  const updateHouseholdSettings = async (settings: HouseholdSettings) => {
    const newData = { ...data, householdSettings: settings };
    await saveData(newData);
  };

  return {
    data,
    loading,
    addPerson,
    removePerson,
    updatePerson,
    addIncome,
    removeIncome,
    addExpense,
    removeExpense,
    updateExpense,
    updateHouseholdSettings,
    refreshData: loadData,
  };
};
