
import { useState, useCallback, useRef, useEffect } from 'react';
import { useBudgetData } from '../hooks/useBudgetData';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, AccessibilityInfo } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { calculateMonthlyAmount } from '../utils/calculations';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useCurrency } from '../hooks/useCurrency';
import { useToast } from '../hooks/useToast';
import Icon from '../components/Icon';
import StandardHeader from '../components/StandardHeader';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DEFAULT_CATEGORIES } from '../types/budget';
import { getCustomExpenseCategories, getExpensesFilters, saveExpensesFilters, normalizeCategoryName } from '../utils/storage';

type SortOption = 'date' | 'highest' | 'lowest';

export default function ExpensesScreen() {
  const { data, removeExpense, saving, refreshData } = useBudgetData();
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();
  const { formatCurrency } = useCurrency();
  const toast = useToast();
  const params = useLocalSearchParams<{ showRecurring?: string }>();

  // Ownership filter (existing)
  const [filter, setFilter] = useState<'all' | 'household' | 'personal'>('all');
  const [personFilter, setPersonFilter] = useState<string | null>(null);

  // New: Category + Search filters (persisted)
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>(''); // debounced

  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [extendTarget, setExtendTarget] = useState<{ id: string; endDate?: string } | null>(null);

  // Use ref to track if we've already refreshed on this focus
  const hasRefreshedOnFocus = useRef(false);

  // Load custom categories and persisted filters
  useEffect(() => {
    (async () => {
      const [customs, filters] = await Promise.all([getCustomExpenseCategories(), getExpensesFilters()]);
      setCustomCategories(customs);
      setCategoryFilter(filters.category || null);
      setSearchQuery(filters.search || '');
      setSearchTerm(filters.search || '');
    })();
  }, []);

  // Persist category + search with debounce
  useEffect(() => {
    const t = setTimeout(() => {
      saveExpensesFilters({ category: categoryFilter, search: searchQuery });
    }, 300);
    return () => clearTimeout(t);
  }, [categoryFilter, searchQuery]);

  // Debounce search for filtering perf
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Refresh data when screen comes into focus, but only once per focus
  useFocusEffect(
    useCallback(() => {
      if (!hasRefreshedOnFocus.current) {
        hasRefreshedOnFocus.current = true;
        refreshData(true);
        // Also refresh custom categories (in case new one added)
        getCustomExpenseCategories().then(setCustomCategories).catch((e) => console.log('Failed to refresh custom categories', e));
      }
      return () => {
        hasRefreshedOnFocus.current = false;
      };
    }, [refreshData])
  );

  const availableCategories = (() => {
    // Union of defaults + custom + any tag appearing in expenses (normalized)
    const fromExpenses = new Set<string>();
    data.expenses.forEach((e) => {
      const tag = normalizeCategoryName((e as any).categoryTag || 'Misc');
      if (tag) fromExpenses.add(tag);
    });
    const combined = new Set<string>([...DEFAULT_CATEGORIES, ...customCategories, ...Array.from(fromExpenses)]);
    return Array.from(combined);
  })().sort((a, b) => a.localeCompare(b));

  const announceFilter = (msg: string) => {
    try {
      AccessibilityInfo.announceForAccessibility?.(msg);
    } catch (e) {
      console.log('Accessibility announce failed', e);
    }
  };

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

  const FilterButton = useCallback(
    ({ filterType, label }: { filterType: typeof filter; label: string }) => (
      <TouchableOpacity
        style={[
          themedStyles.badge,
          {
            backgroundColor: filter === filterType ? currentColors.primary : currentColors.border,
            flex: 1,
            marginHorizontal: 4,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
        onPress={() => {
          setFilter(filterType);
          if (filterType !== 'personal') setPersonFilter(null);
        }}
        disabled={saving || deletingExpenseId !== null}
      >
        <Text
          style={[
            themedStyles.badgeText,
            {
              color: filter === filterType ? '#FFFFFF' : currentColors.text,
              fontWeight: '600',
              textAlign: 'center',
              fontSize: 13,
            },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    ),
    [filter, currentColors, saving, deletingExpenseId, themedStyles]
  );

  const SortButton = useCallback(
    ({ sortType, label, icon }: { sortType: SortOption; label: string; icon: string }) => (
      <TouchableOpacity
        style={[
          themedStyles.badge,
          {
            backgroundColor: sortBy === sortType ? currentColors.secondary : currentColors.border,
            marginRight: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            flexDirection: 'row',
            alignItems: 'center',
          },
        ]}
        onPress={() => setSortBy(sortType)}
        disabled={saving || deletingExpenseId !== null}
      >
        <Icon name={icon as any} size={14} style={{ color: sortBy === sortType ? '#FFFFFF' : currentColors.text, marginRight: 4 }} />
        <Text
          style={[
            themedStyles.badgeText,
            {
              color: sortBy === sortType ? '#FFFFFF' : currentColors.text,
              fontWeight: '600',
              fontSize: 12,
            },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    ),
    [sortBy, currentColors, saving, deletingExpenseId, themedStyles]
  );

  // Apply filters
  let filteredExpenses = data.expenses;

  if (filter === 'household') {
    filteredExpenses = filteredExpenses.filter((e) => e.category === 'household');
  } else if (filter === 'personal') {
    filteredExpenses = filteredExpenses.filter((e) => e.category === 'personal');
    if (personFilter) {
      filteredExpenses = filteredExpenses.filter((e) => e.personId === personFilter);
    }
  }

  if (categoryFilter) {
    const selected = normalizeCategoryName(categoryFilter);
    filteredExpenses = filteredExpenses.filter((e) => normalizeCategoryName((e as any).categoryTag || 'Misc') === selected);
  }

  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    filteredExpenses = filteredExpenses.filter((e) => e.description.toLowerCase().includes(q));
  }

  // Sort
  filteredExpenses = filteredExpenses.sort((a, b) => {
    switch (sortBy) {
      case 'highest':
        return b.amount - a.amount;
      case 'lowest':
        return a.amount - b.amount;
      case 'date':
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  const hasActiveFilters = !!categoryFilter || !!searchTerm || (filter !== 'all') || !!personFilter;

  return (
    <View style={themedStyles.container}>
      <StandardHeader title="Expenses" showLeftIcon={false} onRightPress={handleNavigateToAddExpense} loading={saving || deletingExpenseId !== null} />

      {/* Filter block */}
      <View style={[themedStyles.section, { paddingBottom: 0, paddingTop: 12, paddingHorizontal: 12 }]}>
        {/* Search input */}
        <View style={{ marginBottom: 12 }}>
          <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>Search</Text>
          <TextInput
            style={[themedStyles.input, { marginBottom: 0 }]}
            placeholder="Search by description"
            placeholderTextColor={currentColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search expenses"
          />
        </View>

        {/* Ownership filter buttons */}
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <FilterButton filterType="all" label="All Expenses" />
          <FilterButton filterType="household" label="Household" />
          <FilterButton filterType="personal" label="Personal" />
        </View>

        {/* Person filter for personal expenses */}
        {filter === 'personal' && data.people.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ paddingHorizontal: 4, flexDirection: 'row' }}>
              <TouchableOpacity
                style={[
                  themedStyles.badge,
                  {
                    backgroundColor: personFilter === null ? currentColors.secondary : currentColors.border,
                    marginRight: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                  },
                ]}
                onPress={() => setPersonFilter(null)}
                disabled={saving || deletingExpenseId !== null}
              >
                <Text
                  style={[
                    themedStyles.badgeText,
                    { color: personFilter === null ? '#FFFFFF' : currentColors.text, fontWeight: '600', fontSize: 12 },
                  ]}
                >
                  All People
                </Text>
              </TouchableOpacity>

              {data.people.map((person) => (
                <TouchableOpacity
                  key={person.id}
                  style={[
                    themedStyles.badge,
                    {
                      backgroundColor: personFilter === person.id ? currentColors.secondary : currentColors.border,
                      marginRight: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                    },
                  ]}
                  onPress={() => setPersonFilter(person.id)}
                  disabled={saving || deletingExpenseId !== null}
                >
                  <Text
                    style={[
                      themedStyles.badgeText,
                      { color: personFilter === person.id ? '#FFFFFF' : currentColors.text, fontWeight: '600', fontSize: 12 },
                    ]}
                  >
                    {person.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Category chips row */}
        <View style={{ marginBottom: 12 }}>
          <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>Filter by category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 4, flexDirection: 'row' }}>
              <TouchableOpacity
                key="all"
                style={[
                  themedStyles.badge,
                  {
                    backgroundColor: categoryFilter === null ? currentColors.secondary : currentColors.border,
                    marginRight: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                  },
                ]}
                onPress={() => {
                  setCategoryFilter(null);
                  announceFilter('Filter applied: All categories');
                }}
              >
                <Text
                  style={[
                    themedStyles.badgeText,
                    { color: categoryFilter === null ? '#FFFFFF' : currentColors.text, fontWeight: '600', fontSize: 12 },
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>

              {availableCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    themedStyles.badge,
                    {
                      backgroundColor: categoryFilter === cat ? currentColors.secondary : currentColors.border,
                      marginRight: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                    },
                  ]}
                  onPress={() => {
                    setCategoryFilter(cat);
                    announceFilter(`Filter applied: ${cat}`);
                  }}
                  accessibilityLabel={`Filter by category ${cat}${categoryFilter === cat ? ', selected' : ''}`}
                >
                  <Text
                    style={[
                      themedStyles.badgeText,
                      { color: categoryFilter === cat ? '#FFFFFF' : currentColors.text, fontWeight: '600', fontSize: 12 },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Active filter badges + Clear */}
        {hasActiveFilters && (
          <View style={{ marginBottom: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {!!categoryFilter && (
                  <View
                    style={[
                      themedStyles.badge,
                      {
                        backgroundColor: currentColors.secondary + '20',
                        borderRadius: 16,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        marginRight: 8,
                        borderWidth: 1,
                        borderColor: currentColors.secondary,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="pricetag-outline" size={14} style={{ color: currentColors.secondary, marginRight: 6 }} />
                      <Text style={[themedStyles.text, { color: currentColors.secondary, fontSize: 12 }]}>Category: {categoryFilter}</Text>
                      <TouchableOpacity onPress={() => setCategoryFilter(null)} style={{ marginLeft: 8 }}>
                        <Icon name="close-circle" size={16} style={{ color: currentColors.secondary }} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                {!!searchTerm && (
                  <View
                    style={[
                      themedStyles.badge,
                      {
                        backgroundColor: currentColors.primary + '20',
                        borderRadius: 16,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        marginRight: 8,
                        borderWidth: 1,
                        borderColor: currentColors.primary,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="search-outline" size={14} style={{ color: currentColors.primary, marginRight: 6 }} />
                      <Text style={[themedStyles.text, { color: currentColors.primary, fontSize: 12 }]}>Search: “{searchTerm}”</Text>
                      <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginLeft: 8 }}>
                        <Icon name="close-circle" size={16} style={{ color: currentColors.primary }} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => {
                    setCategoryFilter(null);
                    setSearchQuery('');
                    setFilter('all');
                    setPersonFilter(null);
                    announceFilter('Filters cleared');
                  }}
                  style={[
                    themedStyles.badge,
                    { backgroundColor: currentColors.error + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
                  ]}
                >
                  <Text style={[themedStyles.badgeText, { color: currentColors.error, fontSize: 12, fontWeight: '700' }]}>Clear Filters</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Sort options */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 4, flexDirection: 'row' }}>
            <SortButton sortType="date" label="Date" icon="calendar-outline" />
            <SortButton sortType="highest" label="Highest Cost" icon="trending-up-outline" />
            <SortButton sortType="lowest" label="Lowest Cost" icon="trending-down-outline" />
          </View>
        </ScrollView>
      </View>

      <ScrollView style={themedStyles.content} contentContainerStyle={[themedStyles.scrollContent, { paddingHorizontal: 12 }]}>
        {filteredExpenses.length === 0 ? (
          <View style={themedStyles.card}>
            <View style={themedStyles.centerContent}>
              <Icon name="receipt-outline" size={64} style={{ color: currentColors.textSecondary, marginBottom: 16 }} />
              <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 12 }]}>No Expenses Found</Text>
              <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
                {hasActiveFilters
                  ? 'No expenses match your filters. Try clearing filters.'
                  : 'Add your first expense to get started'}
              </Text>
            </View>
          </View>
        ) : (
          filteredExpenses.map((expense) => {
            const person = expense.personId ? data.people.find((p) => p.id === expense.personId) : null;
            const monthlyAmount = calculateMonthlyAmount(expense.amount, expense.frequency);
            const isDeleting = deletingExpenseId === expense.id;
            const tag = normalizeCategoryName((expense as any).categoryTag || 'Misc');

            return (
              <View key={expense.id} style={[themedStyles.card, { marginBottom: 6, padding: 12, opacity: isDeleting ? 0.6 : 1 }]}>
                <TouchableOpacity onPress={() => handleEditExpense(expense)} activeOpacity={0.7} disabled={saving || isDeleting} style={{ flex: 1 }}>
                  {/* Title and amount */}
                  <View style={[themedStyles.row, { marginBottom: 6, alignItems: 'flex-start', paddingRight: 50 }]}>
                    <View style={themedStyles.flex1}>
                      <Text style={[themedStyles.text, { fontWeight: '700', fontSize: 16 }]}>{expense.description}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          themedStyles.text,
                          {
                            fontWeight: '800',
                            color: expense.category === 'household' ? currentColors.household : currentColors.personal,
                            fontSize: 16,
                          },
                        ]}
                      >
                        {formatCurrency(expense.amount)}
                      </Text>
                      <Text style={[themedStyles.textSecondary, { fontSize: 11 }]}>{formatCurrency(monthlyAmount)}/mo</Text>
                    </View>
                  </View>

                  {/* Meta row with ownership badge + date + category tag */}
                  <View style={[themedStyles.row, { alignItems: 'center', paddingRight: 50, flexWrap: 'wrap' }]}>
                    <View
                      style={[
                        themedStyles.badge,
                        {
                          backgroundColor: expense.category === 'household' ? currentColors.household : currentColors.personal,
                          marginRight: 8,
                          marginBottom: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 12,
                        },
                      ]}
                    >
                      <Text style={[themedStyles.badgeText, { color: '#FFFFFF', fontSize: 10, fontWeight: '700' }]}>{expense.category.toUpperCase()}</Text>
                    </View>

                    <View
                      style={[
                        themedStyles.badge,
                        {
                          backgroundColor: currentColors.secondary + '20',
                          marginRight: 8,
                          marginBottom: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: currentColors.secondary,
                        },
                      ]}
                    >
                      <Text style={[themedStyles.text, { color: currentColors.secondary, fontSize: 10, fontWeight: '700' }]}>{tag}</Text>
                    </View>

                    <Text style={[themedStyles.textSecondary, { flex: 1, fontSize: 12 }]}>
                      {expense.category === 'personal' && person ? `${person.name} • ` : ''}
                      {expense.frequency} • {new Date(expense.date).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Delete button */}
                <View style={{ position: 'absolute', top: 8, right: 8, zIndex: 100 }}>
                  <TouchableOpacity
                    onPress={() => handleDeletePress(expense.id, expense.description)}
                    disabled={saving || isDeleting}
                    style={{
                      padding: 8,
                      borderRadius: 20,
                      backgroundColor: currentColors.error + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 36,
                      minHeight: 36,
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {isDeleting ? <ActivityIndicator size="small" color={currentColors.error} /> : <Icon name="trash-outline" size={18} style={{ color: currentColors.error }} />}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
