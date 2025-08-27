
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import Icon from './Icon';
import { DEFAULT_CATEGORIES } from '../types/budget';
import { normalizeCategoryName } from '../utils/storage';

interface ExpenseFilterModalProps {
  visible: boolean;
  onClose: () => void;
  // Filter state
  filter: 'all' | 'household' | 'personal';
  setFilter: (filter: 'all' | 'household' | 'personal') => void;
  personFilter: string | null;
  setPersonFilter: (personId: string | null) => void;
  categoryFilter: string | null;
  setCategoryFilter: (category: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  hasEndDateFilter: boolean;
  setHasEndDateFilter: (hasEndDate: boolean) => void;
  // Data
  people: any[];
  expenses: any[];
  customCategories: string[];
  // Callbacks
  onClearFilters: () => void;
  announceFilter: (msg: string) => void;
}

export default function ExpenseFilterModal({
  visible,
  onClose,
  filter,
  setFilter,
  personFilter,
  setPersonFilter,
  categoryFilter,
  setCategoryFilter,
  searchQuery,
  setSearchQuery,
  hasEndDateFilter,
  setHasEndDateFilter,
  people,
  expenses,
  customCategories,
  onClearFilters,
  announceFilter,
}: ExpenseFilterModalProps) {
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();

  // Local state for temporary filter values (not applied until "Apply Filters" is pressed)
  const [tempFilter, setTempFilter] = useState<'all' | 'household' | 'personal'>('all');
  const [tempPersonFilter, setTempPersonFilter] = useState<string | null>(null);
  const [tempCategoryFilters, setTempCategoryFilters] = useState<string[]>([]);
  const [tempSearchQuery, setTempSearchQuery] = useState<string>('');
  const [tempHasEndDateFilter, setTempHasEndDateFilter] = useState<boolean>(false);

  // Initialize temp state when modal opens
  useEffect(() => {
    if (visible) {
      console.log('ExpenseFilterModal: Initializing temp state with:', {
        filter,
        personFilter,
        categoryFilter,
        searchQuery,
        hasEndDateFilter
      });
      setTempFilter(filter);
      setTempPersonFilter(personFilter);
      setTempCategoryFilters(categoryFilter ? [categoryFilter] : []);
      setTempSearchQuery(searchQuery);
      setTempHasEndDateFilter(hasEndDateFilter);
    }
  }, [visible, filter, personFilter, categoryFilter, searchQuery, hasEndDateFilter]);

  const availableCategories = (() => {
    // Union of defaults + custom + any tag appearing in expenses (normalized)
    const fromExpenses = new Set<string>();
    expenses.forEach((e) => {
      const tag = normalizeCategoryName((e as any).categoryTag || 'Misc');
      if (tag) fromExpenses.add(tag);
    });
    const combined = new Set<string>([...DEFAULT_CATEGORIES, ...customCategories, ...Array.from(fromExpenses)]);
    return Array.from(combined);
  })().sort((a, b) => a.localeCompare(b));

  const hasActiveFilters = tempCategoryFilters.length > 0 || !!tempSearchQuery.trim() || (tempFilter !== 'all') || !!tempPersonFilter || tempHasEndDateFilter;

  const handleCancel = () => {
    // Reset temp state to original values and close without applying
    setTempFilter(filter);
    setTempPersonFilter(personFilter);
    setTempCategoryFilters(categoryFilter ? [categoryFilter] : []);
    setTempSearchQuery(searchQuery);
    setTempHasEndDateFilter(hasEndDateFilter);
    onClose();
  };

  const handleApplyFilters = () => {
    console.log('ExpenseFilterModal: Applying filters:', {
      tempFilter,
      tempPersonFilter,
      tempCategoryFilters,
      tempSearchQuery,
      tempHasEndDateFilter
    });
    
    // Apply the temporary filter values to the actual state
    setFilter(tempFilter);
    setPersonFilter(tempPersonFilter);
    
    // For categories, if multiple selected, we'll apply the first one for now
    // (since the current system only supports single category filter)
    const newCategoryFilter = tempCategoryFilters.length > 0 ? tempCategoryFilters[0] : null;
    setCategoryFilter(newCategoryFilter);
    setSearchQuery(tempSearchQuery);
    setHasEndDateFilter(tempHasEndDateFilter);

    let message = 'Filters applied';
    if (hasActiveFilters) {
      const activeFilters = [];
      if (tempSearchQuery.trim()) activeFilters.push(`search: "${tempSearchQuery.trim()}"`);
      if (tempCategoryFilters.length > 0) activeFilters.push(`categories: ${tempCategoryFilters.join(', ')}`);
      if (tempFilter !== 'all') activeFilters.push(`type: ${tempFilter}`);
      if (tempPersonFilter) {
        const personName = people.find(p => p.id === tempPersonFilter)?.name || 'Unknown';
        activeFilters.push(`person: ${personName}`);
      }
      if (tempHasEndDateFilter) activeFilters.push('has end date');
      message = `Filters applied: ${activeFilters.join(', ')}`;
    } else {
      message = 'No filters applied - showing all expenses';
    }
    announceFilter(message);
    onClose();
  };

  const handleClearFilters = () => {
    console.log('ExpenseFilterModal: Clearing all filters');
    setTempFilter('all');
    setTempPersonFilter(null);
    setTempCategoryFilters([]);
    setTempSearchQuery('');
    setTempHasEndDateFilter(false);
  };

  const handleCategoryToggle = (category: string) => {
    setTempCategoryFilters(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const FilterButton = ({ filterType, label }: { filterType: 'all' | 'household' | 'personal'; label: string }) => {
    const isSelected = tempFilter === filterType;
    
    return (
      <TouchableOpacity
        style={[
          themedStyles.badge,
          {
            backgroundColor: isSelected ? currentColors.primary : currentColors.backgroundAlt,
            flex: 1,
            marginHorizontal: 4,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: isSelected ? 2 : 1,
            borderColor: isSelected ? currentColors.primary : currentColors.border,
            boxShadow: isSelected ? '0px 2px 4px rgba(0,0,0,0.1)' : 'none',
          },
        ]}
        onPress={() => {
          console.log('ExpenseFilterModal: FilterButton pressed:', filterType);
          setTempFilter(filterType);
          if (filterType !== 'personal') {
            setTempPersonFilter(null);
          }
        }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            themedStyles.badgeText,
            {
              color: isSelected ? '#FFFFFF' : currentColors.text,
              fontWeight: '600',
              textAlign: 'center',
              fontSize: 13,
            },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
        {/* Header */}
        <View style={[themedStyles.header, { height: 64, boxShadow: '0px 1px 2px rgba(0,0,0,0.10)' }]}>
          <View style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' }}>
            <TouchableOpacity
              onPress={handleCancel}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: currentColors.border + '40',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Icon name="close" size={24} style={{ color: currentColors.text }} />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={[themedStyles.headerTitle, { textAlign: 'center', lineHeight: 22 }]}>
              Filter & Search
            </Text>
          </View>

          <View style={{ width: 44, height: 44 }}>
            {/* Empty space for symmetry - no clear button here */}
          </View>
        </View>

        <ScrollView style={themedStyles.content} contentContainerStyle={[themedStyles.scrollContent, { paddingHorizontal: 16 }]}>
          {/* Search input */}
          <View style={[themedStyles.section, { paddingBottom: 0 }]}>
            <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600', fontSize: 16 }]}>Search</Text>
            <TextInput
              style={[themedStyles.input, { marginBottom: 0 }]}
              placeholder="Search by description"
              placeholderTextColor={currentColors.textSecondary}
              value={tempSearchQuery}
              onChangeText={setTempSearchQuery}
              accessibilityLabel="Search expenses"
            />
          </View>

          {/* Ownership filter buttons */}
          <View style={[themedStyles.section, { paddingBottom: 0 }]}>
            <Text style={[themedStyles.text, { marginBottom: 12, fontWeight: '600', fontSize: 16 }]}>Expense Type</Text>
            <View style={{ flexDirection: 'row', marginBottom: 0 }}>
              <FilterButton filterType="all" label="All Expenses" />
              <FilterButton filterType="household" label="Household" />
              <FilterButton filterType="personal" label="Personal" />
            </View>
          </View>

          {/* End Date Filter */}
          <View style={[themedStyles.section, { paddingBottom: 0 }]}>
            <Text style={[themedStyles.text, { marginBottom: 12, fontWeight: '600', fontSize: 16 }]}>Expiration</Text>
            <TouchableOpacity
              style={[
                themedStyles.badge,
                {
                  backgroundColor: tempHasEndDateFilter ? currentColors.primary : currentColors.border,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  alignSelf: 'flex-start',
                },
              ]}
              onPress={() => {
                console.log('ExpenseFilterModal: End date filter toggled from', tempHasEndDateFilter, 'to', !tempHasEndDateFilter);
                setTempHasEndDateFilter(!tempHasEndDateFilter);
              }}
            >
              <Icon 
                name={tempHasEndDateFilter ? "checkmark-circle" : "timer-outline"} 
                size={16} 
                style={{ 
                  color: tempHasEndDateFilter ? '#FFFFFF' : currentColors.text,
                  marginRight: 8 
                }} 
              />
              <Text
                style={[
                  themedStyles.badgeText,
                  {
                    color: tempHasEndDateFilter ? '#FFFFFF' : currentColors.text,
                    fontWeight: '600',
                    fontSize: 14,
                  },
                ]}
              >
                Only expenses with end dates
              </Text>
            </TouchableOpacity>
          </View>

          {/* Person filter - now available for all expense types */}
          {people.length > 0 && (
            <View style={[themedStyles.section, { paddingBottom: 0 }]}>
              <Text style={[themedStyles.text, { marginBottom: 12, fontWeight: '600', fontSize: 16 }]}>Person</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ paddingHorizontal: 4, flexDirection: 'row' }}>
                  <TouchableOpacity
                    style={[
                      themedStyles.badge,
                      {
                        backgroundColor: tempPersonFilter === null ? currentColors.secondary : currentColors.border,
                        marginRight: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 16,
                      },
                    ]}
                    onPress={() => setTempPersonFilter(null)}
                  >
                    <Text
                      style={[
                        themedStyles.badgeText,
                        { color: tempPersonFilter === null ? '#FFFFFF' : currentColors.text, fontWeight: '600', fontSize: 13 },
                      ]}
                    >
                      All People
                    </Text>
                  </TouchableOpacity>

                  {people.map((person) => (
                    <TouchableOpacity
                      key={person.id}
                      style={[
                        themedStyles.badge,
                        {
                          backgroundColor: tempPersonFilter === person.id ? currentColors.secondary : currentColors.border,
                          marginRight: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 16,
                        },
                      ]}
                      onPress={() => setTempPersonFilter(person.id)}
                    >
                      <Text
                        style={[
                          themedStyles.badgeText,
                          { color: tempPersonFilter === person.id ? '#FFFFFF' : currentColors.text, fontWeight: '600', fontSize: 13 },
                        ]}
                      >
                        {person.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Category selection - Grid layout for all categories */}
          <View style={[themedStyles.section, { paddingBottom: 0 }]}>
            <Text style={[themedStyles.text, { marginBottom: 12, fontWeight: '600', fontSize: 16 }]}>
              Categories {tempCategoryFilters.length > 0 && `(${tempCategoryFilters.length} selected)`}
            </Text>
            
            {/* All Categories button */}
            <TouchableOpacity
              style={[
                themedStyles.badge,
                {
                  backgroundColor: tempCategoryFilters.length === 0 ? currentColors.secondary : currentColors.border,
                  marginBottom: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 16,
                  alignSelf: 'flex-start',
                },
              ]}
              onPress={() => setTempCategoryFilters([])}
            >
              <Text
                style={[
                  themedStyles.badgeText,
                  { color: tempCategoryFilters.length === 0 ? '#FFFFFF' : currentColors.text, fontWeight: '600', fontSize: 13 },
                ]}
              >
                All Categories
              </Text>
            </TouchableOpacity>

            {/* Category grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
              {availableCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    themedStyles.badge,
                    {
                      backgroundColor: tempCategoryFilters.includes(cat) ? currentColors.secondary : currentColors.border,
                      margin: 4,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                    },
                  ]}
                  onPress={() => handleCategoryToggle(cat)}
                  accessibilityLabel={`Toggle category ${cat}${tempCategoryFilters.includes(cat) ? ', selected' : ''}`}
                >
                  {tempCategoryFilters.includes(cat) && (
                    <Icon name="checkmark" size={14} style={{ color: '#FFFFFF', marginRight: 4 }} />
                  )}
                  <Text
                    style={[
                      themedStyles.badgeText,
                      { color: tempCategoryFilters.includes(cat) ? '#FFFFFF' : currentColors.text, fontWeight: '600', fontSize: 13 },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Active filter summary */}
          {hasActiveFilters && (
            <View style={[themedStyles.section]}>
              <Text style={[themedStyles.text, { marginBottom: 12, fontWeight: '600', fontSize: 16 }]}>Preview Filters</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {tempCategoryFilters.length > 0 && (
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
                        <Text style={[themedStyles.text, { color: currentColors.secondary, fontSize: 12 }]}>
                          {tempCategoryFilters.length === 1 ? tempCategoryFilters[0] : `${tempCategoryFilters.length} categories`}
                        </Text>
                      </View>
                    </View>
                  )}
                  {!!tempSearchQuery.trim() && (
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
                        <Text style={[themedStyles.text, { color: currentColors.primary, fontSize: 12 }]}>Search: "{tempSearchQuery.trim()}"</Text>
                      </View>
                    </View>
                  )}
                  {tempFilter !== 'all' && (
                    <View
                      style={[
                        themedStyles.badge,
                        {
                          backgroundColor: currentColors.household + '20',
                          borderRadius: 16,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          marginRight: 8,
                          borderWidth: 1,
                          borderColor: currentColors.household,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="people-outline" size={14} style={{ color: currentColors.household, marginRight: 6 }} />
                        <Text style={[themedStyles.text, { color: currentColors.household, fontSize: 12 }]}>
                          Type: {tempFilter === 'household' ? 'Household' : 'Personal'}
                        </Text>
                      </View>
                    </View>
                  )}
                  {tempPersonFilter && (
                    <View
                      style={[
                        themedStyles.badge,
                        {
                          backgroundColor: currentColors.personal + '20',
                          borderRadius: 16,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          marginRight: 8,
                          borderWidth: 1,
                          borderColor: currentColors.personal,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="person-outline" size={14} style={{ color: currentColors.personal, marginRight: 6 }} />
                        <Text style={[themedStyles.text, { color: currentColors.personal, fontSize: 12 }]}>
                          Person: {people.find(p => p.id === tempPersonFilter)?.name || 'Unknown'}
                        </Text>
                      </View>
                    </View>
                  )}
                  {tempHasEndDateFilter && (
                    <View
                      style={[
                        themedStyles.badge,
                        {
                          backgroundColor: '#FF9500' + '20',
                          borderRadius: 16,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          marginRight: 8,
                          borderWidth: 1,
                          borderColor: '#FF9500',
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="timer-outline" size={14} style={{ color: '#FF9500', marginRight: 6 }} />
                        <Text style={[themedStyles.text, { color: '#FF9500', fontSize: 12 }]}>
                          Has end date
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          )}
        </ScrollView>

        {/* Bottom action buttons */}
        <View style={[themedStyles.section, { paddingTop: 16, paddingBottom: 32, paddingHorizontal: 16 }]}>
          {/* Clear Filters button - only show when filters are active and position above Apply button */}
          {hasActiveFilters && (
            <TouchableOpacity
              onPress={handleClearFilters}
              style={{
                backgroundColor: currentColors.error + '15',
                borderWidth: 1,
                borderColor: currentColors.error,
                paddingVertical: 14,
                paddingHorizontal: 24,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                marginBottom: 12,
              }}
            >
              <Icon name="refresh-outline" size={20} style={{ color: currentColors.error, marginRight: 8 }} />
              <Text style={[themedStyles.text, { color: currentColors.error, fontWeight: '700', fontSize: 16 }]}>
                Clear Filters
              </Text>
            </TouchableOpacity>
          )}

          {/* Apply Filters button */}
          <TouchableOpacity
            onPress={handleApplyFilters}
            style={{
              backgroundColor: currentColors.primary,
              paddingVertical: 16,
              paddingHorizontal: 24,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              boxShadow: '0px 4px 8px rgba(0,0,0,0.15)',
            }}
          >
            <Icon name="search-outline" size={20} style={{ color: '#FFFFFF', marginRight: 8 }} />
            <Text style={[themedStyles.text, { color: '#FFFFFF', fontWeight: '700', fontSize: 16 }]}>
              {hasActiveFilters ? 'Apply Filters' : 'Show All Expenses'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
