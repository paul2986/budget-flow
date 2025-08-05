
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import { useBudgetData } from '../hooks/useBudgetData';
import { Expense } from '../types/budget';
import Button from '../components/Button';
import Icon from '../components/Icon';

export default function AddExpenseScreen() {
  const { data, addExpense } = useBudgetData();
  const [expense, setExpense] = useState({
    amount: '',
    description: '',
    category: 'personal' as 'household' | 'personal',
    frequency: 'monthly' as const,
    personId: data.people[0]?.id || '',
  });

  const handleAddExpense = async () => {
    if (!expense.amount || !expense.description.trim()) {
      Alert.alert('Error', 'Please fill in amount and description');
      return;
    }

    if (expense.category === 'personal' && !expense.personId) {
      Alert.alert('Error', 'Please select a person for personal expenses');
      return;
    }

    const newExpense: Expense = {
      id: Date.now().toString(),
      amount: parseFloat(expense.amount),
      description: expense.description.trim(),
      category: expense.category,
      frequency: expense.frequency,
      personId: expense.category === 'personal' ? expense.personId : undefined,
      date: new Date().toISOString(),
    };

    await addExpense(newExpense);
    
    Alert.alert(
      'Success',
      'Expense added successfully!',
      [
        { text: 'Add Another', onPress: () => {
          setExpense({
            amount: '',
            description: '',
            category: 'personal',
            frequency: 'monthly',
            personId: data.people[0]?.id || '',
          });
        }},
        { text: 'Go Home', onPress: () => router.push('/') },
      ]
    );
  };

  const CategoryPicker = () => (
    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
      <TouchableOpacity
        style={[
          commonStyles.badge,
          { 
            backgroundColor: expense.category === 'household' ? colors.household : colors.border,
            marginRight: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
            flex: 1,
            alignItems: 'center',
          }
        ]}
        onPress={() => setExpense({ ...expense, category: 'household', personId: '' })}
      >
        <Text style={[
          commonStyles.badgeText,
          { color: expense.category === 'household' ? colors.backgroundAlt : colors.text }
        ]}>
          Household
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          commonStyles.badge,
          { 
            backgroundColor: expense.category === 'personal' ? colors.personal : colors.border,
            paddingHorizontal: 16,
            paddingVertical: 10,
            flex: 1,
            alignItems: 'center',
          }
        ]}
        onPress={() => setExpense({ ...expense, category: 'personal', personId: data.people[0]?.id || '' })}
      >
        <Text style={[
          commonStyles.badgeText,
          { color: expense.category === 'personal' ? colors.backgroundAlt : colors.text }
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
              backgroundColor: expense.frequency === freq ? colors.primary : colors.border,
              marginRight: 8,
              marginBottom: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }
          ]}
          onPress={() => setExpense({ ...expense, frequency: freq as any })}
        >
          <Text style={[
            commonStyles.badgeText,
            { color: expense.frequency === freq ? colors.backgroundAlt : colors.text }
          ]}>
            {freq === 'one-time' ? 'One-time' : freq.charAt(0).toUpperCase() + freq.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const PersonPicker = () => {
    if (expense.category !== 'personal' || data.people.length === 0) return null;

    return (
      <View style={{ marginBottom: 12 }}>
        <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
          Select Person:
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {data.people.map((person) => (
            <TouchableOpacity
              key={person.id}
              style={[
                commonStyles.badge,
                { 
                  backgroundColor: expense.personId === person.id ? colors.personal : colors.border,
                  marginRight: 8,
                  marginBottom: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }
              ]}
              onPress={() => setExpense({ ...expense, personId: person.id })}
            >
              <Text style={[
                commonStyles.badgeText,
                { color: expense.personId === person.id ? colors.backgroundAlt : colors.text }
              ]}>
                {person.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} style={{ color: colors.text }} />
        </TouchableOpacity>
        <Text style={commonStyles.headerTitle}>Add Expense</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={commonStyles.content} contentContainerStyle={commonStyles.scrollContent}>
        <View style={commonStyles.card}>
          <Text style={[commonStyles.subtitle, { marginBottom: 16 }]}>Expense Details</Text>
          
          <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
            Description:
          </Text>
          <TextInput
            style={commonStyles.input}
            placeholder="What is this expense for?"
            value={expense.description}
            onChangeText={(text) => setExpense({ ...expense, description: text })}
            autoFocus
          />
          
          <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
            Amount:
          </Text>
          <TextInput
            style={commonStyles.input}
            placeholder="0.00"
            value={expense.amount}
            onChangeText={(text) => setExpense({ ...expense, amount: text })}
            keyboardType="numeric"
          />
          
          <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
            Category:
          </Text>
          <CategoryPicker />
          
          <PersonPicker />
          
          <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
            Frequency:
          </Text>
          <FrequencyPicker />
          
          {data.people.length === 0 && (
            <View style={[commonStyles.card, { backgroundColor: colors.warning + '20', marginBottom: 16 }]}>
              <Text style={[commonStyles.text, { color: colors.warning, textAlign: 'center' }]}>
                ⚠️ No people added yet. Add people first to track personal expenses.
              </Text>
              <Button
                text="Manage People"
                onPress={() => router.push('/people')}
                style={[buttonStyles.outline, { borderColor: colors.warning, marginTop: 8 }]}
                textStyle={{ color: colors.warning }}
              />
            </View>
          )}
          
          <Button
            text="Add Expense"
            onPress={handleAddExpense}
            style={[buttonStyles.primary, { backgroundColor: colors.expense }]}
          />
        </View>
      </ScrollView>
    </View>
  );
}
