
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BudgetData, Person, Expense, HouseholdSettings, AppDataV2, Budget } from '../types/budget';

const STORAGE_KEYS = {
  // Legacy single-budget key (v1)
  BUDGET_DATA: 'budget_data',
  // New multi-budget app data key (v2)
  APP_DATA_V2: 'app_data_v2',
};

// Mutex-like protection for legacy save operations
let saveInProgress = false;
const saveQueue: BudgetData[] = [];

// Mutex-like protection for v2 app saves
let appSaveInProgress = false;
const appSaveQueue: AppDataV2[] = [];

const defaultData: BudgetData = {
  people: [],
  expenses: [],
  householdSettings: {
    distributionMethod: 'even',
  },
};

// Create an empty budget entity
const createEmptyBudget = (name: string): Budget => ({
  id: `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  name,
  people: [],
  expenses: [],
  householdSettings: { distributionMethod: 'even' },
  createdAt: Date.now(),
});

// Validate and sanitize budget data (v1 budget shape)
const validateBudgetData = (data: any): BudgetData => {
  console.log('storage: Validating budget data...');
  
  if (!data || typeof data !== 'object') {
    console.log('storage: Invalid data object, using defaults');
    return JSON.parse(JSON.stringify(defaultData));
  }
  
  const people = Array.isArray(data.people) ? data.people.filter((person: any) => {
    if (!person || typeof person !== 'object' || !person.id || !person.name) {
      console.warn('storage: Invalid person object found, filtering out:', person);
      return false;
    }
    if (!Array.isArray(person.income)) {
      person.income = [];
    }
    person.income = person.income.filter((income: any) => {
      if (!income || typeof income !== 'object' || !income.id || typeof income.amount !== 'number') {
        console.warn('storage: Invalid income object found, filtering out:', income);
        return false;
      }
      return true;
    });
    return true;
  }) : [];
  
  const expenses = Array.isArray(data.expenses) ? data.expenses.filter((expense: any) => {
    if (!expense || typeof expense !== 'object') return false;
    if (!expense.id) return false;
    if (typeof expense.amount !== 'number' || isNaN(expense.amount)) return false;
    if (!expense.description || typeof expense.description !== 'string') return false;
    if (!expense.category || !['household', 'personal'].includes(expense.category)) return false;
    if (!expense.frequency || !['daily', 'weekly', 'monthly', 'yearly'].includes(expense.frequency)) return false;
    if (!expense.date) return false;
    return true;
  }) : [];
  
  const householdSettings = data.householdSettings && typeof data.householdSettings === 'object' 
    ? { distributionMethod: ['even', 'income-based'].includes(data.householdSettings.distributionMethod) ? data.householdSettings.distributionMethod : 'even' }
    : { distributionMethod: 'even' as const };
  
  const validatedData: BudgetData = { people, expenses, householdSettings };
  console.log('storage: Data validation complete:', {
    originalPeopleCount: Array.isArray(data.people) ? data.people.length : 0,
    validatedPeopleCount: validatedData.people.length,
    originalExpensesCount: Array.isArray(data.expenses) ? data.expenses.length : 0,
    validatedExpensesCount: validatedData.expenses.length,
  });
  return validatedData;
};

// Validate AppDataV2
const validateAppData = (data: any): AppDataV2 => {
  console.log('storage: Validating AppDataV2...');
  if (!data || typeof data !== 'object') {
    const initialBudget = createEmptyBudget('My Budget');
    return { version: 2, budgets: [initialBudget], activeBudgetId: initialBudget.id };
  }
  const budgets: Budget[] = Array.isArray(data.budgets) ? data.budgets.map((b: any) => ({
    id: typeof b?.id === 'string' ? b.id : `budget_${Math.random().toString(36).slice(2)}`,
    name: typeof b?.name === 'string' ? b.name : 'My Budget',
    people: validateBudgetData(b).people,
    expenses: validateBudgetData(b).expenses,
    householdSettings: validateBudgetData(b).householdSettings,
    createdAt: typeof b?.createdAt === 'number' ? b.createdAt : Date.now(),
  })) : [createEmptyBudget('My Budget')];
  let activeBudgetId = typeof data.activeBudgetId === 'string' ? data.activeBudgetId : budgets[0].id;
  if (!budgets.find(b => b.id === activeBudgetId)) activeBudgetId = budgets[0].id;
  return { version: 2 as const, budgets, activeBudgetId };
};

// Migration-aware loader
export const loadAppData = async (): Promise<AppDataV2> => {
  try {
    console.log('storage: Loading AppDataV2...');
    const v2Raw = await AsyncStorage.getItem(STORAGE_KEYS.APP_DATA_V2);
    if (v2Raw) {
      const parsed = JSON.parse(v2Raw);
      const validated = validateAppData(parsed);
      return validated;
    }
    // Attempt to read legacy v1
    const legacyRaw = await AsyncStorage.getItem(STORAGE_KEYS.BUDGET_DATA);
    if (legacyRaw) {
      console.log('storage: Legacy data found. Migrating to v2...');
      let legacyParsed: any;
      try {
        legacyParsed = JSON.parse(legacyRaw);
      } catch (e) {
        console.error('storage: Failed to parse legacy data, using defaults', e);
        legacyParsed = defaultData;
      }
      const validatedLegacy = validateBudgetData(legacyParsed);
      const migratedBudget: Budget = {
        id: `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: 'My Budget',
        people: validatedLegacy.people,
        expenses: validatedLegacy.expenses,
        householdSettings: validatedLegacy.householdSettings,
        createdAt: Date.now(),
      };
      const appData: AppDataV2 = { version: 2, budgets: [migratedBudget], activeBudgetId: migratedBudget.id };
      await saveAppData(appData);
      console.log('storage: Migration complete. Saved AppDataV2.');
      return appData;
    }
    // No data at all, create default
    const initialBudget = createEmptyBudget('My Budget');
    const appData: AppDataV2 = { version: 2, budgets: [initialBudget], activeBudgetId: initialBudget.id };
    await saveAppData(appData);
    return appData;
  } catch (error) {
    console.error('storage: Error loading AppDataV2:', error);
    const initialBudget = createEmptyBudget('My Budget');
    const appData: AppDataV2 = { version: 2, budgets: [initialBudget], activeBudgetId: initialBudget.id };
    return appData;
  }
};

