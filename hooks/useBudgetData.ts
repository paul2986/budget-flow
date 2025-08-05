
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('useBudgetData: Loading data...');
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
      setSaving(true);
      
      // Optimistically update the UI first
      setData(newData);
      
      // Then save to storage
      await saveBudgetData(newData);
      console.log('useBudgetData: Data saved successfully');
      
      return { success: true };
    } catch (error) {
      console.error('useBudgetData: Error saving budget data:', error);
      
      // Revert the optimistic update on error
      await loadData();
      
      return { success: false, error: error as Error };
    } finally {
      setSaving(false);
    }
  };

  const addPerson = async (person: Person) => {
    console.log('useBudgetData: Adding person:', person);
    try {
      const newData = { ...data, people: [...data.people, person] };
      const result = await saveData(newData);
      console.log('useBudgetData: Person added successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error adding person:', error);
      throw error;
    }
  };

  const removePerson = async (personId: string) => {
    console.log('useBudgetData: Removing person:', personId);
    try {
      const newData = {
        ...data,
        people: data.people.filter(p => p.id !== personId),
        expenses: data.expenses.filter(e => e.personId !== personId),
      };
      const result = await saveData(newData);
      console.log('useBudgetData: Person removed successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error removing person:', error);
      throw error;
    }
  };

  const updatePerson = async (updatedPerson: Person) => {
    console.log('useBudgetData: Updating person:', updatedPerson);
    try {
      const newData = {
        ...data,
        people: data.people.map(p => p.id === updatedPerson.id ? updatedPerson : p),
      };
      const result = await saveData(newData);
      console.log('useBudgetData: Person updated successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error updating person:', error);
      throw error;
    }
  };

  const addIncome = async (personId: string, income: Income) => {
    console.log('useBudgetData: Adding income to person:', personId, income);
    try {
      // Find the person first to verify they exist
      const person = data.people.find(p => p.id === personId);
      if (!person) {
        console.error('useBudgetData: Person not found:', personId);
        throw new Error('Person not found');
      }
      
      const newData = {
        ...data,
        people: data.people.map(p => 
          p.id === personId 
            ? { ...p, income: [...p.income, income] }
            : p
        ),
      };
      
      console.log('useBudgetData: New data after adding income:', newData);
      const result = await saveData(newData);
      console.log('useBudgetData: Income added successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error adding income:', error);
      throw error;
    }
  };

  const removeIncome = async (personId: string, incomeId: string) => {
    console.log('useBudgetData: Removing income from person:', personId, incomeId);
    
    try {
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
      const result = await saveData(newData);
      console.log('useBudgetData: Income removed successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error removing income:', error);
      throw error;
    }
  };

  const addExpense = async (expense: Expense) => {
    console.log('useBudgetData: Adding expense:', expense);
    try {
      const newData = { ...data, expenses: [...data.expenses, expense] };
      const result = await saveData(newData);
      console.log('useBudgetData: Expense added successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error adding expense:', error);
      throw error;
    }
  };

  const removeExpense = async (expenseId: string) => {
    console.log('useBudgetData: Removing expense:', expenseId);
    try {
      const newData = {
        ...data,
        expenses: data.expenses.filter(e => e.id !== expenseId),
      };
      const result = await saveData(newData);
      console.log('useBudgetData: Expense removed successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error removing expense:', error);
      throw error;
    }
  };

  const updateExpense = async (updatedExpense: Expense) => {
    console.log('useBudgetData: Updating expense:', updatedExpense);
    try {
      const newData = {
        ...data,
        expenses: data.expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e),
      };
      const result = await saveData(newData);
      console.log('useBudgetData: Expense updated successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error updating expense:', error);
      throw error;
    }
  };

  const updateHouseholdSettings = async (settings: HouseholdSettings) => {
    console.log('useBudgetData: Updating household settings:', settings);
    try {
      const newData = { ...data, householdSettings: settings };
      const result = await saveData(newData);
      console.log('useBudgetData: Household settings updated successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error updating household settings:', error);
      throw error;
    }
  };

  return {
    data,
    loading,
    saving,
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
