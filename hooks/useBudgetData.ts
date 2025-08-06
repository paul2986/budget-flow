
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('useBudgetData: Load already in progress, skipping...');
      return;
    }

    try {
      isLoadingRef.current = true;
      console.log('useBudgetData: Loading data...');
      const budgetData = await loadBudgetData();
      console.log('useBudgetData: Loaded data:', budgetData);
      setData(budgetData);
    } catch (error) {
      console.error('useBudgetData: Error loading budget data:', error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => {
      // Cleanup timeout on unmount
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [loadData]);

  const saveData = useCallback(async (newData: BudgetData) => {
    try {
      console.log('useBudgetData: Saving data:', newData);
      setSaving(true);
      
      // Save to storage first
      const saveResult = await saveBudgetData(newData);
      console.log('useBudgetData: Save result:', saveResult);
      
      if (saveResult.success) {
        // Immediately update the UI state
        setData(newData);
        console.log('useBudgetData: UI state updated successfully');
        
        return { success: true };
      } else {
        console.error('useBudgetData: Save failed:', saveResult.error);
        return { success: false, error: saveResult.error };
      }
    } catch (error) {
      console.error('useBudgetData: Error saving budget data:', error);
      return { success: false, error: error as Error };
    } finally {
      setSaving(false);
    }
  }, []);

  const addPerson = useCallback(async (person: Person) => {
    console.log('useBudgetData: Adding person:', person);
    try {
      const newData = { ...data, people: [...data.people, person] };
      const result = await saveData(newData);
      console.log('useBudgetData: Person added successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error adding person:', error);
      return { success: false, error: error as Error };
    }
  }, [data, saveData]);

  const removePerson = useCallback(async (personId: string) => {
    console.log('useBudgetData: Removing person:', personId);
    try {
      // Verify person exists before attempting removal
      const personExists = data.people.find(p => p.id === personId);
      if (!personExists) {
        console.error('useBudgetData: Person not found:', personId);
        return { success: false, error: new Error('Person not found') };
      }

      const newData = {
        ...data,
        people: data.people.filter(p => p.id !== personId),
        expenses: data.expenses.filter(e => e.personId !== personId),
      };
      
      console.log('useBudgetData: New data after removing person:', {
        peopleCount: newData.people.length,
        expensesCount: newData.expenses.length
      });
      
      const result = await saveData(newData);
      console.log('useBudgetData: Person removed successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error removing person:', error);
      return { success: false, error: error as Error };
    }
  }, [data, saveData]);

  const updatePerson = useCallback(async (updatedPerson: Person) => {
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
      return { success: false, error: error as Error };
    }
  }, [data, saveData]);

  const addIncome = useCallback(async (personId: string, income: Income) => {
    console.log('useBudgetData: Adding income to person:', personId, income);
    try {
      // Find the person first to verify they exist
      const person = data.people.find(p => p.id === personId);
      if (!person) {
        console.error('useBudgetData: Person not found:', personId);
        return { success: false, error: new Error('Person not found') };
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
      return { success: false, error: error as Error };
    }
  }, [data, saveData]);

  const removeIncome = useCallback(async (personId: string, incomeId: string) => {
    console.log('useBudgetData: Removing income from person:', personId, incomeId);
    
    try {
      // Find the person first to verify they exist
      const person = data.people.find(p => p.id === personId);
      if (!person) {
        console.error('useBudgetData: Person not found:', personId);
        return { success: false, error: new Error('Person not found') };
      }
      
      // Check if the income exists
      const incomeExists = person.income.find(i => i.id === incomeId);
      if (!incomeExists) {
        console.error('useBudgetData: Income not found:', incomeId);
        return { success: false, error: new Error('Income not found') };
      }
      
      const newData = {
        ...data,
        people: data.people.map(p => 
          p.id === personId 
            ? { ...p, income: p.income.filter(i => i.id !== incomeId) }
            : p
        ),
      };
      
      console.log('useBudgetData: New data after removing income:', {
        personId,
        incomeId,
        remainingIncomeCount: newData.people.find(p => p.id === personId)?.income.length || 0
      });
      
      const result = await saveData(newData);
      console.log('useBudgetData: Income removed successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error removing income:', error);
      return { success: false, error: error as Error };
    }
  }, [data, saveData]);

  const addExpense = useCallback(async (expense: Expense) => {
    console.log('useBudgetData: Adding expense:', expense);
    try {
      // Generate a proper ID if not provided
      const expenseWithId = {
        ...expense,
        id: expense.id || `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      console.log('useBudgetData: Expense with ID:', expenseWithId);
      
      const newData = { ...data, expenses: [...data.expenses, expenseWithId] };
      const result = await saveData(newData);
      console.log('useBudgetData: Expense added successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error adding expense:', error);
      return { success: false, error: error as Error };
    }
  }, [data, saveData]);

  const removeExpense = useCallback(async (expenseId: string) => {
    console.log('useBudgetData: Removing expense:', expenseId);
    try {
      // Verify expense exists before attempting removal
      const expenseExists = data.expenses.find(e => e.id === expenseId);
      if (!expenseExists) {
        console.error('useBudgetData: Expense not found:', expenseId);
        return { success: false, error: new Error('Expense not found') };
      }

      const newData = {
        ...data,
        expenses: data.expenses.filter(e => e.id !== expenseId),
      };
      
      console.log('useBudgetData: New data after removing expense:', {
        expenseId,
        remainingExpensesCount: newData.expenses.length
      });
      
      const result = await saveData(newData);
      console.log('useBudgetData: Expense removed successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error removing expense:', error);
      return { success: false, error: error as Error };
    }
  }, [data, saveData]);

  const updateExpense = useCallback(async (updatedExpense: Expense) => {
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
      return { success: false, error: error as Error };
    }
  }, [data, saveData]);

  const updateHouseholdSettings = useCallback(async (settings: Partial<HouseholdSettings>) => {
    console.log('useBudgetData: Updating household settings:', settings);
    try {
      // Merge with existing household settings instead of replacing
      const newHouseholdSettings = {
        ...data.householdSettings,
        ...settings
      };
      
      const newData = { 
        ...data, 
        householdSettings: newHouseholdSettings 
      };
      
      console.log('useBudgetData: New data with updated household settings:', {
        oldSettings: data.householdSettings,
        newSettings: newHouseholdSettings,
        peopleCount: newData.people.length,
        expensesCount: newData.expenses.length
      });
      
      const result = await saveData(newData);
      console.log('useBudgetData: Household settings updated successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error updating household settings:', error);
      return { success: false, error: error as Error };
    }
  }, [data, saveData]);

  // Throttled refresh function that components can call
  const refreshData = useCallback(() => {
    console.log('useBudgetData: Refresh requested...');
    
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Throttle refresh calls to prevent excessive loading
    refreshTimeoutRef.current = setTimeout(async () => {
      if (!isLoadingRef.current && !saving) {
        console.log('useBudgetData: Executing throttled refresh...');
        await loadData();
      } else {
        console.log('useBudgetData: Skipping refresh - operation in progress');
      }
    }, 100);
  }, [loadData, saving]);

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
    refreshData,
  };
};
