
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppDataV2, Budget, Expense, ExpenseCategory, DEFAULT_CATEGORIES } from '../types/budget';

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
const createEmptyBudget = (name: string): Budget => ({
  id: `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  name,
  people: [],
  expenses: [],
  householdSettings: { distributionMethod: 'even' },
  createdAt: Date.now(),
});

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
        .map((e: any) => ({
          id: e.id,
          amount: typeof e.amount === 'number' ? e.amount : 0,
          description: typeof e.description === 'string' ? e.description : '',
          category: (['household', 'personal'].includes(e.category) ? e.category : 'household') as 'household' | 'personal',
          frequency: validFreq.includes(e.frequency) ? e.frequency : 'monthly',
          personId: e.category === 'personal' && typeof e.personId === 'string' ? e.personId : undefined,
          date: typeof e.date === 'string' ? e.date : new Date().toISOString(),
          notes: typeof e.notes === 'string' ? e.notes : '',
          categoryTag: sanitizeCategoryTag(e.categoryTag || 'Misc'),
          endDate: sanitizeEndDate(e.frequency, e.endDate),
        }))
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

    return {
      id: typeof b?.id === 'string' ? b.id : `budget_${Math.random().toString(36).slice(2)}`,
      name: typeof b?.name === 'string' ? b.name : 'My Budget',
      people: legacyShape.people,
      expenses: sanitizedExpenses,
      householdSettings: legacyShape.householdSettings,
      createdAt: typeof b?.createdAt === 'number' ? b.createdAt : Date.now(),
    };
  };

  const budgets: Budget[] =
    Array.isArray(data.budgets) && data.budgets.length > 0 ? data.budgets.map((b: any) => makeSafeBudget(b)) : [createEmptyBudget('My Budget')];

  let activeBudgetId = typeof data.activeBudgetId === 'string' ? data.activeBudgetId : budgets[0].id;
  if (!budgets.find((b) => b.id === activeBudgetId)) activeBudgetId = budgets[0].id;

  return { version: 2 as const, budgets, activeBudgetId };
};

// Load AppDataV2; migrate from v1 if necessary
export const loadAppData = async (): Promise<AppDataV2> => {
  try {
    console.log('storage: Loading AppDataV2...');
    const v2Raw = await AsyncStorage.getItem(STORAGE_KEYS.APP_DATA_V2);
    if (v2Raw) {
      const parsed = JSON.parse(v2Raw);
      return validateAppData(parsed);
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
      const migratedBudget: Budget = {
        id: `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: 'My Budget',
        people: legacy.people,
        expenses: legacy.expenses,
        householdSettings: legacy.householdSettings,
        createdAt: Date.now(),
      };
      const appData: AppDataV2 = { version: 2, budgets: [migratedBudget], activeBudgetId: migratedBudget.id };
      await saveAppData(appData);
      console.log('storage: Migration complete.');
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
  const active = appData.budgets.find((b) => b.id === appData.activeBudgetId);
  return active || appData.budgets[0];
};

export const setActiveBudget = async (budgetId: string): Promise<{ success: boolean; error?: Error }> => {
  const appData = await loadAppData();
  if (!appData.budgets.find((b) => b.id === budgetId)) {
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
  const idx = appData.budgets.findIndex((b) => b.id === budgetId);
  if (idx === -1) return { success: false, error: new Error('Budget not found') };
  const budgets = [...appData.budgets];
  budgets[idx] = { ...budgets[idx], name: newName || budgets[idx].name };
  return await saveAppData({ ...appData, budgets });
};

export const deleteBudget = async (budgetId: string): Promise<{ success: boolean; error?: Error }> => {
  const appData = await loadAppData();
  if (appData.budgets.length <= 1) return { success: false, error: new Error('Cannot delete the last budget') };
  const budgets = appData.budgets.filter((b) => b.id !== budgetId);
  let activeBudgetId = appData.activeBudgetId;
  if (activeBudgetId === budgetId) {
    activeBudgetId = budgets[0].id;
  }
  return await saveAppData({ ...appData, budgets, activeBudgetId });
};

export const updateBudget = async (budget: Budget): Promise<{ success: boolean; error?: Error }> => {
  const appData = await loadAppData();
  const idx = appData.budgets.findIndex((b) => b.id === budget.id);
  if (idx === -1) return { success: false, error: new Error('Budget not found') };
  const budgets = [...appData.budgets];
  // Ensure expenses have valid categoryTag and endDate before saving
  const sanitized = {
    ...budget,
    expenses: (budget.expenses || []).map((e: Expense) => ({
      ...e,
      categoryTag: sanitizeCategoryTag((e as any).categoryTag || 'Misc'),
      endDate: sanitizeEndDate((e as any).frequency, (e as any).endDate),
    })),
  } as Budget;
  budgets[idx] = { ...sanitized };
  return await saveAppData({ ...appData, budgets });
};

// Clear contents of ACTIVE budget (utility)
export const clearActiveBudgetData = async (): Promise<void> => {
  const appData = await loadAppData();
  const active = getActiveBudget(appData);
  const cleared: Budget = { ...active, people: [], expenses: [], householdSettings: { distributionMethod: 'even' } };
  const budgets = appData.budgets.map((b) => (b.id === active.id ? cleared : b));
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
    const migratedBudget: Budget = {
      id: `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'My Budget',
      people: legacy.people,
      expenses: legacy.expenses,
      householdSettings: legacy.householdSettings,
      createdAt: Date.now(),
    };
    const appData: AppDataV2 = { version: 2, budgets: [migratedBudget], activeBudgetId: migratedBudget.id };
    return await saveAppData(appData);
  } catch (error) {
    console.error('storage: Error restoring backup:', error);
    return { success: false, error: error as Error };
  }
};
