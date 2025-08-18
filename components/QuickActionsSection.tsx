
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import Icon from './Icon';

export default function QuickActionsSection() {
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();

  const actions = [
    {
      id: 'add-expense',
      title: 'Add Expense',
      subtitle: 'Track new spending',
      icon: 'add-circle',
      color: currentColors.primary,
      onPress: () => router.push('/add-expense'),
    },
    {
      id: 'manage-people',
      title: 'Manage People',
      subtitle: 'Add or edit people',
      icon: 'people',
      color: currentColors.secondary,
      onPress: () => router.push('/people'),
    },
    {
      id: 'view-expenses',
      title: 'View Expenses',
      subtitle: 'Browse all expenses',
      icon: 'list',
      color: currentColors.warning,
      onPress: () => router.push('/expenses'),
    },
    {
      id: 'tools',
      title: 'Financial Tools',
      subtitle: 'Credit card calculator',
      icon: 'calculator',
      color: currentColors.info,
      onPress: () => router.push('/tools'),
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'App preferences',
      icon: 'settings',
      color: currentColors.textSecondary,
      onPress: () => router.push('/settings'),
    },
    {
      id: 'budgets',
      title: 'Switch Budget',
      subtitle: 'Manage budgets',
      icon: 'wallet',
      color: currentColors.household,
      onPress: () => router.push('/budgets'),
    },
  ];

  return (
    <View style={[themedStyles.card, { marginBottom: 0 }]}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            onPress={action.onPress}
            style={[
              themedStyles.card,
              {
                backgroundColor: action.color + '10',
                borderColor: action.color + '30',
                borderWidth: 1,
                width: '48%',
                minHeight: 80,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 0,
              },
            ]}
          >
            <Icon 
              name={action.icon} 
              size={24} 
              style={{ color: action.color, marginBottom: 8 }} 
            />
            <Text style={[
              themedStyles.text, 
              { 
                fontWeight: '700', 
                fontSize: 14, 
                textAlign: 'center',
                marginBottom: 2,
              }
            ]}>
              {action.title}
            </Text>
            <Text style={[
              themedStyles.textSecondary, 
              { 
                fontSize: 11, 
                textAlign: 'center',
              }
            ]}>
              {action.subtitle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
