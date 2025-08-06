
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

// Validate and sanitize budget data
const validateBudgetData = (data: any): BudgetData => {
  console.log('storage: Validating budget data...');
  
  // Ensure we have a valid object
  if (!data || typeof data !== 'object') {
    console.log('storage: Invalid data object, using defaults');
    return { ...defaultData };
  }
  
  // Validate and sanitize people array
  const people = Array.isArray(data.people) ? data.people.filter((person: any) => {
    if (!person || typeof person !== 'object' || !person.id || !person.name) {
      console.warn('storage: Invalid person object found, filtering out:', person);
      return false;
    }
    
    // Ensure income is an array
    if (!Array.isArray(person.income)) {
      person.income = [];
    }
    
    // Validate income items
    person.income = person.income.filter((income: any) => {
      if (!income || typeof income !== 'object' || !income.id || typeof income.amount !== 'number') {
        console.warn('storage: Invalid income object found, filtering out:', income);
        return false;
      }
      return true;
    });
    
    return true;
  }) : [];
  
  // Validate and sanitize expenses array
  const expenses = Array.isArray(data.expenses) ? data.expenses.filter((expense: any) => {
    if (!expense || typeof expense !== 'object' || !expense.id || typeof expense.amount !== 'number') {
      console.warn('storage: Invalid expense object found, filtering out:', expense);
      return false;
    }
    return true;
  }) : [];
  
  // Validate household settings
  const householdSettings = data.householdSettings && typeof data.householdSettings === 'object' 
    ? {
        distributionMethod: ['even', 'income-based'].includes(data.householdSettings.distributionMethod) 
          ? data.householdSettings.distributionMethod 
          : 'even'
      }
    : { distributionMethod: 'even' as const };
  
  const validatedData = {
    people,
    expenses,
    householdSettings
  };
  
  console.log('storage: Data validation complete:', {
    peopleCount: validatedData.people.length,
    expensesCount: validatedData.expenses.length,
    distributionMethod: validatedData.householdSettings.distributionMethod,
    expenseIds: validatedData.expenses.map(e => e.id)
  });
  
  return validatedData;
};

export const loadBudgetData = async (): Promise<BudgetData> => {
  try {
    console.log('storage: Loading budget data from AsyncStorage...');
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BUDGET_DATA);
    
    if (data) {
      try {
        const parsedData = JSON.parse(data);
        const validatedData = validateBudgetData(parsedData);
        
        console.log('storage: Successfully loaded and validated budget data:', {
          peopleCount: validatedData.people?.length || 0,
          expensesCount: validatedData.expenses?.length || 0,
          distributionMethod: validatedData.householdSettings?.distributionMethod,
          expenseIds: validatedData.expenses?.map(e => e.id) || []
        });
        
        return validatedData;
      } catch (parseError) {
        console.error('storage: Error parsing stored data:', parseError);
        console.log('storage: Returning default data due to parse error');
        return { ...defaultData };
      }
    }
    
    console.log('storage: No existing data found, returning default data');
    return { ...defaultData };
  } catch (error) {
    console.error('storage: Error loading budget data:', error);
    console.log('storage: Returning default data due to error');
    return { ...defaultData };
  }
};

// Add a mutex-like mechanism to prevent concurrent saves
let saveInProgress = false;
let pendingSaveData: BudgetData | null = null;

