
import { useState, useCallback, useRef, useEffect } from 'react';
import { useBudgetData } from '../hooks/useBudgetData';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, AccessibilityInfo } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { calculateMonthlyAmount } from '../utils/calculations';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useCurrency } from '../hooks/useCurrency';
import Icon from '../components/Icon';
import StandardHeader from '../components/StandardHeader';
import ExpenseFilterModal from '../components/ExpenseFilterModal';
import { DEFAULT_CATEGORIES } from '../types/budget';
import { getCustomExpenseCategories, getExpensesFilters, saveExpensesFilters, normalizeCategoryName } from '../utils/storage';

type SortOption = 'date' | 'alphabetical' | 'cost';
type SortOrder = 'asc' | 'desc';

export default function ExpensesScreen() {
  const { data, removeExpense, saving, refreshData } = useBudgetData();
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();
  const { formatCurrency } = useCurrency();
  const params = useLocalSearchParams<{ 
    showRecurring?: string;
    filter?: string;
    category?: string;
    fromDashboard?: string;
    personId?: string;
  }>();

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Filter state - Initialize with proper defaults
  const [filter, setFilter] = useState<'all' | 'household' | 'personal'>('all');
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>(''); // debounced
  const [hasEndDateFilter, setHasEndDateFilter] = useState<boolean>(false);

  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  
  // Enhanced sorting state
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc'); // Default: newest first

  // Use ref to track if we've already refreshed on this focus
  const hasRefreshedOnFocus = useRef(false);
  
  // FIXED: Better state management for filter loading
  const filtersLoaded = useRef(false);
  const isInitialLoad = useRef(true);
  const lastDashboardParams = useRef<string>(''); // Track dashboard navigation changes

  // Wrap announceFilter in useCallback to fix exhaustive deps warning
  const announceFilter = useCallback((msg: string) => {
    try {
      AccessibilityInfo.announceForAccessibility?.(msg);
    } catch (e) {
      console.log('Accessibility announce failed', e);
    }
  }, []);

  // Helper function to format expiration date
  const formatExpirationDate = useCallback((endDate: string) => {
    const date = new Date(endDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    };
    const formattedDate = date.toLocaleDateString('en-US', options);
    
    if (diffDays < 0) {
      return { text: `Expired ${formattedDate}`, isExpired: true, isExpiringSoon: false };
    } else if (diffDays === 0) {
      return { text: `Expires today`, isExpired: false, isExpiringSoon: true };
    } else if (diffDays === 1) {
      return { text: `Expires tomorrow`, isExpired: false, isExpiringSoon: true };
    } else if (diffDays <= 7) {
      return { text: `Expires in ${diffDays} days`, isExpired: false, isExpiringSoon: true };
    } else if (diffDays <= 30) {
      return { text: `Expires ${formattedDate}`, isExpired: false, isExpiringSoon: false };
    } else {
      return { text: `Expires ${formattedDate}`, isExpired: false, isExpiringSoon: false };
    }
  }, []);

  // FIXED: Load persisted filters function with better error handling
  const loadPersistedFilters = useCallback(async () => {
    if (filtersLoaded.current) {
      console.log('ExpensesScreen: Filters already loaded, skipping...');
      return;
    }

    try {
      console.log('ExpensesScreen: Loading persisted filters...');
      const filters = await getExpensesFilters();
      console.log('ExpensesScreen: Loaded persisted filters:', filters);
      
      setCategoryFilter(filters.category || null);
      setSearchQuery(filters.search || '');
      setSearchTerm(filters.search || '');
      setHasEndDateFilter(filters.hasEndDate || false);
      setFilter(filters.filter || 'all');
      setPersonFilter(filters.personFilter || null);
      
      filtersLoaded.current = true;
      console.log('ExpensesScreen: Filters loaded successfully');
    } catch (e) {
      console.error('ExpensesScreen: Failed to load persisted filters:', e);
      filtersLoaded.current = true; // Mark as loaded even on error to prevent infinite retries
    }
  }, []);

  // FIXED: Better dashboard navigation handling with proper filter persistence
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Always load custom categories
        const customs = await getCustomExpenseCategories();
        console.log('ExpensesScreen: Loaded custom categories:', customs);
        setCustomCategories(customs);
        
        // Create a unique key for dashboard params to detect changes
        const dashboardParamsKey = `${params.fromDashboard}-${params.filter}-${params.category}-${params.personId}`;
        const isDashboardNavigation = params.fromDashboard === 'true';
        const dashboardParamsChanged = lastDashboardParams.current !== dashboardParamsKey;
        
        console.log('ExpensesScreen: Navigation analysis:', {
          isDashboardNavigation,
          dashboardParamsChanged,
          currentKey: dashboardParamsKey,
          lastKey: lastDashboardParams.current,
          isInitialLoad: isInitialLoad.current,
          filtersLoaded: filtersLoaded.current
        });
        
        if (isDashboardNavigation) {
          // FIXED: Apply dashboard filters and mark as loaded
          if (dashboardParamsChanged || isInitialLoad.current) {
            console.log('ExpensesScreen: Applying filters from dashboard navigation');
            lastDashboardParams.current = dashboardParamsKey;
            
            // Apply filters from URL parameters
            if (params.filter && (params.filter === 'household' || params.filter === 'personal')) {
              setFilter(params.filter);
            } else {
              setFilter('all');
            }
            
            if (params.category) {
              setCategoryFilter(params.category);
            } else {
              setCategoryFilter(null);
            }
            
            if (params.personId) {
              setPersonFilter(params.personId);
            } else {
              setPersonFilter(null);
            }
            
            // Clear other filters when coming from dashboard
            setSearchQuery('');
            setSearchTerm('');
            setHasEndDateFilter(false);
            
            // Announce the applied filters for accessibility
            const filterMessages = [];
            if (params.filter) {
              filterMessages.push(`${params.filter} expenses`);
            }
            if (params.category) {
              filterMessages.push(`${params.category} category`);
            }
            if (params.personId) {
              const person = data.people.find(p => p.id === params.personId);
              if (person) {
                filterMessages.push(`${person.name}'s expenses`);
              }
            }
            if (filterMessages.length > 0) {
              announceFilter(`Filtered by ${filterMessages.join(' and ')}`);
            }
            
            filtersLoaded.current = true;
          } else if (!filtersLoaded.current) {
            // FIXED: If returning to screen with same dashboard params, load persisted filters
            // This handles the case where user navigates away and comes back
            console.log('ExpensesScreen: Returning to screen with same dashboard params, loading persisted filters');
            await loadPersistedFilters();
          }
        } else {
          // For normal navigation, load persisted filters only if not already loaded
          if (!filtersLoaded.current) {
            await loadPersistedFilters();
          }
          // Reset dashboard params tracking for non-dashboard navigation
          lastDashboardParams.current = '';
        }
      } catch (error) {
        console.error('ExpensesScreen: Error loading initial data:', error);
        filtersLoaded.current = true;
      }
    };

    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      loadInitialData();
    } else {
      // Handle subsequent navigation changes
      loadInitialData();
    }
  }, [params.filter, params.category, params.fromDashboard, params.personId, announceFilter, data.people, loadPersistedFilters]);

  // Reload custom categories when data changes (e.g., after clearing all data)
  useEffect(() => {
    const reloadCustomCategories = async () => {
      try {
        const customs = await getCustomExpenseCategories();
        console.log('ExpensesScreen: Reloaded custom categories after data change:', customs);
        setCustomCategories(customs);
        // If current category filter is no longer valid, clear it
        if (categoryFilter && !customs.includes(categoryFilter) && !DEFAULT_CATEGORIES.includes(categoryFilter)) {
          console.log('ExpensesScreen: Clearing invalid category filter:', categoryFilter);
          setCategoryFilter(null);
        }
      } catch (error) {
        console.error('ExpensesScreen: Error reloading custom categories:', error);
      }
    };

    reloadCustomCategories();
  }, [data.people.length, data.expenses.length, categoryFilter]);

  // FIXED: Persist filters properly - including dashboard filters after they're applied
  useEffect(() => {
    // Persist filters if:
    // 1. Filters have been loaded (to prevent overwriting during initial load)
    // 2. Not on initial load
    // 3. Either not from dashboard OR dashboard filters have been applied and should be persisted
    const isDashboardNavigation = params.fromDashboard === 'true';
    
    if (filtersLoaded.current && !isInitialLoad.current) {
      const timeoutId = setTimeout(() => {
        console.log('ExpensesScreen: Persisting filters:', { 
          category: categoryFilter, 
          search: searchQuery, 
          hasEndDate: hasEndDateFilter,
          filter: filter,
          personFilter: personFilter,
          isDashboardNavigation
        });
        saveExpensesFilters({ 
          category: categoryFilter, 
          search: searchQuery, 
          hasEndDate: hasEndDateFilter,
          filter: filter,
          personFilter: personFilter
        });
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [categoryFilter, searchQuery, hasEndDateFilter, filter, personFilter, params.fromDashboard]);

  // Debounce search for filtering performance
  useEffect(() => {
    const timeoutId = setTimeout(() => setSearchTerm(searchQuery.trim()), 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // FIXED: Better focus effect handling with proper filter persistence
  useFocusEffect(
    useCallback(() => {
      console.log('ExpensesScreen: Focus effect triggered');
      
      if (!hasRefreshedOnFocus.current) {
        hasRefreshedOnFocus.current = true;
        refreshData(true);
        // Also refresh custom categories (in case new one added)
        getCustomExpenseCategories().then(setCustomCategories).catch((e) => console.log('Failed to refresh custom categories', e));
      }
      
      return () => {
        hasRefreshedOnFocus.current = false;
        // FIXED: Only reset dashboard state when actually leaving the screen for good
        // Don't reset when just navigating away temporarily
      };
    }, [refreshData])
  );

  const handleRemoveExpense = useCallback(
    async (expenseId: string, description: string) => {
      if (deletingExpenseId === expenseId || saving) return;
      try {
        setDeletingExpenseId(expenseId);
        const result = await removeExpense(expenseId);
        if (!result.success) {
          Alert.alert('Error', 'Failed to remove expense. Please try again.');
        }
      } catch (error) {
        console.error('ExpensesScreen: Error removing expense:', error);
        Alert.alert('Error', 'Failed to remove expense. Please try again.');
      } finally {
        setDeletingExpenseId(null);
      }
    },
    [deletingExpenseId, saving, removeExpense]
  );

  const handleDeletePress = useCallback(
    (expenseId: string, description: string) => {
      Alert.alert('Delete Expense', `Are you sure you want to delete "${description}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            handleRemoveExpense(expenseId, description);
          },
        },
      ]);
    },
    [handleRemoveExpense]
  );

  const handleEditExpense = useCallback((expense: any) => {
    router.push({
      pathname: '/add-expense',
      params: { id: expense.id, origin: 'expenses' },
    });
  }, []);

  const handleNavigateToAddExpense = useCallback(() => {
    router.push('/add-expense');
  }, []);

  const handleClearFilters = useCallback(() => {
    console.log('ExpensesScreen: Clearing all filters');
    setCategoryFilter(null);
    setSearchQuery('');
    setSearchTerm('');
    setFilter('all');
    setPersonFilter(null);
    setHasEndDateFilter(false);
    announceFilter('All filters cleared');
    
    // Also clear persisted filters
    saveExpensesFilters({ 
      category: null, 
      search: '', 
      hasEndDate: false,
      filter: 'all',
      personFilter: null
    });
  }, [announceFilter]);

  // Enhanced sort button handler
  const handleSortPress = useCallback((sortType: SortOption) => {
    if (sortBy === sortType) {
      // Toggle order if same sort type
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort type with appropriate default order
      setSortBy(sortType);
      if (sortType === 'date') {
        setSortOrder('desc'); // Newest first for date
      } else {
        setSortOrder('asc'); // A-Z for alphabetical, lowest first for cost
      }
    }
  }, [sortBy, sortOrder]);

  const getSortIcon = useCallback((sortType: SortOption) => {
    if (sortBy !== sortType) {
      return 'swap-vertical-outline';
    }
    
    return sortOrder === 'desc' ? 'arrow-down' : 'arrow-up';
  }, [sortBy, sortOrder]);

  const getSortLabel = useCallback((sortType: SortOption) => {
    switch (sortType) {
      case 'date': return 'Date';
      case 'alphabetical': return 'Name';
      case 'cost': return 'Amount';
      default: return 'Date';
    }
  }, []);

  const SortButton = useCallback(
    ({ sortType }: { sortType: SortOption }) => (
      <TouchableOpacity
        style={[
          {
            backgroundColor: sortBy === sortType ? currentColors.primary : currentColors.backgroundAlt,
            marginRight: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: sortBy === sortType ? currentColors.primary : currentColors.border,
            minHeight: 40,
          },
        ]}
        onPress={() => handleSortPress(sortType)}
        disabled={saving || deletingExpenseId !== null}
      >
        <Text
          style={[
            {
              color: sortBy === sortType ? '#FFFFFF' : currentColors.text,
              fontWeight: '600',
              fontSize: 14,
              marginRight: 6,
            },
          ]}
        >
          {getSortLabel(sortType)}
        </Text>
        <Icon 
          name={getSortIcon(sortType) as any} 
          size={14} 
          style={{ 
            color: sortBy === sortType ? '#FFFFFF' : currentColors.textSecondary,
          }} 
        />
      </TouchableOpacity>
    ),
    [sortBy, sortOrder, currentColors, saving, deletingExpenseId, handleSortPress, getSortIcon, getSortLabel]
  );

  // Apply filters with proper logic and error handling
  let filteredExpenses = [...data.expenses]; // Create a copy to avoid mutating original

  console.log('ExpensesScreen: Starting filter process with', filteredExpenses.length, 'total expenses');
  console.log('ExpensesScreen: Current filter state:', {
    filter,
    personFilter,
    categoryFilter,
    searchTerm,
    hasEndDateFilter
  });

  // Apply household/personal filter correctly
  if (filter === 'household') {
    const beforeCount = filteredExpenses.length;
    filteredExpenses = filteredExpenses.filter((e) => e.category === 'household');
    console.log('ExpensesScreen: Household filter applied. Before:', beforeCount, 'After:', filteredExpenses.length);
  } else if (filter === 'personal') {
    const beforeCount = filteredExpenses.length;
    filteredExpenses = filteredExpenses.filter((e) => e.category === 'personal');
    console.log('ExpensesScreen: Personal filter applied. Before:', beforeCount, 'After:', filteredExpenses.length);
  }

  // Apply person filter with proper logic for household vs personal expenses
  if (personFilter) {
    const beforeCount = filteredExpenses.length;
    filteredExpenses = filteredExpenses.filter((e) => {
      // For household expenses, only filter if they have a personId assigned
      if (e.category === 'household') {
        return e.personId === personFilter;
      }
      // For personal expenses, always filter by personId
      return e.personId === personFilter;
    });
    console.log('ExpensesScreen: Person filter applied. Before:', beforeCount, 'After:', filteredExpenses.length);
  }

  // Apply category filter
  if (categoryFilter) {
    const beforeCount = filteredExpenses.length;
    const selected = normalizeCategoryName(categoryFilter);
    filteredExpenses = filteredExpenses.filter((e) => {
      const expenseCategory = normalizeCategoryName((e as any).categoryTag || 'Misc');
      return expenseCategory === selected;
    });
    console.log('ExpensesScreen: Category filter applied. Before:', beforeCount, 'After:', filteredExpenses.length);
  }

  // Apply search filter
  if (searchTerm) {
    const beforeCount = filteredExpenses.length;
    const q = searchTerm.toLowerCase();
    filteredExpenses = filteredExpenses.filter((e) => e.description.toLowerCase().includes(q));
    console.log('ExpensesScreen: Search filter applied. Before:', beforeCount, 'After:', filteredExpenses.length);
  }

  // Apply end date filter
  if (hasEndDateFilter) {
    const beforeCount = filteredExpenses.length;
    filteredExpenses = filteredExpenses.filter((e) => {
      // Only include expenses that have an end date and are not one-time
      const hasEndDate = e.endDate && e.frequency !== 'one-time';
      return hasEndDate;
    });
    console.log('ExpensesScreen: End date filter applied. Before:', beforeCount, 'After:', filteredExpenses.length);
  }

  // Enhanced sorting logic
  filteredExpenses = filteredExpenses.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'alphabetical':
        comparison = a.description.toLowerCase().localeCompare(b.description.toLowerCase());
        break;
      case 'cost':
        comparison = a.amount - b.amount;
        break;
      default:
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  console.log('ExpensesScreen: Final filtered expenses count:', filteredExpenses.length);

  const hasActiveFilters = !!categoryFilter || !!searchTerm || (filter !== 'all') || !!personFilter || hasEndDateFilter;

  // Header buttons - filter button on left, add button on right
  const leftButtons = [
    {
      icon: hasActiveFilters ? 'funnel' : 'options-outline',
      onPress: () => setShowFilterModal(true),
      backgroundColor: hasActiveFilters ? currentColors.primary : currentColors.backgroundAlt,
      iconColor: hasActiveFilters ? '#FFFFFF' : currentColors.text,
      badge: hasActiveFilters ? '●' : undefined,
    },
  ];

  const rightButtons = [
    {
      icon: 'add',
      onPress: handleNavigateToAddExpense,
      backgroundColor: currentColors.primary,
      iconColor: '#FFFFFF',
    },
  ];

  return (
    <View style={themedStyles.container}>
      <StandardHeader 
        title="Expenses" 
        showLeftIcon={false} 
        showRightIcon={false}
        leftButtons={leftButtons}
        rightButtons={rightButtons}
        loading={saving || deletingExpenseId !== null} 
      />

      {/* Sort controls - simplified and cleaner */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: currentColors.backgroundAlt, borderBottomWidth: 1, borderBottomColor: currentColors.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <SortButton sortType="date" />
            <SortButton sortType="alphabetical" />
            <SortButton sortType="cost" />
          </View>
        </ScrollView>
      </View>

      {/* Active filters summary - more prominent when active */}
      {hasActiveFilters && (
        <View style={{ 
          paddingHorizontal: 20, 
          paddingVertical: 12, 
          backgroundColor: currentColors.primary + '10',
          borderBottomWidth: 1,
          borderBottomColor: currentColors.primary + '20'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Icon name="funnel" size={16} style={{ color: currentColors.primary, marginRight: 8 }} />
              <Text style={[themedStyles.text, { color: currentColors.primary, fontWeight: '600', fontSize: 14 }]}>
                {filteredExpenses.length} of {data.expenses.length} expenses
              </Text>
            </View>
            <TouchableOpacity 
              onPress={handleClearFilters}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: currentColors.primary,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={themedStyles.content} contentContainerStyle={themedStyles.scrollContent}>
        {filteredExpenses.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 60 }}>
            <View style={[themedStyles.card, { alignItems: 'center', paddingVertical: 60, width: '100%', maxWidth: 400 }]}>
              <Icon name="receipt-outline" size={64} style={{ color: currentColors.textSecondary, marginBottom: 20 }} />
              <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 8, color: currentColors.textSecondary }]}>
                {hasActiveFilters ? 'No matching expenses' : 'No expenses yet'}
              </Text>
              <Text style={[themedStyles.textSecondary, { textAlign: 'center', lineHeight: 22 }]}>
                {hasActiveFilters
                  ? 'Try adjusting your filters to see more expenses'
                  : 'Add your first expense to get started tracking your spending'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {filteredExpenses.map((expense) => {
              const person = expense.personId ? data.people.find((p) => p.id === expense.personId) : null;
              const monthlyAmount = calculateMonthlyAmount(expense.amount, expense.frequency);
              const isDeleting = deletingExpenseId === expense.id;
              const tag = normalizeCategoryName((expense as any).categoryTag || 'Misc');
              const isHousehold = expense.category === 'household';
              
              // Only show monthly value if the expense was not added as monthly
              const shouldShowMonthlyValue = expense.frequency !== 'monthly';

              // Check if expense has expiration date
              const hasExpirationDate = expense.endDate && expense.frequency !== 'one-time';
              const expirationInfo = hasExpirationDate ? formatExpirationDate(expense.endDate) : null;

              return (
                <TouchableOpacity 
                  key={expense.id} 
                  onPress={() => handleEditExpense(expense)} 
                  activeOpacity={0.7} 
                  disabled={saving || isDeleting}
                  style={[
                    themedStyles.card, 
                    { 
                      padding: 16,
                      opacity: isDeleting ? 0.6 : 1,
                      borderLeftWidth: 3,
                      borderLeftColor: isHousehold ? currentColors.household : currentColors.personal,
                      marginBottom: 8,
                      // Add subtle border for expired/expiring expenses
                      ...(expirationInfo?.isExpired && {
                        borderWidth: 1,
                        borderColor: currentColors.error + '40',
                      }),
                      ...(expirationInfo?.isExpiringSoon && !expirationInfo?.isExpired && {
                        borderWidth: 1,
                        borderColor: '#FF9500' + '40',
                      }),
                    }
                  ]}
                >
                  {/* Main content row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Left side - expense info */}
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={[themedStyles.text, { fontWeight: '600', fontSize: 16, lineHeight: 20, flex: 1 }]}>
                          {expense.description}
                        </Text>
                      </View>
                      
                      {/* Category and person info in one line */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <View style={{
                          backgroundColor: isHousehold ? currentColors.household + '15' : currentColors.personal + '15',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                          marginRight: 6,
                        }}>
                          <Text style={{
                            color: isHousehold ? currentColors.household : currentColors.personal,
                            fontSize: 10,
                            fontWeight: '600',
                            textTransform: 'uppercase',
                          }}>
                            {expense.category}
                          </Text>
                        </View>
                        
                        <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>
                          {tag}
                        </Text>
                      </View>

                      {/* Person and frequency - conditionally show person for household expenses */}
                      <Text style={[themedStyles.textSecondary, { fontSize: 11, lineHeight: 14 }]}>
                        {isHousehold && !person ? '' : (person ? person.name : 'Unassigned')}
                        {isHousehold && !person ? expense.frequency : ` • ${expense.frequency}`}
                      </Text>

                      {/* Expiration date display */}
                      {hasExpirationDate && expirationInfo && (
                        <View style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          marginTop: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          backgroundColor: expirationInfo.isExpired 
                            ? currentColors.error + '15' 
                            : expirationInfo.isExpiringSoon 
                              ? '#FF9500' + '15' 
                              : currentColors.textSecondary + '15',
                          borderRadius: 8,
                          alignSelf: 'flex-start',
                        }}>
                          <Icon 
                            name={expirationInfo?.isExpired ? "time" : "timer-outline"} 
                            size={12} 
                            style={{ 
                              color: expirationInfo?.isExpired 
                                ? currentColors.error 
                                : expirationInfo?.isExpiringSoon 
                                  ? '#FF9500' 
                                  : currentColors.textSecondary,
                              marginRight: 6
                            }} 
                          />
                          <Text style={{
                            fontSize: 11,
                            fontWeight: '600',
                            color: expirationInfo.isExpired 
                              ? currentColors.error 
                              : expirationInfo.isExpiringSoon 
                                ? '#FF9500' 
                                : currentColors.textSecondary,
                          }}>
                            {expirationInfo.text}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Right side - amount and delete */}
                    <View style={{ alignItems: 'flex-end', flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                        <Text style={[
                          themedStyles.text,
                          {
                            fontWeight: '700',
                            fontSize: 16,
                            color: isHousehold ? currentColors.household : currentColors.personal,
                            marginBottom: shouldShowMonthlyValue ? 2 : 0,
                          },
                        ]}>
                          {formatCurrency(expense.amount)}
                        </Text>
                        {shouldShowMonthlyValue && (
                          <Text style={[themedStyles.textSecondary, { fontSize: 10 }]}>
                            {formatCurrency(monthlyAmount)}/mo
                          </Text>
                        )}
                      </View>
                      
                      {/* Delete button */}
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeletePress(expense.id, expense.description);
                        }}
                        disabled={saving || isDeleting}
                        style={{
                          padding: 6,
                          borderRadius: 12,
                          backgroundColor: currentColors.error + '15',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 28,
                          minHeight: 28,
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color={currentColors.error} />
                        ) : (
                          <Icon name="trash-outline" size={14} style={{ color: currentColors.error }} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <ExpenseFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filter={filter}
        setFilter={setFilter}
        personFilter={personFilter}
        setPersonFilter={setPersonFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        hasEndDateFilter={hasEndDateFilter}
        setHasEndDateFilter={setHasEndDateFilter}
        people={data.people}
        expenses={data.expenses}
        customCategories={customCategories}
        onClearFilters={handleClearFilters}
        announceFilter={announceFilter}
      />
    </View>
  );
}
