
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppDataV2, Budget, Expense, ExpenseCategory, DEFAULT_CATEGORIES, BudgetLockSettings } from '../types/budget';

// Storage keys for versions
const STORAGE_KEYS = {
  // Legacy single-budget key (v1)
  BUDGET_DATA: 'budget_data',
  // New multi-budget app data key (v2)
  APP_DATA_V2: 'app_data_v2',
  // Filters and custom categories
  EXPENSES_FILTERS: 'expenses_filters_v1',
  CUSTOM_EXPENSE_CATEGORIES: 'custom_expense_categories_v1',
};

// Normalize and validate category names
export const normalizeCategoryName = (name: any): string => {
  if (typeof name !== 'string') return 'Misc';
  // Allow only letters, numbers and spaces
  let cleaned = name.replace(/[^A-Za-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Misc';
  // Title Case
  cleaned = cleaned
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
  // Enforce max length 20
  if (cleaned.length > 20) cleaned = cleaned.slice(0, 20).trim();
  return cleaned;
};

const sanitizeCategoryTag = (tag: any): ExpenseCategory => {
  const norm = normalizeCategoryName(tag);
  // If it's one of our defaults, keep as-is; otherwise persist custom as-is (normalized)
  return (DEFAULT_CATEGORIES.includes(norm) ? norm : norm) as ExpenseCategory;
};

const toYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const sanitizeEndDate = (frequency: string, endDate: any): string | undefined => {
  if (frequency === 'one-time') return undefined;
  if (typeof endDate !== 'string') return undefined;
  const v = endDate.slice(0, 10);
  // basic YYYY-MM-DD check
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  return v;
};

// Default lock settings
const getDefaultLockSettings = (): BudgetLockSettings => ({
  locked: false,
  autoLockMinutes: 0,
});

// v2 app data saving protection
let appSaveInProgress = false;
const appSaveQueue: AppDataV2[] = [];

export const getCustomExpenseCategories = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_EXPENSE_CATEGORIES);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    // Normalize and dedupe
    const set = new Set<string>();
    arr.forEach((n) => set.add(normalizeCategoryName(n)));
    return Array.from(set).filter((c) => !DEFAULT_CATEGORIES.includes(c));
  } catch (e) {
    console.error('storage: getCustomExpenseCategories error', e);
    return [];
  }
};

export const saveCustomExpenseCategories = async (categories: string[]): Promise<void> => {
  try {
    const cleaned = Array.from(
      new Set(categories.map((c) => normalizeCategoryName(c)).filter((c) => c && !DEFAULT_CATEGORIES.includes(c)))
    );
    await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_EXPENSE_CATEGORIES, JSON.stringify(cleaned));
  } catch (e) {
    console.error('storage: saveCustomExpenseCategories error', e);
  }
};

export type ExpensesFilters = {
  category: string | null; // null means All
  search: string;
};

export const getExpensesFilters = async (): Promise<ExpensesFilters> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES_FILTERS);
    if (!raw) return { category: null, search: '' };
    const parsed = JSON.parse(raw);
    const category = parsed && typeof parsed.category === 'string' ? normalizeCategoryName(parsed.category) : null;
    const search = parsed && typeof parsed.search === 'string' ? parsed.search : '';
    return { category, search };
  } catch (e) {
    console.error('storage: getExpensesFilters error', e);
    return { category: null, search: '' };
  }
};

export const saveExpensesFilters = async (filters: ExpensesFilters): Promise<void> => {
  try {
    const toSave: ExpensesFilters = {
      category: filters.category ? normalizeCategoryName(filters.category) : null,
      search: filters.search || '',
    };
    await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES_FILTERS, JSON.stringify(toSave));
  } catch (e) {
    console.error('storage: saveExpensesFilters error', e);
  }
};

