
import { useState, useEffect, useCallback } from 'react';
import { useBudgetData } from '../hooks/useBudgetData';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useCurrency } from '../hooks/useCurrency';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { Expense, ExpenseCategory, DEFAULT_CATEGORIES } from '../types/budget';
import StandardHeader from '../components/StandardHeader';
import { getCustomExpenseCategories, saveCustomExpenseCategories, normalizeCategoryName } from '../utils/storage';
import DateTimePicker from '@react-native-community/datetimepicker';

const EXPENSE_CATEGORIES: ExpenseCategory[] = DEFAULT_CATEGORIES;

export default function AddExpenseScreen() {
  const { data, addExpense, updateExpense, removeExpense, saving } = useBudgetData();
  const { currentColors } = useTheme();
  const { themedStyles, themedButtonStyles } = useThemedStyles();
  const { formatCurrency } = useCurrency();
  const params = useLocalSearchParams<{ id?: string; origin?: string }>();
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<'household' | 'personal'>('household');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [personId, setPersonId] = useState<string>('');
  const [categoryTag, setCategoryTag] = useState<ExpenseCategory>('Misc');
  const [deleting, setDeleting] = useState(false);

  // Dates
  const toYMD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const [startDateYMD, setStartDateYMD] = useState<string>(toYMD(new Date()));
  const [endDateYMD, setEndDateYMD] = useState<string | ''>('');
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [newCustomName, setNewCustomName] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  const isEditMode = !!params.id;
  const origin = params.origin || 'expenses'; // Default to expenses if no origin specified
  const expenseToEdit = isEditMode ? data.expenses.find(e => e.id === params.id) : null;

  // Load custom categories initially
  useEffect(() => {
    (async () => {
      const list = await getCustomExpenseCategories();
      setCustomCategories(list);
    })();
  }, []);

  // Load expense data for editing
  useEffect(() => {
    if (isEditMode && expenseToEdit && data.people.length >= 0) {
      console.log('AddExpenseScreen: Loading expense for editing:', expenseToEdit);
      setDescription(expenseToEdit.description);
      setAmount(expenseToEdit.amount.toString());
      setCategory(expenseToEdit.category);
      setFrequency(expenseToEdit.frequency as 'daily' | 'weekly' | 'monthly' | 'yearly');
      setPersonId(expenseToEdit.personId || '');
      setNotes(typeof expenseToEdit.notes === 'string' ? expenseToEdit.notes : '');
      const normalized = normalizeCategoryName((expenseToEdit.categoryTag as ExpenseCategory) || 'Misc');
      setCategoryTag(normalized || 'Misc');

      // Dates
      try {
        const d = new Date(expenseToEdit.date);
        if (!isNaN(d.getTime())) setStartDateYMD(toYMD(d));
      } catch (e) {
        console.log('Invalid start date in expense');
      }
      const eY = (expenseToEdit as any).endDate ? String((expenseToEdit as any).endDate).slice(0, 10) : '';
      setEndDateYMD(eY as any);

      // Ensure custom category is in the list if not default
      if (normalized && !DEFAULT_CATEGORIES.includes(normalized) && !customCategories.includes(normalized)) {
        const next = [...customCategories, normalized];
        setCustomCategories(next);
        saveCustomExpenseCategories(next).then(() => console.log('Saved missing custom category from edited expense'));
      }
    } else if (!isEditMode) {
      // Reset form for new expense
      console.log('AddExpenseScreen: Resetting form for new expense');
      setDescription('');
      setAmount('');
      setCategory('household');
      setFrequency('monthly');
      setPersonId('');
      setNotes('');
      setCategoryTag('Misc');
      setStartDateYMD(toYMD(new Date()));
      setEndDateYMD('');
    }
  }, [isEditMode, expenseToEdit, data.people, params.id, customCategories]);

  const navigateToOrigin = useCallback(() => {
    console.log('AddExpenseScreen: Navigating back to origin:', origin);
    
    // Small delay to ensure state is updated before navigation
    setTimeout(() => {
      if (origin === 'home') {
        router.replace('/');
      } else {
        router.replace('/expenses');
      }
    }, 100);
  }, [origin]);

  const handleSaveExpense = useCallback(async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (category === 'personal' && !personId) {
      Alert.alert('Error', 'Please select a person for personal expenses');
      return;
    }

    const normalizedTag = normalizeCategoryName(categoryTag || 'Misc');
    if (!normalizedTag) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    // Validate end date rules for recurring only
    const isRecurring = ['daily', 'weekly', 'monthly', 'yearly'].includes(frequency);
    const endVal = (endDateYMD || '').slice(0, 10);
    if (isRecurring && endVal) {
      const startVal = (startDateYMD || '').slice(0, 10);
      if (endVal < startVal) {
        Alert.alert('Invalid end date', 'End date cannot be earlier than the start date');
        return;
      }
    }

    try {
      const expenseData: Expense = {
        id: isEditMode ? expenseToEdit!.id : `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        description: description.trim(),
        amount: numAmount,
        category,
        frequency,
        personId: category === 'personal' ? personId : undefined,
        date: isEditMode ? expenseToEdit!.date : new Date(startDateYMD + 'T00:00:00Z').toISOString(),
        notes: notes.trim(),
        categoryTag: normalizedTag,
        endDate: isRecurring && endVal ? endVal : undefined,
      };

      console.log('AddExpenseScreen: Saving expense:', expenseData);

      let result;
      if (isEditMode) {
        // If switched to one-time, clear endDate
        if (expenseData.frequency === 'one-time') {
          delete (expenseData as any).endDate;
        }
        result = await updateExpense(expenseData);
        console.log('AddExpenseScreen: Expense updated result:', result);
      } else {
        result = await addExpense(expenseData);
        console.log('AddExpenseScreen: Expense added result:', result);
      }

      if (result && result.success) {
        console.log('AddExpenseScreen: Expense saved successfully, navigating back to origin');
        navigateToOrigin();
      } else {
        console.error('AddExpenseScreen: Expense save failed:', result?.error);
        Alert.alert('Error', result?.error?.message || 'Failed to save expense. Please try again.');
      }
    } catch (error) {
      console.error('AddExpenseScreen: Error saving expense:', error);
      Alert.alert('Error', 'Failed to save expense. Please try again.');
    }
  }, [description, amount, notes, category, frequency, personId, categoryTag, isEditMode, expenseToEdit, addExpense, updateExpense, navigateToOrigin, startDateYMD, endDateYMD]);

  const handleDeleteExpense = useCallback(async () => {
    if (!isEditMode || !expenseToEdit) {
      console.log('AddExpenseScreen: Cannot delete - not in edit mode or no expense to edit');
      return;
    }

    console.log('AddExpenseScreen: Delete expense requested for:', expenseToEdit.id, expenseToEdit.description);

    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete "${expenseToEdit.description}"?`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('AddExpenseScreen: Delete cancelled')
        },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            console.log('AddExpenseScreen: Delete confirmed for expense:', expenseToEdit.id);
            try {
              setDeleting(true);
              const result = await removeExpense(expenseToEdit.id);
              console.log('AddExpenseScreen: Expense deletion result:', result);
              
              if (result && result.success) {
                console.log('AddExpenseScreen: Expense deleted successfully, navigating back to origin');
                navigateToOrigin();
              } else {
                console.error('AddExpenseScreen: Expense deletion failed:', result?.error);
                Alert.alert('Error', result?.error?.message || 'Failed to delete expense. Please try again.');
              }
            } catch (error) {
              console.error('AddExpenseScreen: Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense. Please try again.');
            } finally {
              setDeleting(false);
            }
          }
        },
      ]
    );
  }, [isEditMode, expenseToEdit, removeExpense, navigateToOrigin]);

  const handleGoBack = useCallback(() => {
    router.back();
  }, []);

  const OwnershipPicker = useCallback(() => (
    <View style={[themedStyles.section, { paddingTop: 0 }]}>
      <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>Type</Text>
      <View style={[themedStyles.row, { marginTop: 8 }]}>
        <TouchableOpacity
          style={[
            themedStyles.badge,
            { 
              backgroundColor: category === 'household' ? currentColors.household : currentColors.border,
              marginRight: 12,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 24,
              flex: 1,
            }
          ]}
          onPress={() => {
            setCategory('household');
            setPersonId('');
          }}
          disabled={saving || deleting}
        >
          <Text style={[
            themedStyles.badgeText,
            { 
              color: category === 'household' ? '#FFFFFF' : currentColors.text,
              fontWeight: '600',
              textAlign: 'center',
            }
          ]}>
            Household
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            themedStyles.badge,
            { 
              backgroundColor: category === 'personal' ? currentColors.personal : currentColors.border,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 24,
              flex: 1,
            }
          ]}
          onPress={() => setCategory('personal')}
          disabled={saving || deleting}
        >
          <Text style={[
            themedStyles.badgeText,
            { 
              color: category === 'personal' ? '#FFFFFF' : currentColors.text,
              fontWeight: '600',
              textAlign: 'center',
            }
          ]}>
            Personal
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [category, currentColors, saving, deleting, themedStyles]);

  const CategoryTagPicker = useCallback(() => {
    const allCategories = [...EXPENSE_CATEGORIES, ...customCategories];

    return (
      <View style={themedStyles.section}>
        <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>Category</Text>
        <View style={[themedStyles.row, { marginTop: 8, flexWrap: 'wrap' }]}>
          {allCategories.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[
                themedStyles.badge,
                { 
                  backgroundColor: categoryTag === tag ? currentColors.secondary : currentColors.border,
                  marginRight: 8,
                  marginBottom: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                }
              ]}
              onPress={() => setCategoryTag(tag)}
              disabled={saving || deleting}
              accessibilityHint="Applies a category to this expense"
              accessibilityLabel={`Select category ${tag}${categoryTag === tag ? ', selected' : ''}`}
            >
              <Text style={[
                themedStyles.badgeText,
                { 
                  color: categoryTag === tag ? '#FFFFFF' : currentColors.text,
                  fontWeight: '600',
                }
              ]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Add custom chip */}
          <TouchableOpacity
            key="add_custom"
            style={[
              themedStyles.badge,
              { 
                backgroundColor: currentColors.primary,
                marginRight: 8,
                marginBottom: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
              }
            ]}
            onPress={() => {
              setCustomError(null);
              setNewCustomName('');
              setShowCustomModal(true);
            }}
            disabled={saving || deleting}
            accessibilityLabel="Add custom category"
            accessibilityHint="Opens entry to add a custom category"
          >
            <Text style={[
              themedStyles.badgeText,
              { 
                color: '#FFFFFF',
                fontWeight: '700',
              }
            ]}>
              + Add custom
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [categoryTag, currentColors, saving, deleting, themedStyles, customCategories]);

  const FrequencyPicker = useCallback(() => (
    <View style={themedStyles.section}>
      <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>Frequency</Text>
      <View style={[themedStyles.row, { marginTop: 8, flexWrap: 'wrap' }]}>
        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((freq) => (
          <TouchableOpacity
            key={freq}
            style={[
              themedStyles.badge,
              { 
                backgroundColor: frequency === freq ? currentColors.primary : currentColors.border,
                marginRight: 8,
                marginBottom: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
              }
            ]}
            onPress={() => setFrequency(freq)}
            disabled={saving || deleting}
          >
            <Text style={[
              themedStyles.badgeText,
              { 
                color: frequency === freq ? '#FFFFFF' : currentColors.text,
                fontWeight: '600',
                textTransform: 'capitalize',
              }
            ]}>
              {freq}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  ), [frequency, currentColors, saving, deleting, themedStyles]);

  const PersonPicker = useCallback(() => {
    if (category !== 'personal' || data.people.length === 0) return null;

    return (
      <View style={themedStyles.section}>
        <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>Person</Text>
        <View style={[themedStyles.row, { marginTop: 8, flexWrap: 'wrap' }]}>
          {data.people.map((person) => (
            <TouchableOpacity
              key={person.id}
              style={[
                themedStyles.badge,
                { 
                  backgroundColor: personId === person.id ? currentColors.secondary : currentColors.border,
                  marginRight: 8,
                  marginBottom: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                }
              ]}
              onPress={() => setPersonId(person.id)}
              disabled={saving || deleting}
            >
              <Text style={[
                themedStyles.badgeText,
                { 
                  color: personId === person.id ? '#FFFFFF' : currentColors.text,
                  fontWeight: '600',
                }
              ]}>
                {person.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }, [category, data.people, personId, currentColors, saving, deleting, themedStyles]);

  const handleCreateCustomCategory = useCallback(async () => {
    const normalized = normalizeCategoryName(newCustomName);
    if (!normalized) {
      setCustomError('Please enter a valid name (letters, numbers and spaces)');
      return;
    }
    // Check duplicates (case-insensitive)
    const existsInDefaults = DEFAULT_CATEGORIES.some((c) => c.toLowerCase() === normalized.toLowerCase());
    const existsInCustom = customCategories.some((c) => c.toLowerCase() === normalized.toLowerCase());
    if (existsInDefaults || existsInCustom) {
      setCustomError('That category already exists');
      return;
    }
    try {
      const next = [...customCategories, normalized];
      await saveCustomExpenseCategories(next);
      setCustomCategories(next);
      setCategoryTag(normalized);
      setShowCustomModal(false);
    } catch (e) {
      console.log('Error saving custom category', e);
      setCustomError('Failed to save category. Try again.');
    }
  }, [newCustomName, customCategories]);

  return (
    <View style={themedStyles.container}>
      <StandardHeader
        title={isEditMode ? 'Edit Expense' : 'Add Expense'}
        onLeftPress={handleGoBack}
        rightIcon={isEditMode ? 'checkmark' : 'add'}
        onRightPress={isEditMode ? handleSaveExpense : handleSaveExpense}
        showRightIcon={true}
        loading={(() => {
          const isRecurring = ['daily', 'weekly', 'monthly', 'yearly'].includes(frequency);
          const invalid = isRecurring && !!endDateYMD && endDateYMD < startDateYMD;
          return saving || deleting || invalid;
        })()}
      />

      <ScrollView style={themedStyles.content} contentContainerStyle={[themedStyles.scrollContent, { paddingHorizontal: 16, paddingTop: 16 }]}>
        <View style={themedStyles.section}>
          <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>Description</Text>
          <TextInput
            style={themedStyles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter expense description"
            placeholderTextColor={currentColors.textSecondary}
            editable={!saving && !deleting}
          />
        </View>

        <View style={themedStyles.section}>
          <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>Notes (optional)</Text>
          <TextInput
            style={[themedStyles.input, { minHeight: 84, paddingTop: 12, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add extra details about this expense..."
            placeholderTextColor={currentColors.textSecondary}
            editable={!saving && !deleting}
            multiline
            maxLength={500}
          />
          <Text style={[themedStyles.textSecondary, { textAlign: 'right', marginTop: 4, fontSize: 11 }]}>
            {notes.length}/500
          </Text>
        </View>

        <View style={themedStyles.section}>
          <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>Amount</Text>
          <TextInput
            style={themedStyles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={currentColors.textSecondary}
            keyboardType="numeric"
            editable={!saving && !deleting}
          />
        </View>

        <OwnershipPicker />
        <CategoryTagPicker />
        <FrequencyPicker />

        {/* End date picker for recurring expenses */}
        {(['daily', 'weekly', 'monthly', 'yearly'] as const).includes(frequency) && (
          <View style={themedStyles.section}>
            <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>End date (optional)</Text>
            <View style={[themedStyles.rowStart]}>
              <TouchableOpacity
                onPress={() => setShowEndPicker(true)}
                disabled={saving || deleting}
                style={[
                  themedStyles.badge,
                  { backgroundColor: currentColors.border, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }
                ]}
              >
                <Text style={[themedStyles.badgeText, { color: currentColors.text }]}>
                  {endDateYMD ? endDateYMD : 'Pick date'}
                </Text>
              </TouchableOpacity>
              {endDateYMD ? (
                <TouchableOpacity
                  onPress={() => setEndDateYMD('')}
                  disabled={saving || deleting}
                  style={[
                    themedStyles.badge,
                    { backgroundColor: currentColors.error + '20', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginLeft: 8 }
                  ]}
                >
                  <Text style={[themedStyles.badgeText, { color: currentColors.error }]}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {endDateYMD && endDateYMD < startDateYMD ? (
              <Text style={[themedStyles.textSecondary, { color: currentColors.error, marginTop: 6 }]}>End date cannot be earlier than start date</Text>
            ) : null}
          </View>
        )}

        <PersonPicker />

        {category === 'personal' && data.people.length === 0 && (
          <View style={themedStyles.card}>
            <View style={themedStyles.centerContent}>
              <Icon name="people-outline" size={48} style={{ color: currentColors.textSecondary, marginBottom: 12 }} />
              <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 8 }]}>
                No People Added
              </Text>
              <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
                Add people in the People tab to assign personal expenses
              </Text>
            </View>
          </View>
        )}

        <View style={[themedStyles.section, { paddingTop: 32 }]}>
          <Button
            text={saving ? 'Saving...' : deleting ? 'Deleting...' : (isEditMode ? 'Update Expense' : 'Add Expense')}
            onPress={handleSaveExpense}
            disabled={saving || deleting}
            style={[
              themedButtonStyles.primary,
              { backgroundColor: isEditMode ? '#22C55E' : currentColors.primary },
              (saving || deleting) && { opacity: 0.7 }
            ]}
          />
          
          {/* Delete button for edit mode */}
          {isEditMode && (
            <View style={{ marginTop: 16 }}>
              <Button
                text={deleting ? 'Deleting...' : 'Delete Expense'}
                onPress={() => {
                  console.log('AddExpenseScreen: Bottom delete button pressed');
                  handleDeleteExpense();
                }}
                disabled={saving || deleting}
                style={[
                  themedButtonStyles.primary,
                  { 
                    backgroundColor: currentColors.error,
                    borderColor: currentColors.error,
                  },
                  (saving || deleting) && { opacity: 0.7 }
                ]}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* End date DateTimePicker (native) */}
      {showEndPicker && (
        <DateTimePicker
          value={endDateYMD ? new Date(endDateYMD + 'T00:00:00') : new Date()}
          mode="date"
          display="default"
          onChange={(event: any, selected?: Date) => {
            setShowEndPicker(false);
            if (selected) {
              const ymd = toYMD(selected);
              setEndDateYMD(ymd);
            }
          }}
        />
      )}

      {/* Custom Category Modal */}
      <Modal visible={showCustomModal} animationType="slide" transparent onRequestClose={() => setShowCustomModal(false)}>
        <View style={{
          flex: 1,
          backgroundColor: '#00000055',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}>
          <View style={[themedStyles.card, { width: '100%', maxWidth: 480 }]}>
            <Text style={[themedStyles.subtitle, { marginBottom: 12 }]}>New Category</Text>
            <TextInput
              style={themedStyles.input}
              value={newCustomName}
              onChangeText={(t) => {
                setCustomError(null);
                setNewCustomName(t);
              }}
              placeholder="e.g. Subscriptions"
              placeholderTextColor={currentColors.textSecondary}
              maxLength={20}
            />
            {customError ? (
              <Text style={[themedStyles.textSecondary, { color: currentColors.error, marginBottom: 12 }]}>{customError}</Text>
            ) : null}
            <View style={[themedStyles.row]}>
              <TouchableOpacity
                onPress={() => setShowCustomModal(false)}
                style={[themedStyles.badge, { backgroundColor: currentColors.border, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }]}
              >
                <Text style={[themedStyles.badgeText, { color: currentColors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateCustomCategory}
                style={[themedStyles.badge, { backgroundColor: currentColors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }]}
              >
                <Text style={[themedStyles.badgeText, { color: '#FFFFFF', fontWeight: '700' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