export const saveBudgetData = async (data: BudgetData): Promise<{ success: boolean; error?: Error }> => {
  try {
    console.log('storage: Save request received:', {
      peopleCount: data.people?.length || 0,
      expensesCount: data.expenses?.length || 0,
      distributionMethod: data.householdSettings?.distributionMethod,
      expenseIds: data.expenses?.map(e => e.id) || [],
      saveInProgress
    });
    
    // If a save is already in progress, queue this data
    if (saveInProgress) {
      console.log('storage: Save already in progress, queuing data...');
      pendingSaveData = data;
      
      // Wait for the current save to complete
      while (saveInProgress) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // If we have pending data and no save is in progress, save it
      if (pendingSaveData && !saveInProgress) {
        const dataToSave = pendingSaveData;
        pendingSaveData = null;
        return await saveBudgetData(dataToSave);
      }
      
      return { success: true };
    }
    
    saveInProgress = true;
    
    // Validate data before saving
    const validatedData = validateBudgetData(data);
    
    // Double-check that we're not losing data during validation
    if (data.people?.length && validatedData.people.length !== data.people.length) {
      console.warn('storage: People count mismatch after validation!', {
        original: data.people.length,
        validated: validatedData.people.length
      });
    }
    
    if (data.expenses?.length && validatedData.expenses.length !== data.expenses.length) {
      console.warn('storage: Expenses count mismatch after validation!', {
        original: data.expenses.length,
        validated: validatedData.expenses.length,
        originalIds: data.expenses.map(e => e.id),
        validatedIds: validatedData.expenses.map(e => e.id)
      });
    }
    
    console.log('storage: About to save validated data:', {
      peopleCount: validatedData.people?.length || 0,
      expensesCount: validatedData.expenses?.length || 0,
      expenseIds: validatedData.expenses?.map(e => e.id) || []
    });
    
    const jsonData = JSON.stringify(validatedData);
    await AsyncStorage.setItem(STORAGE_KEYS.BUDGET_DATA, jsonData);
    
    console.log('storage: Budget data saved successfully');
    
    // Verify the save by reading it back
    const verification = await AsyncStorage.getItem(STORAGE_KEYS.BUDGET_DATA);
    if (verification) {
      try {
        const verifiedData = JSON.parse(verification);
        const revalidatedData = validateBudgetData(verifiedData);
        
        console.log('storage: Save verification successful:', {
          peopleCount: revalidatedData.people?.length || 0,
          expensesCount: revalidatedData.expenses?.length || 0,
          expenseIds: revalidatedData.expenses?.map(e => e.id) || []
        });
        
        // Double check that the data matches what we tried to save
        if (revalidatedData.people?.length === validatedData.people?.length && 
            revalidatedData.expenses?.length === validatedData.expenses?.length) {
          
          // Also verify that the expense IDs match
          const originalExpenseIds = validatedData.expenses?.map(e => e.id).sort() || [];
          const verifiedExpenseIds = revalidatedData.expenses?.map(e => e.id).sort() || [];
          const expenseIdsMatch = originalExpenseIds.length === verifiedExpenseIds.length && 
                                  originalExpenseIds.every((id, index) => id === verifiedExpenseIds[index]);
          
          if (expenseIdsMatch) {
            return { success: true };
          } else {
            console.error('storage: Save verification failed - expense IDs mismatch', {
              expected: originalExpenseIds,
              actual: verifiedExpenseIds
            });
            return { success: false, error: new Error('Save verification failed - expense IDs mismatch') };
          }
        } else {
          console.error('storage: Save verification failed - data count mismatch', {
            expected: { people: validatedData.people?.length, expenses: validatedData.expenses?.length },
            actual: { people: revalidatedData.people?.length, expenses: revalidatedData.expenses?.length }
          });
          return { success: false, error: new Error('Save verification failed - data count mismatch') };
        }
      } catch (parseError) {
        console.error('storage: Save verification failed - parse error:', parseError);
        return { success: false, error: new Error('Save verification failed - parse error') };
      }
    } else {
      console.error('storage: Save verification failed - no data found after save');
      return { success: false, error: new Error('Save verification failed - no data found') };
    }
  } catch (error) {
    console.error('storage: Error saving budget data:', error);
    return { success: false, error: error as Error };
  } finally {
    saveInProgress = false;
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

// Utility function to clear all data (for debugging)
export const clearAllData = async (): Promise<void> => {
  try {
    console.log('storage: Clearing all budget data...');
    await AsyncStorage.removeItem(STORAGE_KEYS.BUDGET_DATA);
    console.log('storage: All budget data cleared successfully');
  } catch (error) {
    console.error('storage: Error clearing budget data:', error);
    throw error;
  }
};

// Utility function to get storage info (for debugging)
export const getStorageInfo = async (): Promise<{ hasData: boolean; dataSize: number }> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BUDGET_DATA);
    return {
      hasData: !!data,
      dataSize: data ? data.length : 0
    };
  } catch (error) {
    console.error('storage: Error getting storage info:', error);
    return { hasData: false, dataSize: 0 };
  }
};

// Utility function to backup and restore data (for debugging)
export const backupData = async (): Promise<string | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BUDGET_DATA);
    console.log('storage: Data backup created');
    return data;
  } catch (error) {
    console.error('storage: Error creating backup:', error);
    return null;
  }
};

export const restoreData = async (backupData: string): Promise<{ success: boolean; error?: Error }> => {
  try {
    // Validate the backup data first
    const parsedData = JSON.parse(backupData);
    const validatedData = validateBudgetData(parsedData);
    
    const result = await saveBudgetData(validatedData);
    console.log('storage: Data restored from backup');
    return result;
  } catch (error) {
    console.error('storage: Error restoring backup:', error);
    return { success: false, error: error as Error };
  }
};
