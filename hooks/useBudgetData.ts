
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
  
  // Use a ref to store the most current data state to prevent stale closures
  const currentDataRef = useRef<BudgetData>(data);
  const isLoadingRef = useRef(false);
  const saveQueueRef = useRef<BudgetData | null>(null);
  const saveInProgressRef = useRef(false);

  // Update the ref whenever data changes
  useEffect(() => {
    currentDataRef.current = data;
    console.log('useBudgetData: Data ref updated:', {
      peopleCount: data.people.length,
      expensesCount: data.expenses.length,
      expenseIds: data.expenses.map(e => e.id)
    });
  }, [data]);

  // Function to get the most current data
  const getCurrentData = useCallback((): BudgetData => {
    return currentDataRef.current;
  }, []);

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
        expenseIds: budgetData.expenses?.map(e => e.id) || [],
        distributionMethod: budgetData.householdSettings?.distributionMethod
      });
      
      setData(budgetData);
      currentDataRef.current = budgetData;
    } catch (error) {
      console.error('useBudgetData: Error loading budget data:', error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Centralized save function with queuing to prevent race conditions
  const saveData = useCallback(async (newData: BudgetData): Promise<{ success: boolean; error?: Error }> => {
    try {
      console.log('useBudgetData: Save request received:', {
        peopleCount: newData.people?.length || 0,
        expensesCount: newData.expenses?.length || 0,
        expenseIds: newData.expenses?.map(e => e.id) || [],
        distributionMethod: newData.householdSettings?.distributionMethod,
        saveInProgress: saveInProgressRef.current
      });

      // If a save is already in progress, queue this data
      if (saveInProgressRef.current) {
        console.log('useBudgetData: Save in progress, queuing data...');
        saveQueueRef.current = newData;
        
        // Wait for current save to complete
        while (saveInProgressRef.current) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // If we have queued data, save it
        if (saveQueueRef.current) {
          const queuedData = saveQueueRef.current;
          saveQueueRef.current = null;
          return await saveData(queuedData);
        }
        
        return { success: true };
      }

      saveInProgressRef.current = true;
      setSaving(true);
      
      // Validate data integrity before saving
      const validatedData = {
        people: Array.isArray(newData.people) ? newData.people : [],
        expenses: Array.isArray(newData.expenses) ? newData.expenses : [],
        householdSettings: newData.householdSettings || { distributionMethod: 'even' }
      };
      
      console.log('useBudgetData: Saving validated data:', {
        peopleCount: validatedData.people.length,
        expensesCount: validatedData.expenses.length,
        expenseIds: validatedData.expenses.map(e => e.id)
      });
      
      const result = await saveBudgetData(validatedData);
      
      if (result.success) {
        // Update both state and ref immediately after successful save
        setData(validatedData);
        currentDataRef.current = validatedData;
        console.log('useBudgetData: Data saved and state updated successfully');
        return { success: true };
      } else {
        console.error('useBudgetData: Save failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('useBudgetData: Error saving budget data:', error);
      return { success: false, error: error as Error };
    } finally {
      setSaving(false);
      saveInProgressRef.current = false;
    }
  }, []);

  // Helper function to create deep copy of data
  const createDataCopy = useCallback((sourceData: BudgetData): BudgetData => {
    return {
      people: sourceData.people.map(person => ({
        ...person,
        income: [...person.income]
      })),
      expenses: [...sourceData.expenses],
      householdSettings: { ...sourceData.householdSettings }
    };
  }, []);

  const addPerson = useCallback(async (person: Person) => {
    console.log('useBudgetData: Adding person:', person);
    try {
      const currentData = getCurrentData();
      const newData = createDataCopy(currentData);
      newData.people.push(person);
      
      const result = await saveData(newData);
      console.log('useBudgetData: Person added successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error adding person:', error);
      return { success: false, error: error as Error };
    }
  }, [saveData, getCurrentData, createDataCopy]);

  const removePerson = useCallback(async (personId: string) => {
    console.log('useBudgetData: Removing person:', personId);
    try {
      const currentData = getCurrentData();
      
      // Verify person exists before attempting removal
      const personExists = currentData.people.find(p => p.id === personId);
      if (!personExists) {
        console.error('useBudgetData: Person not found:', personId);
        return { success: false, error: new Error('Person not found') };
      }

      const newData = createDataCopy(currentData);
      newData.people = newData.people.filter(p => p.id !== personId);
      newData.expenses = newData.expenses.filter(e => e.personId !== personId);
      
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
  }, [saveData, getCurrentData, createDataCopy]);

  const updatePerson = useCallback(async (updatedPerson: Person) => {
    console.log('useBudgetData: Updating person:', updatedPerson);
    try {
      const currentData = getCurrentData();
      const newData = createDataCopy(currentData);
      newData.people = newData.people.map(p => p.id === updatedPerson.id ? updatedPerson : p);
      
      const result = await saveData(newData);
      console.log('useBudgetData: Person updated successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error updating person:', error);
      return { success: false, error: error as Error };
    }
  }, [saveData, getCurrentData, createDataCopy]);

  const addIncome = useCallback(async (personId: string, income: Income) => {
    console.log('useBudgetData: Adding income to person:', personId, income);
    try {
      const currentData = getCurrentData();
      
      // Find the person first to verify they exist
      const person = currentData.people.find(p => p.id === personId);
      if (!person) {
        console.error('useBudgetData: Person not found:', personId);
        return { success: false, error: new Error('Person not found') };
      }
      
      const newData = createDataCopy(currentData);
      const personIndex = newData.people.findIndex(p => p.id === personId);
      if (personIndex !== -1) {
        newData.people[personIndex].income.push(income);
      }
      
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
  }, [saveData, getCurrentData, createDataCopy]);

  const removeIncome = useCallback(async (personId: string, incomeId: string) => {
    console.log('useBudgetData: Removing income from person:', personId, incomeId);
    
    try {
      const currentData = getCurrentData();
      
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
      
      const newData = createDataCopy(currentData);
      const personIndex = newData.people.findIndex(p => p.id === personId);
      if (personIndex !== -1) {
        newData.people[personIndex].income = newData.people[personIndex].income.filter(i => i.id !== incomeId);
      }
      
      console.log('useBudgetData: New data after removing income:', {
        personId,
        incomeId,
        peopleCount: newData.people.length,
        expensesCount: newData.expenses.length,
        expenseIds: newData.expenses.map(e => e.id),
        remainingIncomeCount: newData.people.find(p => p.id === personId)?.income.length || 0
      });
      
      const result = await saveData(newData);
      console.log('useBudgetData: Income removed successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error removing income:', error);
      return { success: false, error: error as Error };
    }
  }, [saveData, getCurrentData, createDataCopy]);

  const updateIncome = useCallback(async (personId: string, incomeId: string, updates: Partial<Income>) => {
    console.log('useBudgetData: Updating income:', personId, incomeId, updates);
    
    try {
      const currentData = getCurrentData();
      
      console.log('useBudgetData: Current data for income update:', {
        peopleCount: currentData.people.length,
        expensesCount: currentData.expenses.length,
        expenseIds: currentData.expenses.map(e => e.id)
      });
      
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
      
      // Create a deep copy of the current data
      const newData = createDataCopy(currentData);
      
      // Update the specific income
      const personIndex = newData.people.findIndex(p => p.id === personId);
      if (personIndex !== -1) {
        const incomeIndex = newData.people[personIndex].income.findIndex(i => i.id === incomeId);
        if (incomeIndex !== -1) {
          newData.people[personIndex].income[incomeIndex] = {
            ...newData.people[personIndex].income[incomeIndex],
            ...updates
          };
        }
      }
      
      console.log('useBudgetData: New data after updating income:', {
        personId,
        incomeId,
        updates,
        peopleCount: newData.people.length,
        expensesCount: newData.expenses.length,
        expenseIds: newData.expenses.map(e => e.id),
        updatedIncome: newData.people.find(p => p.id === personId)?.income.find(i => i.id === incomeId)
      });
      
      const result = await saveData(newData);
      console.log('useBudgetData: Income updated successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error updating income:', error);
      return { success: false, error: error as Error };
    }
  }, [saveData, getCurrentData, createDataCopy]);

  const addExpense = useCallback(async (expense: Expense) => {
    console.log('useBudgetData: Adding expense:', expense);
    try {
      const currentData = getCurrentData();
      
      // Generate a proper ID if not provided
      const expenseWithId = {
        ...expense,
        id: expense.id || `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      console.log('useBudgetData: Expense with ID:', expenseWithId);
      
      const newData = createDataCopy(currentData);
      newData.expenses.push(expenseWithId);
      
      console.log('useBudgetData: New data after adding expense:', {
        peopleCount: newData.people.length,
        expensesCount: newData.expenses.length,
        expenseIds: newData.expenses.map(e => e.id)
      });
      
      const result = await saveData(newData);
      console.log('useBudgetData: Expense added successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error adding expense:', error);
      return { success: false, error: error as Error };
    }
  }, [saveData, getCurrentData, createDataCopy]);

  const removeExpense = useCallback(async (expenseId: string) => {
    console.log('useBudgetData: Removing expense:', expenseId);
    try {
      const currentData = getCurrentData();
      
      console.log('useBudgetData: Current data before expense removal:', {
        expensesCount: currentData.expenses.length,
        expenseIds: currentData.expenses.map(e => e.id),
        targetExpenseId: expenseId
      });
      
      // Verify expense exists before attempting removal
      const expenseExists = currentData.expenses.find(e => e.id === expenseId);
      if (!expenseExists) {
        console.error('useBudgetData: Expense not found:', expenseId);
        return { success: false, error: new Error('Expense not found') };
      }

      const newData = createDataCopy(currentData);
      newData.expenses = newData.expenses.filter(e => e.id !== expenseId);
      
      console.log('useBudgetData: New data after removing expense:', {
        expenseId,
        peopleCount: newData.people.length,
        remainingExpensesCount: newData.expenses.length,
        remainingExpenseIds: newData.expenses.map(e => e.id)
      });
      
      const result = await saveData(newData);
      console.log('useBudgetData: Expense removed successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error removing expense:', error);
      return { success: false, error: error as Error };
    }
  }, [saveData, getCurrentData, createDataCopy]);

  const updateExpense = useCallback(async (updatedExpense: Expense) => {
    console.log('useBudgetData: Updating expense:', updatedExpense);
    try {
      const currentData = getCurrentData();
      const newData = createDataCopy(currentData);
      newData.expenses = newData.expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e);
      
      console.log('useBudgetData: New data after updating expense:', {
        peopleCount: newData.people.length,
        expensesCount: newData.expenses.length,
        expenseIds: newData.expenses.map(e => e.id)
      });
      
      const result = await saveData(newData);
      console.log('useBudgetData: Expense updated successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error updating expense:', error);
      return { success: false, error: error as Error };
    }
  }, [saveData, getCurrentData, createDataCopy]);

  const updateHouseholdSettings = useCallback(async (settings: Partial<HouseholdSettings>) => {
    console.log('useBudgetData: Updating household settings:', settings);
    try {
      const currentData = getCurrentData();
      
      console.log('useBudgetData: Current data before household settings update:', {
        peopleCount: currentData.people.length,
        expensesCount: currentData.expenses.length,
        expenseIds: currentData.expenses.map(e => e.id),
        oldSettings: currentData.householdSettings
      });
      
      const newData = createDataCopy(currentData);
      newData.householdSettings = {
        ...newData.householdSettings,
        ...settings
      };
      
      console.log('useBudgetData: New data with updated household settings:', {
        oldSettings: currentData.householdSettings,
        newSettings: newData.householdSettings,
        peopleCount: newData.people.length,
        expensesCount: newData.expenses.length,
        expenseIds: newData.expenses.map(e => e.id),
        totalIncomeCount: newData.people.reduce((total, person) => total + person.income.length, 0)
      });
      
      const result = await saveData(newData);
      console.log('useBudgetData: Household settings updated successfully');
      return result;
    } catch (error) {
      console.error('useBudgetData: Error updating household settings:', error);
      return { success: false, error: error as Error };
    }
  }, [saveData, getCurrentData, createDataCopy]);

  // Simplified refresh function that only loads when necessary
  const refreshData = useCallback(() => {
    console.log('useBudgetData: Refresh requested...', {
      saving,
      loading,
      isLoading: isLoadingRef.current,
      saveInProgress: saveInProgressRef.current
    });
    
    // Don't refresh if we're currently saving, loading, or have a save in progress
    if (saving || isLoadingRef.current || saveInProgressRef.current) {
      console.log('useBudgetData: Skipping refresh - operation in progress');
      return;
    }
    
    console.log('useBudgetData: Executing refresh...');
    loadData();
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
    updateIncome,
    addExpense,
    removeExpense,
    updateExpense,
    updateHouseholdSettings,
    refreshData,
  };
};
