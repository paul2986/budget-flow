
import { useState, useEffect, useCallback, useRef } from 'react';
import { loadBudgetData, saveBudgetData } from '../utils/storage';
import { BudgetData, Person, Expense, Income, HouseholdSettings } from '../types/budget';

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
  const lastSavedDataRef = useRef<string>('');
  const pendingUpdatesRef = useRef<boolean>(false);
  const currentDataRef = useRef<BudgetData>({
    people: [],
    expenses: [],
    householdSettings: { distributionMethod: 'even' },
  });

  // Keep currentDataRef in sync with data state
  useEffect(() => {
    currentDataRef.current = data;
  }, [data]);

  const loadData = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('useBudgetData: Load already in progress, skipping...');
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      console.log('useBudgetData: Loading data...');
      const budgetData = await loadBudgetData();
      console.log('useBudgetData: Loaded data:', {
        peopleCount: budgetData.people?.length || 0,
        expensesCount: budgetData.expenses?.length || 0,
        distributionMethod: budgetData.householdSettings?.distributionMethod
      });
      
      // Store the loaded data as a string for comparison
      const dataString = JSON.stringify(budgetData);
      lastSavedDataRef.current = dataString;
      currentDataRef.current = budgetData;
      
      setData(budgetData);
      pendingUpdatesRef.current = false;
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
      console.log('useBudgetData: Saving data:', {
        peopleCount: newData.people?.length || 0,
        expensesCount: newData.expenses?.length || 0,
        distributionMethod: newData.householdSettings?.distributionMethod
      });
      setSaving(true);
      pendingUpdatesRef.current = true;
      
      // Validate data integrity before saving
      if (!newData.people) newData.people = [];
      if (!newData.expenses) newData.expenses = [];
      if (!newData.householdSettings) newData.householdSettings = { distributionMethod: 'even' };
      
      // Save to storage first
      const saveResult = await saveBudgetData(newData);
      console.log('useBudgetData: Save result:', saveResult);
      
      if (saveResult.success) {
        // Store the saved data as a string for comparison
        const dataString = JSON.stringify(newData);
        lastSavedDataRef.current = dataString;
        currentDataRef.current = newData;
        
        // Immediately update the UI state
        setData(newData);
        pendingUpdatesRef.current = false;
        console.log('useBudgetData: UI state updated successfully');
        
        return { success: true };
      } else {
        console.error('useBudgetData: Save failed:', saveResult.error);
        pendingUpdatesRef.current = false;
        return { success: false, error: saveResult.error };
      }
    } catch (error) {
      console.error('useBudgetData: Error saving budget data:', error);
      pendingUpdatesRef.current = false;
      return { success: false, error: error as Error };
    } finally {
      setSaving(false);
    }
  }, []);

  const addPerson = useCallback(async (person: Person) => {
    console.log('useBudgetData: Adding person:', person);
    try {
      // Use currentDataRef to get the most up-to-date data
      const currentData = currentDataRef.current;
      const newData = { 
        ...currentData, 
        people: [...currentData.people, person],
        expenses: [...currentData.expenses], // Preserve existing expenses
        householdSettings: { ...currentData.householdSettings } // Preserve settings
      };
      const result = await saveData(newData);
      console.log('useBudgetData: Person added successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error adding person:', error);
      return { success: false, error: error as Error };
    }
  }, [saveData]);

  const removePerson = useCallback(async (personId: string) => {
    console.log('useBudgetData: Removing person:', personId);
    try {
      // Use currentDataRef to get the most up-to-date data
      const currentData = currentDataRef.current;
      
      // Verify person exists before attempting removal
      const personExists = currentData.people.find(p => p.id === personId);
      if (!personExists) {
        console.error('useBudgetData: Person not found:', personId);
        return { success: false, error: new Error('Person not found') };
      }

      const newData = {
        ...currentData,
        people: currentData.people.filter(p => p.id !== personId),
        expenses: currentData.expenses.filter(e => e.personId !== personId),
        householdSettings: { ...currentData.householdSettings } // Preserve settings
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
  }, [saveData]);

  const updatePerson = useCallback(async (updatedPerson: Person) => {
    console.log('useBudgetData: Updating person:', updatedPerson);
    try {
      // Use currentDataRef to get the most up-to-date data
      const currentData = currentDataRef.current;
      const newData = {
        ...currentData,
        people: currentData.people.map(p => p.id === updatedPerson.id ? updatedPerson : p),
        expenses: [...currentData.expenses], // Preserve existing expenses
        householdSettings: { ...currentData.householdSettings } // Preserve settings
      };
      const result = await saveData(newData);
      console.log('useBudgetData: Person updated successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error updating person:', error);
      return { success: false, error: error as Error };
    }
  }, [saveData]);

  const addIncome = useCallback(async (personId: string, income: Income) => {
    console.log('useBudgetData: Adding income to person:', personId, income);
    try {
      // Use currentDataRef to get the most up-to-date data
      const currentData = currentDataRef.current;
      
      // Find the person first to verify they exist
      const person = currentData.people.find(p => p.id === personId);
      if (!person) {
        console.error('useBudgetData: Person not found:', personId);
        return { success: false, error: new Error('Person not found') };
      }
      
      const newData = {
        ...currentData,
        people: currentData.people.map(p => 
          p.id === personId 
            ? { ...p, income: [...p.income, income] }
            : p
        ),
        expenses: [...currentData.expenses], // Preserve existing expenses
        householdSettings: { ...currentData.householdSettings } // Preserve settings
      };
      
      console.log('useBudgetData: New data after adding income:', {
        peopleCount: newData.people.length,
        expensesCount: newData.expenses.length,
        incomeCount: newData.people.find(p => p.id === personId)?.income.length || 0
      });
      const result = await saveData(newData);
      console.log('useBudgetData: Income added successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error adding income:', error);
      return { success: false, error: error as Error };
    }
  }, [saveData]);

  const removeIncome = useCallback(async (personId: string, incomeId: string) => {
    console.log('useBudgetData: Removing income from person:', personId, incomeId);
    
    try {
      // Use currentDataRef to get the most up-to-date data
      const currentData = currentDataRef.current;
      
      // Find the person first to verify they exist
      const person = currentData.people.find(p => p.id === personId);
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
        ...currentData,
        people: currentData.people.map(p => 
          p.id === personId 
            ? { ...p, income: p.income.filter(i => i.id !== incomeId) }
            : p
        ),
        expenses: [...currentData.expenses], // Preserve existing expenses
        householdSettings: { ...currentData.householdSettings } // Preserve settings
      };
      
      console.log('useBudgetData: New data after removing income:', {
        personId,
        incomeId,
        peopleCount: newData.people.length,
        expensesCount: newData.expenses.length,
        remainingIncomeCount: newData.people.find(p => p.id === personId)?.income.length || 0
      });
      
      const result = await saveData(newData);
      console.log('useBudgetData: Income removed successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error removing income:', error);
      return { success: false, error: error as Error };
    }
  }, [saveData]);

  const updateIncome = useCallback(async (personId: string, incomeId: string, updates: Partial<Income>) => {
    console.log('useBudgetData: Updating income:', personId, incomeId, updates);
    
    try {
      // Use currentDataRef to get the most up-to-date data
      const currentData = currentDataRef.current;
      
      // Find the person first to verify they exist
      const person = currentData.people.find(p => p.id === personId);
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
      
      // Create the updated data with the income changes
      const newData = {
        ...currentData,
        people: currentData.people.map(p => 
          p.id === personId 
            ? { 
                ...p, 
                income: p.income.map(i => 
                  i.id === incomeId 
                    ? { ...i, ...updates }
                    : i
                )
              }
            : p
        ),
        expenses: [...currentData.expenses], // Preserve existing expenses
        householdSettings: { ...currentData.householdSettings } // Preserve settings
      };
      
      console.log('useBudgetData: New data after updating income:', {
        personId,
        incomeId,
        updates,
        peopleCount: newData.people.length,
        expensesCount: newData.expenses.length,
        updatedIncome: newData.people.find(p => p.id === personId)?.income.find(i => i.id === incomeId)
      });
      
      const result = await saveData(newData);
      console.log('useBudgetData: Income updated successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error updating income:', error);
      return { success: false, error: error as Error };
    }
  }, [saveData]);

  const addExpense = useCallback(async (expense: Expense) => {
    console.log('useBudgetData: Adding expense:', expense);
    try {
      // Use currentDataRef to get the most up-to-date data
      const currentData = currentDataRef.current;
      
      // Generate a proper ID if not provided
      const expenseWithId = {
        ...expense,
        id: expense.id || `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      console.log('useBudgetData: Expense with ID:', expenseWithId);
      
      const newData = { 
        ...currentData, 
        expenses: [...currentData.expenses, expenseWithId],
        people: [...currentData.people], // Preserve existing people
        householdSettings: { ...currentData.householdSettings } // Preserve settings
      };
      
      console.log('useBudgetData: New data after adding expense:', {
        peopleCount: newData.people.length,
        expensesCount: newData.expenses.length
      });
      
      const result = await saveData(newData);
      console.log('useBudgetData: Expense added successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error adding expense:', error);
      return { success: false, error: error as Error };
    }
  }, [saveData]);

  const removeExpense = useCallback(async (expenseId: string) => {
    console.log('useBudgetData: Removing expense:', expenseId);
    try {
      // Use currentDataRef to get the most up-to-date data
      const currentData = currentDataRef.current;
      
      // Verify expense exists before attempting removal
      const expenseExists = currentData.expenses.find(e => e.id === expenseId);
      if (!expenseExists) {
        console.error('useBudgetData: Expense not found:', expenseId);
        return { success: false, error: new Error('Expense not found') };
      }

      const newData = {
        ...currentData,
        expenses: currentData.expenses.filter(e => e.id !== expenseId),
        people: [...currentData.people], // Preserve existing people
        householdSettings: { ...currentData.householdSettings } // Preserve settings
      };
      
      console.log('useBudgetData: New data after removing expense:', {
        expenseId,
        peopleCount: newData.people.length,
        remainingExpensesCount: newData.expenses.length
      });
      
      const result = await saveData(newData);
      console.log('useBudgetData: Expense removed successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error removing expense:', error);
      return { success: false, error: error as Error };
    }
  }, [saveData]);

  const updateExpense = useCallback(async (updatedExpense: Expense) => {
    console.log('useBudgetData: Updating expense:', updatedExpense);
    try {
      // Use currentDataRef to get the most up-to-date data
      const currentData = currentDataRef.current;
      const newData = {
        ...currentData,
        expenses: currentData.expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e),
        people: [...currentData.people], // Preserve existing people
        householdSettings: { ...currentData.householdSettings } // Preserve settings
      };
      
      console.log('useBudgetData: New data after updating expense:', {
        peopleCount: newData.people.length,
        expensesCount: newData.expenses.length
      });
      
      const result = await saveData(newData);
      console.log('useBudgetData: Expense updated successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error updating expense:', error);
      return { success: false, error: error as Error };
    }
  }, [saveData]);

  const updateHouseholdSettings = useCallback(async (settings: Partial<HouseholdSettings>) => {
    console.log('useBudgetData: Updating household settings:', settings);
    try {
      // Use currentDataRef to get the most up-to-date data
      const currentData = currentDataRef.current;
      
      // Merge with existing household settings instead of replacing
      const newHouseholdSettings = {
        ...currentData.householdSettings,
        ...settings
      };
      
      // Create new data preserving ALL existing data, only updating household settings
      const newData = { 
        people: [...currentData.people], // Preserve existing people with their income
        expenses: [...currentData.expenses], // Preserve existing expenses
        householdSettings: newHouseholdSettings
      };
      
      console.log('useBudgetData: New data with updated household settings:', {
        oldSettings: currentData.householdSettings,
        newSettings: newHouseholdSettings,
        peopleCount: newData.people.length,
        expensesCount: newData.expenses.length,
        totalIncomeCount: newData.people.reduce((total, person) => total + person.income.length, 0)
      });
      
      const result = await saveData(newData);
      console.log('useBudgetData: Household settings updated successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error updating household settings:', error);
      return { success: false, error: error as Error };
    }
  }, [saveData]);

  // Improved refresh function that is more conservative about when to refresh
  const refreshData = useCallback(() => {
    console.log('useBudgetData: Refresh requested...', {
      pendingUpdates: pendingUpdatesRef.current,
      saving,
      loading,
      isLoading: isLoadingRef.current
    });
    
    // Don't refresh if we have pending updates, are currently saving, or already loading
    if (pendingUpdatesRef.current || saving || isLoadingRef.current) {
      console.log('useBudgetData: Skipping refresh - operation in progress');
      return;
    }
    
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Only refresh if we're not in the middle of any operations
    if (!loading) {
      console.log('useBudgetData: Executing immediate refresh...');
      loadData();
    } else {
      console.log('useBudgetData: Skipping refresh - already loading');
    }
  }, [loadData, saving, loading]);

  return {
    data,
    loading,
    saving,
    addPerson,
    removePerson,
    updatePerson,
    addIncome,
    removeIncome,
    updateIncome,
    addExpense,
    removeExpense,
    updateExpense,
    updateHouseholdSettings,
    refreshData,
  };
};
