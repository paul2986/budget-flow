
import { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { commonStyles, buttonStyles } from '../styles/commonStyles';
import { useBudgetData } from '../hooks/useBudgetData';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../hooks/useCurrency';
import { Income } from '../types/budget';
import Button from '../components/Button';
import Icon from '../components/Icon';

export default function EditIncomeScreen() {
  const [income, setIncome] = useState<Income | null>(null);
  const [editedIncome, setEditedIncome] = useState({
    amount: '',
    label: '',
    frequency: 'monthly' as const,
  });
  
  const { formatCurrency } = useCurrency();
  const { currentColors } = useTheme();
  const params = useLocalSearchParams<{ personId: string; incomeId: string }>();
  const { personId, incomeId } = params;
  
  const { data, updateIncome, removeIncome, saving, refreshData } = useBudgetData();

  // Find the income and person when data changes
  useEffect(() => {
    if (personId && incomeId && data.people.length > 0) {
      const person = data.people.find(p => p.id === personId);
      if (person) {
        const foundIncome = person.income.find(i => i.id === incomeId);
        console.log('EditIncomeScreen: Found income:', foundIncome);
        
        if (foundIncome) {
          setIncome(foundIncome);
          setEditedIncome({
            amount: foundIncome.amount.toString(),
            label: foundIncome.label,
            frequency: foundIncome.frequency,
          });
          console.log('EditIncomeScreen: Updated income state with fresh data');
        } else {
          console.log('EditIncomeScreen: Income not found in data');
          setIncome(null);
        }
      } else {
        console.log('EditIncomeScreen: Person not found in data');
        setIncome(null);
      }
    }
  }, [personId, incomeId, data.people]);

  // Force refresh data when component mounts
  useEffect(() => {
    console.log('EditIncomeScreen: Component mounted, refreshing data...');
    refreshData();
  }, [refreshData]);

  const handleSaveIncome = useCallback(async () => {
    if (!income || !personId) return;

    if (!editedIncome.amount || !editedIncome.label.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const amount = parseFloat(editedIncome.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      console.log('EditIncomeScreen: Saving income:', editedIncome);
      const updates = {
        amount: amount,
        label: editedIncome.label.trim(),
        frequency: editedIncome.frequency,
      };
      
      const result = await updateIncome(personId, income.id, updates);
      if (result.success) {
        console.log('EditIncomeScreen: Income saved successfully, navigating back');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to update income. Please try again.');
      }
    } catch (error) {
      console.error('EditIncomeScreen: Error updating income:', error);
      Alert.alert('Error', 'Failed to update income. Please try again.');
    }
  }, [income, personId, editedIncome, updateIncome]);

  const handleDeleteIncome = useCallback(() => {
    if (!income || !personId) return;

    Alert.alert(
      'Delete Income',
      `Are you sure you want to delete "${income.label}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('EditIncomeScreen: Deleting income:', income.id);
              const result = await removeIncome(personId, income.id);
              if (result.success) {
                console.log('EditIncomeScreen: Income deleted successfully, navigating back');
                router.back();
              } else {
                Alert.alert('Error', 'Failed to delete income. Please try again.');
              }
            } catch (error) {
              console.error('EditIncomeScreen: Error deleting income:', error);
              Alert.alert('Error', 'Failed to delete income. Please try again.');
            }
          }
        },
      ]
    );
  }, [income, personId, removeIncome]);

  const FrequencyPicker = ({ value, onChange }: { value: string, onChange: (value: string) => void }) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
      {['daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
        <TouchableOpacity
          key={freq}
          style={[
            commonStyles.badge,
            { 
              backgroundColor: value === freq ? currentColors.primary : currentColors.border,
              marginRight: 8,
              marginBottom: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }
          ]}
          onPress={() => onChange(freq)}
          disabled={saving}
        >
          <Text style={[
            commonStyles.badgeText,
            { color: value === freq ? currentColors.backgroundAlt : currentColors.text }
          ]}>
            {freq.charAt(0).toUpperCase() + freq.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (!income) {
    return (
      <View style={[commonStyles.container, { backgroundColor: currentColors.background }]}>
        <View style={[commonStyles.header, { backgroundColor: currentColors.backgroundAlt, borderBottomColor: currentColors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="arrow-back" size={24} style={{ color: currentColors.text }} />
          </TouchableOpacity>
          <Text style={[commonStyles.headerTitle, { color: currentColors.text }]}>Edit Income</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={[commonStyles.centerContent, { flex: 1 }]}>
          <Text style={[commonStyles.text, { color: currentColors.textSecondary }]}>Income not found</Text>
        </View>
      </View>
    );
  }

  const person = data.people.find(p => p.id === personId);

  return (
    <View style={[commonStyles.container, { backgroundColor: currentColors.background }]}>
      <View style={[commonStyles.header, { backgroundColor: currentColors.backgroundAlt, borderBottomColor: currentColors.border }]}>
        <TouchableOpacity onPress={() => router.back()} disabled={saving}>
          <Icon name="arrow-back" size={24} style={{ color: currentColors.text }} />
        </TouchableOpacity>
        <Text style={[commonStyles.headerTitle, { color: currentColors.text }]}>Edit Income</Text>
        <TouchableOpacity onPress={handleDeleteIncome} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={currentColors.error} />
          ) : (
            <Icon name="trash-outline" size={24} style={{ color: currentColors.error }} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={commonStyles.content} contentContainerStyle={commonStyles.scrollContent}>
        {/* Income Details */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { color: currentColors.text, marginBottom: 12 }]}>
            Edit Income for {person?.name}
          </Text>
          
          <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600', color: currentColors.text }]}>
            Income Source:
          </Text>
          <TextInput
            style={[commonStyles.input, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border, color: currentColors.text }]}
            value={editedIncome.label}
            onChangeText={(text) => setEditedIncome({ ...editedIncome, label: text })}
            placeholder="e.g., Salary, Freelance, Side Job"
            placeholderTextColor={currentColors.textSecondary}
            editable={!saving}
          />
          
          <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600', color: currentColors.text }]}>
            Amount:
          </Text>
          <TextInput
            style={[commonStyles.input, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border, color: currentColors.text }]}
            value={editedIncome.amount}
            onChangeText={(text) => setEditedIncome({ ...editedIncome, amount: text })}
            placeholder="0.00"
            placeholderTextColor={currentColors.textSecondary}
            keyboardType="numeric"
            editable={!saving}
          />
          
          <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600', color: currentColors.text }]}>
            Frequency:
          </Text>
          <FrequencyPicker
            value={editedIncome.frequency}
            onChange={(freq) => setEditedIncome({ ...editedIncome, frequency: freq as any })}
          />
        </View>

        {/* Current Income Preview */}
        <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
          <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: 8, color: currentColors.text }]}>
            Current Income Details:
          </Text>
          <Text style={[commonStyles.text, { color: currentColors.textSecondary, marginBottom: 4 }]}>
            Source: {income.label}
          </Text>
          <Text style={[commonStyles.text, { color: currentColors.textSecondary, marginBottom: 4 }]}>
            Amount: {formatCurrency(income.amount)}
          </Text>
          <Text style={[commonStyles.text, { color: currentColors.textSecondary }]}>
            Frequency: {income.frequency}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
          <View style={{ flex: 1 }}>
            <Button
              text="Cancel"
              onPress={() => router.back()}
              style={[buttonStyles.outline, { marginTop: 0, borderColor: currentColors.textSecondary }]}
              textStyle={{ color: currentColors.textSecondary }}
              disabled={saving}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              text={saving ? 'Saving...' : 'Save Changes'}
              onPress={handleSaveIncome}
              style={[buttonStyles.primary, { marginTop: 0, backgroundColor: saving ? currentColors.textSecondary : currentColors.income }]}
              disabled={saving}
            />
          </View>
        </View>

        {/* Delete Button */}
        <View style={{ marginTop: 24 }}>
          <Button
            text={saving ? 'Deleting...' : 'Delete Income Source'}
            onPress={handleDeleteIncome}
            style={[
              buttonStyles.outline, 
              { 
                marginTop: 0, 
                borderColor: currentColors.error,
                backgroundColor: saving ? currentColors.textSecondary + '20' : 'transparent'
              }
            ]}
            textStyle={{ color: saving ? currentColors.textSecondary : currentColors.error }}
            disabled={saving}
          />
        </View>
      </ScrollView>
    </View>
  );
}