// Create an empty budget entity
const createEmptyBudget = (name: string): Budget => {
  const now = Date.now();
  return {
    id: `budget_${now}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    people: [],
    expenses: [],
    householdSettings: { distributionMethod: 'even' },
    createdAt: now,
    modifiedAt: now,
    lock: getDefaultLockSettings(),
  };
};

// Validate/sanitize legacy single-budget data (v1) contents
type LegacyBudgetData = {
  people: any[];
  expenses: any[];
  householdSettings: { distributionMethod?: string } | undefined;
};

const validateLegacyBudgetData = (data: any): LegacyBudgetData => {
  console.log('storage: Validating legacy (v1) budget data...');
  const safeData: any = data && typeof data === 'object' ? data : {};
  const people = Array.isArray(safeData.people)
    ? safeData.people
        .filter((p: any) => p && typeof p === 'object' && p.id && typeof p.name === 'string')
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          income: Array.isArray(p.income)
            ? p.income.filter((i: any) => i && typeof i === 'object' && i.id && typeof i.amount === 'number')
            : [],
        }))
    : [];
  const validFreq = ['daily', 'weekly', 'monthly', 'yearly', 'one-time'];
  const expenses = Array.isArray(safeData.expenses)
    ? safeData.expenses
        .filter(
          (e: any) =>
            e &&
            typeof e === 'object' &&
            e.id &&
            typeof e.amount === 'number' &&
            typeof e.description === 'string' &&
            ['household', 'personal'].includes(e.category) &&
            validFreq.includes(e.frequency) &&
            e.date
        )
        .map((e: any) => {
          // For legacy data, assign to first person if no personId exists
          let personId = typeof e.personId === 'string' ? e.personId : '';
          if (!personId && people.length > 0) {
            personId = people[0].id;
          }
          
          return {
            id: e.id,
            amount: typeof e.amount === 'number' ? e.amount : 0,
            description: typeof e.description === 'string' ? e.description : '',
            category: (['household', 'personal'].includes(e.category) ? e.category : 'household') as 'household' | 'personal',
            frequency: validFreq.includes(e.frequency) ? e.frequency : 'monthly',
            personId: personId, // Now required for all expenses
            date: typeof e.date === 'string' ? e.date : new Date().toISOString(),
            notes: typeof e.notes === 'string' ? e.notes : '',
            categoryTag: sanitizeCategoryTag(e.categoryTag || 'Misc'),
            endDate: sanitizeEndDate(e.frequency, e.endDate),
          };
        })
        .filter((e: any) => e.personId) // Only keep expenses that have a valid personId
    : [];
  const distribution =
    safeData?.householdSettings &&
    typeof safeData.householdSettings === 'object' &&
    ['even', 'income-based'].includes(safeData.householdSettings.distributionMethod)
      ? (safeData.householdSettings.distributionMethod as 'even' | 'income-based')
      : 'even';

  const validated: LegacyBudgetData = {
    people,
    expenses,
    householdSettings: { distributionMethod: distribution },
  };
  console.log('storage: Legacy validation complete', {
    people: validated.people.length,
    expenses: validated.expenses.length,
    distribution: validated.householdSettings.distributionMethod,
  });
  return validated;
};

// Validate AppDataV2
const validateAppData = (data: any): AppDataV2 => {
  console.log('storage: Validating AppDataV2...');
  if (!data || typeof data !== 'object') {
    console.log('storage: No data or invalid data, creating default budget');
    const initialBudget = createEmptyBudget('My Budget');
    return { version: 2, budgets: [initialBudget], activeBudgetId: initialBudget.id };
  }

  const makeSafeBudget = (b: any): Budget => {
    const legacyShape = validateLegacyBudgetData(b);
    // Ensure all expenses have valid categoryTag and properly sanitized endDate
    const sanitizedExpenses = (legacyShape.expenses || []).map((e: Expense) => ({
      ...e,
      categoryTag: sanitizeCategoryTag((e as any).categoryTag || 'Misc'),
      endDate: sanitizeEndDate((e as any).frequency, (e as any).endDate),
    }));

    // Ensure lock settings exist with defaults
    const lockSettings: BudgetLockSettings = {
      locked: b?.lock?.locked === true,
      autoLockMinutes: typeof b?.lock?.autoLockMinutes === 'number' ? b.lock.autoLockMinutes : 0,
      lastUnlockAt: typeof b?.lock?.lastUnlockAt === 'string' ? b.lock.lastUnlockAt : undefined,
    };

    const now = Date.now();
    const createdAt = typeof b?.createdAt === 'number' ? b.createdAt : now;
    const modifiedAt = typeof b?.modifiedAt === 'number' ? b.modifiedAt : createdAt;

    return {
      id: typeof b?.id === 'string' ? b.id : `budget_${Math.random().toString(36).slice(2)}`,
      name: typeof b?.name === 'string' ? b.name : 'My Budget',
      people: legacyShape.people,
      expenses: sanitizedExpenses,
      householdSettings: legacyShape.householdSettings,
      createdAt,
      modifiedAt,
      lock: lockSettings,
    };
  };

  const budgets: Budget[] =
    Array.isArray(data.budgets) && data.budgets.length > 0 ? data.budgets.map((b: any) => makeSafeBudget(b)) : [createEmptyBudget('My Budget')];

  let activeBudgetId = typeof data.activeBudgetId === 'string' ? data.activeBudgetId : budgets[0].id;
  if (!budgets.find((b) => b.id === activeBudgetId)) activeBudgetId = budgets[0].id;

  console.log('storage: AppDataV2 validation complete', {
    budgetsCount: budgets.length,
    activeBudgetId,
    budgetNames: budgets.map(b => b.name)
  });

  return { version: 2 as const, budgets, activeBudgetId };
};

// Load AppDataV2; migrate from v1 if necessary
export const loadAppData = async (): Promise<AppDataV2> => {
  try {
    console.log('storage: Loading AppDataV2...');
    const v2Raw = await AsyncStorage.getItem(STORAGE_KEYS.APP_DATA_V2);
    if (v2Raw) {
      const parsed = JSON.parse(v2Raw);
      const validated = validateAppData(parsed);
      console.log('storage: Loaded existing AppDataV2 successfully');
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
        console.error('storage: Failed to parse legacy data, creating new default', e);
        legacyParsed = { people: [], expenses: [], householdSettings: { distributionMethod: 'even' } };
      }
      const legacy = validateLegacyBudgetData(legacyParsed);
      const now = Date.now();
      const migratedBudget: Budget = {
        id: `budget_${now}_${Math.random().toString(36).substr(2, 9)}`,
        name: 'My Budget',
        people: legacy.people,
        expenses: legacy.expenses,
        householdSettings: legacy.householdSettings,
        createdAt: now,
        modifiedAt: now,
        lock: getDefaultLockSettings(),
      };
      const appData: AppDataV2 = { version: 2, budgets: [migratedBudget], activeBudgetId: migratedBudget.id };
      await saveAppData(appData);
      console.log('storage: Migration complete.');
      return appData;
    }

    // No data at all, create default
    console.log('storage: No existing data found, creating default budget');
    const initialBudget = createEmptyBudget('My Budget');
    const appData: AppDataV2 = { version: 2, budgets: [initialBudget], activeBudgetId: initialBudget.id };
    await saveAppData(appData);
    return appData;
  } catch (error) {
    console.error('storage: Error loading AppDataV2:', error);
    const initialBudget = createEmptyBudget('My Budget');
    return { version: 2, budgets: [initialBudget], activeBudgetId: initialBudget.id };
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
    if (appSaveQueue.length > 0) setTimeout(() => processAppSaveQueue(), 0);
  }
};

const performAppSave = async (data: AppDataV2): Promise<void> => {
  const validated = validateAppData(data);
  const json = JSON.stringify(validated);
  await AsyncStorage.setItem(STORAGE_KEYS.APP_DATA_V2, json);

  // Verify save
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
  // Add better null checks and logging
  if (!appData) {
    console.error('storage: getActiveBudget called with null/undefined appData');
    const defaultBudget = createEmptyBudget('My Budget');
    return defaultBudget;
  }

  if (!appData.budgets || !Array.isArray(appData.budgets) || appData.budgets.length === 0) {
    console.log('storage: no budgets available, creating default');
    const defaultBudget = createEmptyBudget('My Budget');
    return defaultBudget;
  }
  
  const active = appData.budgets.find((b) => b && b.id === appData.activeBudgetId);
  const result = active || appData.budgets[0];
  
  console.log('storage: getActiveBudget result:', {
    activeBudgetId: appData.activeBudgetId,
    foundActive: !!active,
    resultId: result.id,
    resultName: result.name,
    peopleCount: result.people?.length || 0,
    expensesCount: result.expenses?.length || 0
  });
  
  return result;
};

export const setActiveBudget = async (budgetId: string): Promise<{ success: boolean; error?: Error }> => {
  const appData = await loadAppData();
  if (!appData.budgets || !Array.isArray(appData.budgets) || !appData.budgets.find((b) => b && b.id === budgetId)) {
    return { success: false, error: new Error('Budget not found') };
  }
  const newAppData: AppDataV2 = { ...appData, activeBudgetId: budgetId };
  return await saveAppData(newAppData);
};

export const addBudget = async (name: string): Promise<{ success: boolean; error?: Error; budget?: Budget }> => {
  const appData = await loadAppData();
  const newBudget = createEmptyBudget(name || 'New Budget');
  const budgets = appData.budgets && Array.isArray(appData.budgets) ? appData.budgets : [];
  const newAppData: AppDataV2 = { ...appData, budgets: [...budgets, newBudget], activeBudgetId: newBudget.id };
  const res = await saveAppData(newAppData);
  return { ...res, budget: newBudget };
};

export const renameBudget = async (budgetId: string, newName: string): Promise<{ success: boolean; error?: Error }> => {
  const appData = await loadAppData();
  if (!appData.budgets || !Array.isArray(appData.budgets)) {
    return { success: false, error: new Error('No budgets found') };
  }
  const idx = appData.budgets.findIndex((b) => b && b.id === budgetId);
  if (idx === -1) return { success: false, error: new Error('Budget not found') };
  const budgets = [...appData.budgets];
  budgets[idx] = { ...budgets[idx], name: newName || budgets[idx].name, modifiedAt: Date.now() };
  return await saveAppData({ ...appData, budgets });
};

export const deleteBudget = async (budgetId: string): Promise<{ success: boolean; error?: Error }> => {
  const appData = await loadAppData();
  if (!appData.budgets || !Array.isArray(appData.budgets) || appData.budgets.length <= 1) {
    return { success: false, error: new Error('Cannot delete the last budget') };
  }
  const budgets = appData.budgets.filter((b) => b && b.id !== budgetId);
  let activeBudgetId = appData.activeBudgetId;
  if (activeBudgetId === budgetId) {
    activeBudgetId = budgets[0]?.id || '';
  }
  return await saveAppData({ ...appData, budgets, activeBudgetId });
};

export const duplicateBudget = async (budgetId: string, customName?: string): Promise<{ success: boolean; error?: Error; budget?: Budget }> => {
  console.log('storage: duplicateBudget called with:', { budgetId, customName });
  
  try {
    const appData = await loadAppData();
    if (!appData.budgets || !Array.isArray(appData.budgets)) {
      console.error('storage: No budgets found in app data');
      return { success: false, error: new Error('No budgets found') };
    }
    
    const originalBudget = appData.budgets.find((b) => b && b.id === budgetId);
    if (!originalBudget) {
      console.error('storage: Budget not found:', budgetId);
      return { success: false, error: new Error('Budget not found') };
    }
    
    console.log('storage: Original budget found:', {
      id: originalBudget.id,
      name: originalBudget.name,
      peopleCount: originalBudget.people?.length || 0,
      expensesCount: originalBudget.expenses?.length || 0
    });
    
    // Create a deep copy of the budget with new IDs
    const now = Date.now();
    
    // Safely handle people array - ensure it exists and is an array
    const originalPeople = Array.isArray(originalBudget.people) ? originalBudget.people : [];
    const duplicatedPeople = originalPeople.map(person => {
      // Ensure person exists and has required properties
      if (!person || typeof person !== 'object') {
        console.warn('storage: Invalid person object found, skipping:', person);
        return null;
      }
      
      // Safely handle income array
      const originalIncome = Array.isArray(person.income) ? person.income : [];
      const duplicatedIncome = originalIncome.map(income => {
        if (!income || typeof income !== 'object') {
          console.warn('storage: Invalid income object found, skipping:', income);
          return null;
        }
        
        return {
          ...income,
          id: `income_${now}_${Math.random().toString(36).substr(2, 9)}`,
        };
      }).filter(income => income !== null); // Remove any null entries
      
      return {
        ...person,
        id: `person_${now}_${Math.random().toString(36).substr(2, 9)}`,
        income: duplicatedIncome,
      };
    }).filter(person => person !== null); // Remove any null entries
    
    // Safely handle expenses array - ensure it exists and is an array
    const originalExpenses = Array.isArray(originalBudget.expenses) ? originalBudget.expenses : [];
    const duplicatedExpenses = originalExpenses.map(expense => {
      if (!expense || typeof expense !== 'object') {
        console.warn('storage: Invalid expense object found, skipping:', expense);
        return null;
      }
      
      const newExpense = {
        ...expense,
        id: `expense_${now}_${Math.random().toString(36).substr(2, 9)}`,
      };
      
      // Update the personId to match the new person ID (required for all expenses)
      if (expense.personId) {
        const originalPersonIndex = originalPeople.findIndex(p => p && p.id === expense.personId);
        if (originalPersonIndex !== -1 && duplicatedPeople[originalPersonIndex]) {
          newExpense.personId = duplicatedPeople[originalPersonIndex].id;
        } else {
          console.warn('storage: Could not find matching person for expense, assigning to first person:', expense);
          // Assign to first person if original person not found
          newExpense.personId = duplicatedPeople.length > 0 ? duplicatedPeople[0].id : '';
        }
      } else {
        // For legacy expenses without personId, assign to first person
        newExpense.personId = duplicatedPeople.length > 0 ? duplicatedPeople[0].id : '';
      }
      
      return newExpense;
    }).filter(expense => expense !== null); // Remove any null entries
    
    // Safely handle household settings
    const originalHouseholdSettings = originalBudget.householdSettings || { distributionMethod: 'even' };
    
    const duplicatedBudget: Budget = {
      ...originalBudget,
      id: `budget_${now}_${Math.random().toString(36).substr(2, 9)}`,
      name: customName || `${originalBudget.name} (Copy)`,
      createdAt: now,
      modifiedAt: now,
      people: duplicatedPeople,
      expenses: duplicatedExpenses,
      householdSettings: originalHouseholdSettings,
      // Reset lock settings for the duplicate
      lock: getDefaultLockSettings(),
    };
    
    console.log('storage: Duplicated budget created:', {
      id: duplicatedBudget.id,
      name: duplicatedBudget.name,
      peopleCount: duplicatedBudget.people.length,
      expensesCount: duplicatedBudget.expenses.length
    });
    
    const budgets = [...appData.budgets, duplicatedBudget];
    const newAppData: AppDataV2 = { ...appData, budgets };
    const res = await saveAppData(newAppData);
    
    console.log('storage: Duplicate budget save result:', res);
    return { ...res, budget: duplicatedBudget };
  } catch (error) {
    console.error('storage: Error in duplicateBudget:', error);
    return { success: false, error: error as Error };
  }
};

export const updateBudget = async (budget: Budget): Promise<{ success: boolean; error?: Error }> => {
  const appData = await loadAppData();
  if (!appData.budgets || !Array.isArray(appData.budgets)) {
    return { success: false, error: new Error('No budgets found') };
  }
  const idx = appData.budgets.findIndex((b) => b && b.id === budget.id);
  if (idx === -1) return { success: false, error: new Error('Budget not found') };
  const budgets = [...appData.budgets];
  // Ensure expenses have valid categoryTag and endDate before saving
  const sanitized = {
    ...budget,
    modifiedAt: Date.now(), // Update modified timestamp
    expenses: (budget.expenses || []).map((e: Expense) => ({
      ...e,
      categoryTag: sanitizeCategoryTag((e as any).categoryTag || 'Misc'),
      endDate: sanitizeEndDate((e as any).frequency, (e as any).endDate),
    })),
    lock: budget.lock || getDefaultLockSettings(),
  } as Budget;
  budgets[idx] = { ...sanitized };
  return await saveAppData({ ...appData, budgets });
};

// Budget lock helper functions
export const getBudgetLock = (budgetId: string, appData: AppDataV2): BudgetLockSettings | undefined => {
  if (!appData.budgets || !Array.isArray(appData.budgets)) return undefined;
  const budget = appData.budgets.find((b) => b && b.id === budgetId);
  return budget?.lock;
};

export const setBudgetLock = async (budgetId: string, patch: Partial<BudgetLockSettings>): Promise<{ success: boolean; error?: Error }> => {
  const appData = await loadAppData();
  if (!appData.budgets || !Array.isArray(appData.budgets)) {
    return { success: false, error: new Error('No budgets found') };
  }
  const budgetIndex = appData.budgets.findIndex((b) => b && b.id === budgetId);
  if (budgetIndex === -1) return { success: false, error: new Error('Budget not found') };
  
  const budget = appData.budgets[budgetIndex];
  const currentLock = budget.lock || getDefaultLockSettings();
  const updatedLock = { ...currentLock, ...patch };
  
  const updatedBudget = { ...budget, lock: updatedLock, modifiedAt: Date.now() };
  const budgets = [...appData.budgets];
  budgets[budgetIndex] = updatedBudget;
  
  return await saveAppData({ ...appData, budgets });
};

export const markBudgetUnlocked = async (budgetId: string): Promise<{ success: boolean; error?: Error }> => {
  return await setBudgetLock(budgetId, { lastUnlockAt: new Date().toISOString() });
};

// Clear contents of ACTIVE budget (utility)
export const clearActiveBudgetData = async (): Promise<void> => {
  const appData = await loadAppData();
  const active = getActiveBudget(appData);
  const cleared: Budget = { 
    ...active, 
    people: [], 
    expenses: [], 
    householdSettings: { distributionMethod: 'even' },
    modifiedAt: Date.now(),
    lock: active.lock || getDefaultLockSettings(),
  };
  const budgets = appData.budgets && Array.isArray(appData.budgets) 
    ? appData.budgets.map((b) => (b && b.id === active.id ? cleared : b))
    : [cleared];
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

// Backup/restore that supports v2 and wraps v1 + includes custom categories and filters
export const backupData = async (): Promise<string | null> => {
  try {
    const appData = await loadAppData();
    const customCategories = await getCustomExpenseCategories();
    const expensesFilters = await getExpensesFilters();
    const payload = {
      backupVersion: '2',
      appData,
      customCategories,
      expensesFilters,
    };
    const json = JSON.stringify(payload);
    console.log('storage: AppDataV2 backup created with custom categories and filters');
    return json;
  } catch (error) {
    console.error('storage: Error creating backup:', error);
    return null;
  }
};

export const restoreData = async (backup: string): Promise<{ success: boolean; error?: Error }> => {
  try {
    const parsed = JSON.parse(backup);

    // New backup format with extras
    if (parsed && parsed.backupVersion === '2' && parsed.appData) {
      const validated = validateAppData(parsed.appData);
      const res = await saveAppData(validated);
      if (res.success) {
        if (Array.isArray(parsed.customCategories)) {
          await saveCustomExpenseCategories(parsed.customCategories);
        }
        if (parsed.expensesFilters && typeof parsed.expensesFilters === 'object') {
          await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES_FILTERS, JSON.stringify(parsed.expensesFilters));
        }
      }
      return res;
    }

    // AppData-only backup
    if (parsed && parsed.version === 2 && Array.isArray(parsed.budgets)) {
      const validated = validateAppData(parsed);
      return await saveAppData(validated);
    }

    // Assume legacy shape and wrap into v2
    const legacy = validateLegacyBudgetData(parsed);
    const now = Date.now();
    const migratedBudget: Budget = {
      id: `budget_${now}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'My Budget',
      people: legacy.people,
      expenses: legacy.expenses,
      householdSettings: legacy.householdSettings,
      createdAt: now,
      modifiedAt: now,
      lock: getDefaultLockSettings(),
    };
    const appData: AppDataV2 = { version: 2, budgets: [migratedBudget], activeBudgetId: migratedBudget.id };
    return await saveAppData(appData);
  } catch (error) {
    console.error('storage: Error restoring backup:', error);
    return { success: false, error: error as Error };
  }
};
