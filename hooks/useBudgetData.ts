
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
      console.log('useBudgetData: Loaded data:', budgetData);
      setData(budgetData);
    } catch (error) {
      console.error('useBudgetData: Error loading budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (newData: BudgetData) => {
    try {
      console.log('useBudgetData: Saving data:', newData);
      await saveBudgetData(newData);
      setData(newData);
      console.log('useBudgetData: Data saved successfully');
    } catch (error) {
      console.error('useBudgetData: Error saving budget data:', error);
      throw error;
    }
  };

  const addPerson = async (person: Person) => {
    console.log('useBudgetData: Adding person:', person);
    const newData = { ...data, people: [...data.people, person] };
    await saveData(newData);
  };

  const removePerson = async (personId: string) => {
    console.log('useBudgetData: Removing person:', personId);
    const newData = {
      ...data,
      people: data.people.filter(p => p.id !== personId),
      expenses: data.expenses.filter(e => e.personId !== personId),
    };
    await saveData(newData);
  };

  const updatePerson = async (updatedPerson: Person) => {
    console.log('useBudgetData: Updating person:', updatedPerson);
    const newData = {
      ...data,
      people: data.people.map(p => p.id === updatedPerson.id ? updatedPerson : p),
    };
    await saveData(newData);
  };

  const addIncome = async (personId: string, income: Income) => {
    console.log('useBudgetData: Adding income to person:', personId, income);
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
    console.log('useBudgetData: Removing income from person:', personId, incomeId);
    
    // Find the person first to verify they exist
    const person = data.people.find(p => p.id === personId);
    if (!person) {
      console.error('useBudgetData: Person not found:', personId);
      throw new Error('Person not found');
    }
    
    // Check if the income exists
    const incomeExists = person.income.find(i => i.id === incomeId);
    if (!incomeExists) {
      console.error('useBudgetData: Income not found:', incomeId);
      throw new Error('Income not found');
    }
    
    const newData = {
      ...data,
      people: data.people.map(p => 
        p.id === personId 
          ? { ...p, income: p.income.filter(i => i.id !== incomeId) }
          : p
      ),
    };
    
    console.log('useBudgetData: New data after removing income:', newData);
    await saveData(newData);
  };

  const addExpense = async (expense: Expense) => {
    console.log('useBudgetData: Adding expense:', expense);
    const newData = { ...data, expenses: [...data.expenses, expense] };
    await saveData(newData);
  };

  const removeExpense = async (expenseId: string) => {
    console.log('useBudgetData: Removing expense:', expenseId);
    const newData = {
      ...data,
      expenses: data.expenses.filter(e => e.id !== expenseId),
    };
    await saveData(newData);
  };

  const updateExpense = async (updatedExpense: Expense) => {
    console.log('useBudgetData: Updating expense:', updatedExpense);
    const newData = {
      ...data,
      expenses: data.expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e),
    };
    await saveData(newData);
  };

  const updateHouseholdSettings = async (settings: HouseholdSettings) => {
    console.log('useBudgetData: Updating household settings:', settings);
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
