
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
    console.log('storage: Loading budget data from AsyncStorage...');
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BUDGET_DATA);
    
    if (data) {
      const parsedData = JSON.parse(data);
      console.log('storage: Successfully loaded budget data:', {
        peopleCount: parsedData.people?.length || 0,
        expensesCount: parsedData.expenses?.length || 0,
        distributionMethod: parsedData.householdSettings?.distributionMethod
      });
      return parsedData;
    }
    
    console.log('storage: No existing data found, returning default data');
    return defaultData;
  } catch (error) {
    console.error('storage: Error loading budget data:', error);
    console.log('storage: Returning default data due to error');
    return defaultData;
  }
};

export const saveBudgetData = async (data: BudgetData): Promise<{ success: boolean; error?: Error }> => {
  try {
    console.log('storage: Saving budget data to AsyncStorage:', {
      peopleCount: data.people?.length || 0,
      expensesCount: data.expenses?.length || 0,
      distributionMethod: data.householdSettings?.distributionMethod
    });
    
    const jsonData = JSON.stringify(data);
    await AsyncStorage.setItem(STORAGE_KEYS.BUDGET_DATA, jsonData);
    
    console.log('storage: Budget data saved successfully');
    
    // Verify the save by reading it back
    const verification = await AsyncStorage.getItem(STORAGE_KEYS.BUDGET_DATA);
    if (verification) {
      const verifiedData = JSON.parse(verification);
      console.log('storage: Save verification successful:', {
        peopleCount: verifiedData.people?.length || 0,
        expensesCount: verifiedData.expenses?.length || 0
      });
      
      // Double check that the data matches what we tried to save
      if (verifiedData.people?.length === data.people?.length && 
          verifiedData.expenses?.length === data.expenses?.length) {
        return { success: true };
      } else {
        console.error('storage: Save verification failed - data mismatch');
        return { success: false, error: new Error('Save verification failed - data mismatch') };
      }
    } else {
      console.error('storage: Save verification failed - no data found after save');
      return { success: false, error: new Error('Save verification failed - no data found') };
    }
  } catch (error) {
    console.error('storage: Error saving budget data:', error);
    return { success: false, error: error as Error };
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
