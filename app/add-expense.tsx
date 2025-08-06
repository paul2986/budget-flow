
import { useState, useEffect, useCallback } from 'react';
import { useBudgetData } from '../hooks/useBudgetData';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { commonStyles, buttonStyles } from '../styles/commonStyles';
import { useCurrency } from '../hooks/useCurrency';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { Expense } from '../types/budget';

export default function AddExpenseScreen() {
  const { data, addExpense, updateExpense, removeExpense, saving } = useBudgetData();
  const { currentColors } = useTheme();
  const { formatCurrency } = useCurrency();
  const params = useLocalSearchParams<{ id?: string }>();
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<'household' | 'personal'>('household');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [personId, setPersonId] = useState<string>('');
  const [deleting, setDeleting] = useState(false);

  const isEditMode = !!params.id;
  const expenseToEdit = isEditMode ? data.expenses.find(e => e.id === params.id) : null;

  // Load expense data for editing
  useEffect(() => {
    if (isEditMode && expenseToEdit && data.people.length >= 0) {
      console.log('AddExpenseScreen: Loading expense for editing:', expenseToEdit);
      setDescription(expenseToEdit.description);
      setAmount(expenseToEdit.amount.toString());
      setCategory(expenseToEdit.category);
      setFrequency(expenseToEdit.frequency);
      setPersonId(expenseToEdit.personId || '');
    } else if (!isEditMode) {
      // Reset form for new expense
      console.log('AddExpenseScreen: Resetting form for new expense');
      setDescription('');
      setAmount('');
      setCategory('household');
      setFrequency('monthly');
      setPersonId('');
    }
  }, [isEditMode, expenseToEdit, data.people, params.id]);

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

      if (result.success) {
        console.log('AddExpenseScreen: Expense saved successfully, navigating to expenses page');
        // Navigate to expenses screen to show the newly created/updated expense
        router.replace('/expenses');
      } else {
        Alert.alert('Error', 'Failed to save expense. Please try again.');
      }
    } catch (error) {
      console.error('AddExpenseScreen: Error saving expense:', error);
      Alert.alert('Error', 'Failed to save expense. Please try again.');
    }
  }, [description, amount, category, frequency, personId, isEditMode, expenseToEdit, addExpense, updateExpense]);

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
              
              if (result.success) {
                console.log('AddExpenseScreen: Expense deleted successfully, navigating to expenses page');
                router.replace('/expenses');
              } else {
                console.error('AddExpenseScreen: Expense deletion failed:', result.error);
                Alert.alert('Error', 'Failed to delete expense. Please try again.');
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
  }, [isEditMode, expenseToEdit, removeExpense]);

  const handleGoBack = useCallback(() => {
    router.back();
  }, []);

  const CategoryPicker = useCallback(() => (
    <View style={[commonStyles.section, { paddingTop: 0 }]}>
      <Text style={[commonStyles.label, { color: currentColors.text }]}>Category</Text>
      <View style={[commonStyles.row, { marginTop: 8 }]}>
        <TouchableOpacity
          style={[
            commonStyles.badge,
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
            commonStyles.badgeText,
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
            commonStyles.badge,
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
            commonStyles.badgeText,
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
  ), [category, currentColors, saving, deleting]);

  const FrequencyPicker = useCallback(() => (
    <View style={commonStyles.section}>
      <Text style={[commonStyles.label, { color: currentColors.text }]}>Frequency</Text>
      <View style={[commonStyles.row, { marginTop: 8, flexWrap: 'wrap' }]}>
        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((freq) => (
          <TouchableOpacity
            key={freq}
            style={[
              commonStyles.badge,
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
              commonStyles.badgeText,
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
  ), [frequency, currentColors, saving, deleting]);

  const PersonPicker = useCallback(() => {
    if (category !== 'personal' || data.people.length === 0) return null;

    return (
      <View style={commonStyles.section}>
        <Text style={[commonStyles.label, { color: currentColors.text }]}>Person</Text>
        <View style={[commonStyles.row, { marginTop: 8, flexWrap: 'wrap' }]}>
          {data.people.map((person) => (
            <TouchableOpacity
              key={person.id}
              style={[
                commonStyles.badge,
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
                commonStyles.badgeText,
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
  }, [category, data.people, personId, currentColors, saving, deleting]);

  return (
    <View style={[commonStyles.container, { backgroundColor: currentColors.background }]}>
      <View style={[commonStyles.header, { backgroundColor: currentColors.backgroundAlt, borderBottomColor: currentColors.border }]}>
        <TouchableOpacity 
          onPress={handleGoBack}
          disabled={saving || deleting}
          style={{
            backgroundColor: currentColors.border,
            borderRadius: 20,
            padding: 8,
          }}
        >
          <Icon name="arrow-back" size={20} style={{ color: currentColors.text }} />
        </TouchableOpacity>
        <Text style={[commonStyles.headerTitle, { color: currentColors.text }]}>
          {isEditMode ? 'Edit Expense' : 'Add Expense'}
        </Text>
        {/* Delete button in header for edit mode */}
        {isEditMode ? (
          <TouchableOpacity 
            onPress={() => {
              console.log('AddExpenseScreen: Header delete button pressed');
              handleDeleteExpense();
            }}
            disabled={saving || deleting}
            style={{
              backgroundColor: currentColors.error + '20',
              borderRadius: 20,
              padding: 8,
            }}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={currentColors.error} />
            ) : (
              <Icon name="trash-outline" size={20} style={{ color: currentColors.error }} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <ScrollView style={commonStyles.content} contentContainerStyle={commonStyles.scrollContent}>
        <View style={commonStyles.section}>
          <Text style={[commonStyles.label, { color: currentColors.text }]}>Description</Text>
          <TextInput
            style={[
              commonStyles.input,
              { 
                backgroundColor: currentColors.backgroundAlt,
                borderColor: currentColors.border,
                color: currentColors.text,
              }
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter expense description"
            placeholderTextColor={currentColors.textSecondary}
            editable={!saving && !deleting}
          />
        </View>

        <View style={commonStyles.section}>
          <Text style={[commonStyles.label, { color: currentColors.text }]}>Amount</Text>
          <TextInput
            style={[
              commonStyles.input,
              { 
                backgroundColor: currentColors.backgroundAlt,
                borderColor: currentColors.border,
                color: currentColors.text,
              }
            ]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={currentColors.textSecondary}
            keyboardType="numeric"
            editable={!saving && !deleting}
          />
        </View>

        <CategoryPicker />
        <FrequencyPicker />
        <PersonPicker />

        {category === 'personal' && data.people.length === 0 && (
          <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
            <View style={commonStyles.centerContent}>
              <Icon name="people-outline" size={48} style={{ color: currentColors.textSecondary, marginBottom: 12 }} />
              <Text style={[commonStyles.subtitle, { textAlign: 'center', marginBottom: 8, color: currentColors.text }]}>
                No People Added
              </Text>
              <Text style={[commonStyles.textSecondary, { textAlign: 'center', color: currentColors.textSecondary }]}>
                Add people in the People tab to assign personal expenses
              </Text>
            </View>
          </View>
        )}

        <View style={[commonStyles.section, { paddingTop: 32 }]}>
          <Button
            text={saving ? 'Saving...' : deleting ? 'Deleting...' : (isEditMode ? 'Update Expense' : 'Add Expense')}
            onPress={handleSaveExpense}
            disabled={saving || deleting}
            style={[
              buttonStyles.primary,
              { backgroundColor: currentColors.primary },
              (saving || deleting) && { opacity: 0.7 }
            ]}
          />
          
          {/* Additional delete button for edit mode */}
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
                  buttonStyles.primary,
                  { 
                    backgroundColor: currentColors.error,
                    borderColor: currentColors.error,
                  },
                  (saving || deleting) && { opacity: 0.7 }
                ]}
              />
            </div>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
