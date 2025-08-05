
import { useState, useEffect } from 'react';
import { commonStyles, buttonStyles } from '../styles/commonStyles';
import { Expense } from '../types/budget';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useBudgetData } from '../hooks/useBudgetData';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../hooks/useCurrency';
import Icon from '../components/Icon';
import { router, useLocalSearchParams } from 'expo-router';
import Button from '../components/Button';

export default function AddExpenseScreen() {
  const { data, addExpense, updateExpense } = useBudgetData();
  const { currentColors } = useTheme();
  const { formatCurrency } = useCurrency();
  const params = useLocalSearchParams<{ id?: string }>();
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<'household' | 'personal'>('household');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'one-time'>('monthly');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  
  const isEditMode = !!params.id;
  const expenseToEdit = data.expenses.find(e => e.id === params.id);

  useEffect(() => {
    console.log('AddExpenseScreen: Edit mode:', isEditMode);
    console.log('AddExpenseScreen: Expense ID:', params.id);
    console.log('AddExpenseScreen: Found expense:', expenseToEdit);
    
    if (isEditMode && expenseToEdit) {
      console.log('AddExpenseScreen: Pre-filling form with expense data');
      setDescription(expenseToEdit.description);
      setAmount(expenseToEdit.amount.toString());
      setCategory(expenseToEdit.category);
      setFrequency(expenseToEdit.frequency);
      setSelectedPersonId(expenseToEdit.personId || '');
    } else if (isEditMode && !expenseToEdit) {
      console.log('AddExpenseScreen: Expense not found for editing');
      Alert.alert('Error', 'Expense not found', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  }, [isEditMode, expenseToEdit, data.people, params.id]);

  const handleSaveExpense = async () => {
    console.log('AddExpenseScreen: Save expense button pressed');
    console.log('AddExpenseScreen: Form data:', { description, amount, category, frequency, selectedPersonId });
    
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    if (category === 'personal' && !selectedPersonId) {
      Alert.alert('Error', 'Please select a person for personal expenses');
      return;
    }

    try {
      const expenseData: Expense = {
        id: isEditMode ? params.id! : `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        description: description.trim(),
        amount: numAmount,
        category,
        frequency,
        personId: category === 'personal' ? selectedPersonId : undefined,
        date: isEditMode ? expenseToEdit!.date : new Date().toISOString(),
      };

      console.log('AddExpenseScreen: Saving expense:', expenseData);
      
      if (isEditMode) {
        await updateExpense(expenseData);
        console.log('AddExpenseScreen: Expense updated successfully');
        Alert.alert('Success', 'Expense updated successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        await addExpense(expenseData);
        console.log('AddExpenseScreen: Expense added successfully');
        Alert.alert('Success', 'Expense added successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      console.error('AddExpenseScreen: Error saving expense:', error);
      Alert.alert('Error', 'Failed to save expense. Please try again.');
    }
  };

  const CategoryPicker = () => (
    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
      <TouchableOpacity
        style={[
          commonStyles.badge,
          { 
            backgroundColor: category === 'household' ? currentColors.household : currentColors.border,
            marginRight: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flex: 1,
            alignItems: 'center',
          }
        ]}
        onPress={() => {
          setCategory('household');
          setSelectedPersonId('');
        }}
      >
        <Text style={[
          commonStyles.badgeText,
          { color: category === 'household' ? currentColors.backgroundAlt : currentColors.text }
        ]}>
          Household
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          commonStyles.badge,
          { 
            backgroundColor: category === 'personal' ? currentColors.personal : currentColors.border,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flex: 1,
            alignItems: 'center',
          }
        ]}
        onPress={() => setCategory('personal')}
      >
        <Text style={[
          commonStyles.badgeText,
          { color: category === 'personal' ? currentColors.backgroundAlt : currentColors.text }
        ]}>
          Personal
        </Text>
      </TouchableOpacity>
    </View>
  );

  const FrequencyPicker = () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
      {['daily', 'weekly', 'monthly', 'yearly', 'one-time'].map((freq) => (
        <TouchableOpacity
          key={freq}
          style={[
            commonStyles.badge,
            { 
              backgroundColor: frequency === freq ? currentColors.primary : currentColors.border,
              marginRight: 8,
              marginBottom: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }
          ]}
          onPress={() => setFrequency(freq as any)}
        >
          <Text style={[
            commonStyles.badgeText,
            { color: frequency === freq ? currentColors.backgroundAlt : currentColors.text }
          ]}>
            {freq.charAt(0).toUpperCase() + freq.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const PersonPicker = () => {
    if (category !== 'personal') return null;
    
    return (
      <View style={{ marginBottom: 12 }}>
        <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600', color: currentColors.text }]}>
          Select Person:
        </Text>
        
        {data.people.length === 0 ? (
          <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
            <Text style={[commonStyles.textSecondary, { textAlign: 'center', color: currentColors.textSecondary }]}>
              No people added yet. Add people first to assign personal expenses.
            </Text>
            <Button
              text="Add People"
              onPress={() => router.push('/people')}
              style={[buttonStyles.primary, { backgroundColor: currentColors.secondary, marginTop: 12 }]}
            />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {data.people.map((person) => (
              <TouchableOpacity
                key={person.id}
                style={[
                  commonStyles.badge,
                  { 
                    backgroundColor: selectedPersonId === person.id ? currentColors.primary : currentColors.border,
                    marginRight: 8,
                    marginBottom: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }
                ]}
                onPress={() => setSelectedPersonId(person.id)}
              >
                <Text style={[
                  commonStyles.badgeText,
                  { color: selectedPersonId === person.id ? currentColors.backgroundAlt : currentColors.text }
                ]}>
                  {person.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[commonStyles.container, { backgroundColor: currentColors.background }]}>
      <View style={[commonStyles.header, { backgroundColor: currentColors.backgroundAlt, borderBottomColor: currentColors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} style={{ color: currentColors.text }} />
        </TouchableOpacity>
        <Text style={[commonStyles.headerTitle, { color: currentColors.text }]}>
          {isEditMode ? 'Edit Expense' : 'Add Expense'}
        </Text>
        <TouchableOpacity onPress={handleSaveExpense}>
          <Icon name="checkmark" size={24} style={{ color: currentColors.primary }} />
        </TouchableOpacity>
      </View>

      <ScrollView style={commonStyles.content} contentContainerStyle={commonStyles.scrollContent}>
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { color: currentColors.text }]}>
            {isEditMode ? 'Edit Expense Details' : 'Expense Details'}
          </Text>
          
          <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
            <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600', color: currentColors.text }]}>
              Description:
            </Text>
            <TextInput
              style={[commonStyles.input, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border, color: currentColors.text }]}
              placeholder="What did you spend money on?"
              placeholderTextColor={currentColors.textSecondary}
              value={description}
              onChangeText={setDescription}
              autoFocus={!isEditMode}
            />
            
            <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600', color: currentColors.text }]}>
              Amount:
            </Text>
            <TextInput
              style={[commonStyles.input, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border, color: currentColors.text }]}
              placeholder="0.00"
              placeholderTextColor={currentColors.textSecondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
            
            <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600', color: currentColors.text }]}>
              Category:
            </Text>
            <CategoryPicker />
            
            <PersonPicker />
            
            <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600', color: currentColors.text }]}>
              Frequency:
            </Text>
            <FrequencyPicker />
          </View>
        </View>

        <View style={commonStyles.section}>
          <Button
            text={isEditMode ? 'Update Expense' : 'Add Expense'}
            onPress={handleSaveExpense}
            style={[buttonStyles.primary, { backgroundColor: currentColors.primary }]}
          />
          
          <Button
            text="Cancel"
            onPress={() => router.back()}
            style={[buttonStyles.outline, { borderColor: currentColors.textSecondary, marginTop: 12 }]}
            textStyle={{ color: currentColors.textSecondary }}
          />
        </View>
      </ScrollView>
    </View>
  );
}
