
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
  people,
  expenses,
  customCategories,
  onClearFilters,
  announceFilter,
}: ExpenseFilterModalProps) {
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();

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

  const hasActiveFilters = !!categoryFilter || !!searchQuery.trim() || (filter !== 'all') || !!personFilter;

  const FilterButton = ({ filterType, label }: { filterType: typeof filter; label: string }) => (
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
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
        {/* Header */}
        <View style={[themedStyles.header, { height: 64, boxShadow: '0px 1px 2px rgba(0,0,0,0.10)' }]}>
          <View style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' }}>
            <TouchableOpacity
              onPress={onClose}
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

          <View style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-end' }}>
            {hasActiveFilters && (
              <TouchableOpacity
                onPress={() => {
                  onClearFilters();
                  announceFilter('Filters cleared');
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor: currentColors.error + '15',
                }}
              >
                <Text style={[themedStyles.text, { color: currentColors.error, fontSize: 12, fontWeight: '700' }]}>
                  Clear
                </Text>
              </TouchableOpacity>
            )}
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
              value={searchQuery}
              onChangeText={setSearchQuery}
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

          {/* Person filter for personal expenses */}
          {filter === 'personal' && people.length > 0 && (
            <View style={[themedStyles.section, { paddingBottom: 0 }]}>
              <Text style={[themedStyles.text, { marginBottom: 12, fontWeight: '600', fontSize: 16 }]}>Person</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ paddingHorizontal: 4, flexDirection: 'row' }}>
                  <TouchableOpacity
                    style={[
                      themedStyles.badge,
                      {
                        backgroundColor: personFilter === null ? currentColors.secondary : currentColors.border,
                        marginRight: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 16,
                      },
                    ]}
                    onPress={() => setPersonFilter(null)}
                  >
                    <Text
                      style={[
                        themedStyles.badgeText,
                        { color: personFilter === null ? '#FFFFFF' : currentColors.text, fontWeight: '600', fontSize: 13 },
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
                          backgroundColor: personFilter === person.id ? currentColors.secondary : currentColors.border,
                          marginRight: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 16,
                        },
                      ]}
                      onPress={() => setPersonFilter(person.id)}
                    >
                      <Text
                        style={[
                          themedStyles.badgeText,
                          { color: personFilter === person.id ? '#FFFFFF' : currentColors.text, fontWeight: '600', fontSize: 13 },
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

          {/* Category chips */}
          <View style={[themedStyles.section, { paddingBottom: 0 }]}>
            <Text style={[themedStyles.text, { marginBottom: 12, fontWeight: '600', fontSize: 16 }]}>Category</Text>
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
                      paddingVertical: 8,
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
                      { color: categoryFilter === null ? '#FFFFFF' : currentColors.text, fontWeight: '600', fontSize: 13 },
                    ]}
                  >
                    All Categories
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
                        paddingVertical: 8,
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
                        { color: categoryFilter === cat ? '#FFFFFF' : currentColors.text, fontWeight: '600', fontSize: 13 },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Active filter summary */}
          {hasActiveFilters && (
            <View style={[themedStyles.section]}>
              <Text style={[themedStyles.text, { marginBottom: 12, fontWeight: '600', fontSize: 16 }]}>Active Filters</Text>
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
                  {!!searchQuery.trim() && (
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
                        <Text style={[themedStyles.text, { color: currentColors.primary, fontSize: 12 }]}>Search: "{searchQuery.trim()}"</Text>
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginLeft: 8 }}>
                          <Icon name="close-circle" size={16} style={{ color: currentColors.primary }} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  {filter !== 'all' && (
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
                          Type: {filter === 'household' ? 'Household' : 'Personal'}
                        </Text>
                        <TouchableOpacity onPress={() => setFilter('all')} style={{ marginLeft: 8 }}>
                          <Icon name="close-circle" size={16} style={{ color: currentColors.household }} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  {personFilter && (
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
                          Person: {people.find(p => p.id === personFilter)?.name || 'Unknown'}
                        </Text>
                        <TouchableOpacity onPress={() => setPersonFilter(null)} style={{ marginLeft: 8 }}>
                          <Icon name="close-circle" size={16} style={{ color: currentColors.personal }} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
