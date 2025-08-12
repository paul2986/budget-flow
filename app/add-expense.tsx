
import { useState, useEffect, useCallback } from 'react';
import { useBudgetData } from '../hooks/useBudgetData';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useCurrency } from '../hooks/useCurrency';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { Expense, ExpenseCategory } from '../types/budget';
import StandardHeader from '../components/StandardHeader';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Housing',
  'Transportation',
  'Entertainment',
  'Utilities',
  'Healthcare',
  'Clothing',
  'Misc',
];

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

  const isEditMode = !!params.id;
  const origin = params.origin || 'expenses'; // Default to expenses if no origin specified
  const expenseToEdit = isEditMode ? data.expenses.find(e => e.id === params.id) : null;

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
      setCategoryTag((expenseToEdit.categoryTag as ExpenseCategory) || 'Misc');
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
    }
  }, [isEditMode, expenseToEdit, data.people, params.id]);

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

    try {
      const expenseData: Expense = {
        id: isEditMode ? expenseToEdit!.id : `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        description: description.trim(),
        amount: numAmount,
        category,
        frequency,
        personId: category === 'personal' ? personId : undefined,
        date: isEditMode ? expenseToEdit!.date : new Date().toISOString(),
        notes: notes.trim(),
        categoryTag,
      };

      console.log('AddExpenseScreen: Saving expense:', expenseData);

      let result;
      if (isEditMode) {
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
  }, [description, amount, notes, category, frequency, personId, categoryTag, isEditMode, expenseToEdit, addExpense, updateExpense, navigateToOrigin]);

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

  const CategoryTagPicker = useCallback(() => (
    <View style={themedStyles.section}>
      <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>Category</Text>
      <View style={[themedStyles.row, { marginTop: 8, flexWrap: 'wrap' }]}>
        {EXPENSE_CATEGORIES.map((tag) => (
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
      </View>
    </View>
  ), [categoryTag, currentColors, saving, deleting, themedStyles]);

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

  return (
    <View style={themedStyles.container}>
      <StandardHeader
        title={isEditMode ? 'Edit Expense' : 'Add Expense'}
        onLeftPress={handleGoBack}
        rightIcon={isEditMode ? 'checkmark' : 'add'}
        onRightPress={isEditMode ? handleSaveExpense : handleSaveExpense}
        showRightIcon={true}
        loading={saving || deleting}
      />

      <ScrollView style={themedStyles.content} contentContainerStyle={themedStyles.scrollContent}>
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
    </View>
  );
}