// Save AppDataV2 with queue
const processAppSaveQueue = async (): Promise<void> => {
  if (appSaveInProgress || appSaveQueue.length === 0) return;
  appSaveInProgress = true;
  try {
    const latest = appSaveQueue[appSaveQueue.length - 1];
    appSaveQueue.length = 0;
    await performAppSave(latest);
  } catch (e) {
    console.error('storage: Error processing app save queue', e);
    throw e;
  } finally {
    appSaveInProgress = false;
    if (appSaveQueue.length > 0) setImmediate(() => processAppSaveQueue());
  }
};

const performAppSave = async (data: AppDataV2): Promise<void> => {
  const validated = validateAppData(data);
  const copy = JSON.parse(JSON.stringify(validated));
  const json = JSON.stringify(copy);
  await AsyncStorage.setItem(STORAGE_KEYS.APP_DATA_V2, json);
  // Verify
  const verification = await AsyncStorage.getItem(STORAGE_KEYS.APP_DATA_V2);
  if (!verification) throw new Error('Save verification failed - no data found');
  const verified = validateAppData(JSON.parse(verification));
  if (!verified.budgets.length) throw new Error('Save verification failed - empty budgets');
};

export const saveAppData = async (data: AppDataV2): Promise<{ success: boolean; error?: Error }> => {
  try {
    appSaveQueue.push(data);
    await processAppSaveQueue();
    return { success: true };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

export const getActiveBudget = (appData: AppDataV2): Budget => {
  const active = appData.budgets.find(b => b.id === appData.activeBudgetId);
  return active || appData.budgets[0];
};

export const setActiveBudget = async (budgetId: string): Promise<{ success: boolean; error?: Error }> => {
  const appData = await loadAppData();
  if (!appData.budgets.find(b => b.id === budgetId)) {
    return { success: false, error: new Error('Budget not found') };
  }
  const newAppData: AppDataV2 = { ...appData, activeBudgetId: budgetId };
  return await saveAppData(newAppData);
};

export const addBudget = async (name: string): Promise<{ success: boolean; error?: Error; budget?: Budget }> => {
  const appData = await loadAppData();
  const newBudget = createEmptyBudget(name || 'New Budget');
  const newAppData: AppDataV2 = { ...appData, budgets: [...appData.budgets, newBudget], activeBudgetId: newBudget.id };
  const res = await saveAppData(newAppData);
  return { ...res, budget: newBudget };
};

export const renameBudget = async (budgetId: string, newName: string): Promise<{ success: boolean; error?: Error }> => {
  const appData = await loadAppData();
  const idx = appData.budgets.findIndex(b => b.id === budgetId);
  if (idx === -1) return { success: false, error: new Error('Budget not found') };
  const budgets = [...appData.budgets];
  budgets[idx] = { ...budgets[idx], name: newName || budgets[idx].name };
  return await saveAppData({ ...appData, budgets });
};

export const deleteBudget = async (budgetId: string): Promise<{ success: boolean; error?: Error }> => {
  const appData = await loadAppData();
  if (appData.budgets.length <= 1) return { success: false, error: new Error('Cannot delete the last budget') };
  const budgets = appData.budgets.filter(b => b.id !== budgetId);
  let activeBudgetId = appData.activeBudgetId;
  if (activeBudgetId === budgetId) {
    activeBudgetId = budgets[0].id;
  }
  return await saveAppData({ ...appData, budgets, activeBudgetId });
};

export const updateBudget = async (budget: Budget): Promise<{ success: boolean; error?: Error }> => {
  const appData = await loadAppData();
  const idx = appData.budgets.findIndex(b => b.id === budget.id);
  if (idx === -1) return { success: false, error: new Error('Budget not found') };
  const budgets = [...appData.budgets];
  budgets[idx] = { ...budget };
  return await saveAppData({ ...appData, budgets });
};

// Legacy v1 load/save shims mapped to activeBudget in AppDataV2
export const loadBudgetData = async (): Promise<BudgetData> => {
  const appData = await loadAppData();
  const active = getActiveBudget(appData);
  return { people: active.people, expenses: active.expenses, householdSettings: active.householdSettings };
};

const performSave = async (data: BudgetData): Promise<void> => {
  // Save into active budget of v2
  const appData = await loadAppData();
  const active = getActiveBudget(appData);
  const validated = validateBudgetData(data);
  const updatedActive: Budget = { ...active, ...validated };
  const budgets = appData.budgets.map(b => b.id === active.id ? updatedActive : b);
  await performAppSave({ ...appData, budgets });
};

// Enhanced save function with mutex-like protection (shim)
export const saveBudgetData = async (data: BudgetData): Promise<{ success: boolean; error?: Error }> => {
  try {
    saveQueue.push(data);
    await processSaveQueue();
    return { success: true };
  } catch (error) {
    console.error('storage: Error saving budget data (shim):', error);
    return { success: false, error: error as Error };
  }
};

// Process the legacy save queue -> writes into v2 active budget
const processSaveQueue = async (): Promise<void> => {
  if (saveInProgress || saveQueue.length === 0) return;
  saveInProgress = true;
  try {
    const latest = saveQueue[saveQueue.length - 1];
    saveQueue.length = 0;
    await performSave(latest);
  } catch (e) {
    console.error('storage: Error processing legacy save queue', e);
    throw e;
  } finally {
    saveInProgress = false;
    if (saveQueue.length > 0) setImmediate(() => processSaveQueue());
  }
};

// Utility to clear only ACTIVE budget contents
export const clearActiveBudgetData = async (): Promise<void> => {
  const appData = await loadAppData();
  const active = getActiveBudget(appData);
  const cleared: Budget = { ...active, people: [], expenses: [], householdSettings: { distributionMethod: 'even' } };
  const budgets = appData.budgets.map(b => b.id === active.id ? cleared : b);
  await performAppSave({ ...appData, budgets });
};

// Utility function to get storage info (for debugging)
export const getStorageInfo = async (): Promise<{ hasData: boolean; dataSize: number; version: 'v2' | 'v1' | 'none' }> => {
  try {
    const v2 = await AsyncStorage.getItem(STORAGE_KEYS.APP_DATA_V2);
    if (v2) return { hasData: true, dataSize: v2.length, version: 'v2' };
    const v1 = await AsyncStorage.getItem(STORAGE_KEYS.BUDGET_DATA);
    if (v1) return { hasData: true, dataSize: v1.length, version: 'v1' };
    return { hasData: false, dataSize: 0, version: 'none' };
  } catch (error) {
    console.error('storage: Error getting storage info:', error);
    return { hasData: false, dataSize: 0, version: 'none' };
  }
};

// Backup/restore that supports v2 and wraps v1
export const backupData = async (): Promise<string | null> => {
  try {
    const appData = await loadAppData();
    const json = JSON.stringify(appData);
    console.log('storage: AppDataV2 backup created');
    return json;
  } catch (error) {
    console.error('storage: Error creating backup:', error);
    return null;
  }
};

export const restoreData = async (backup: string): Promise<{ success: boolean; error?: Error }> => {
  try {
    const parsed = JSON.parse(backup);
    if (parsed && parsed.version === 2 && Array.isArray(parsed.budgets)) {
      const validated = validateAppData(parsed);
      return await saveAppData(validated);
    }
    // Assume legacy shape and wrap
    const validatedLegacy = validateBudgetData(parsed);
    const migratedBudget: Budget = {
      id: `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'My Budget',
      people: validatedLegacy.people,
      expenses: validatedLegacy.expenses,
      householdSettings: validatedLegacy.householdSettings,
      createdAt: Date.now(),
    };
    const appData: AppDataV2 = { version: 2, budgets: [migratedBudget], activeBudgetId: migratedBudget.id };
    return await saveAppData(appData);
  } catch (error) {
    console.error('storage: Error restoring backup:', error);
    return { success: false, error: error as Error };
  }
};
