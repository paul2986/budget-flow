
import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import StandardHeader from '../components/StandardHeader';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useTheme } from '../hooks/useTheme';
import Icon from '../components/Icon';
import { DEFAULT_CATEGORIES } from '../types/budget';
import { getCustomExpenseCategories, saveCustomExpenseCategories, normalizeCategoryName } from '../utils/storage';
import { useBudgetData } from '../hooks/useBudgetData';
import { router } from 'expo-router';

export default function ManageCategoriesScreen() {
  const { themedStyles } = useThemedStyles();
  const { currentColors } = useTheme();
  const { data } = useBudgetData();

  const [customs, setCustoms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getCustomExpenseCategories();
      setCustoms(list);
    } catch (e) {
      console.log('Failed to load custom categories', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isInUse = (category: string): boolean => {
    if (!data?.expenses) return false;
    const normalized = normalizeCategoryName(category);
    return data.expenses.some((e) => normalizeCategoryName((e as any).categoryTag || 'Misc') === normalized);
  };

  const handleDelete = (category: string) => {
    if (isInUse(category)) {
      Alert.alert('Cannot delete', 'This category is currently in use by one or more expenses.');
      return;
    }
    Alert.alert('Delete Category', `Are you sure you want to delete "${category}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const next = customs.filter((c) => c !== category);
            await saveCustomExpenseCategories(next);
            setCustoms(next);
          } catch (e) {
            console.log('Failed to delete custom category', e);
            Alert.alert('Error', 'Failed to delete category. Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={themedStyles.container}>
      <StandardHeader title="Manage Categories" onLeftPress={() => router.back()} showRightIcon={false} />

      <ScrollView style={themedStyles.content} contentContainerStyle={themedStyles.scrollContent}>
        <View style={themedStyles.section}>
          <Text style={themedStyles.subtitle}>Default Categories</Text>
          <View style={themedStyles.card}>
            <Text style={[themedStyles.textSecondary, { marginBottom: 12 }]}>Defaults cannot be deleted.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {DEFAULT_CATEGORIES.map((c) => (
                <View
                  key={c}
                  style={[
                    themedStyles.badge,
                    {
                      backgroundColor: currentColors.border,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      marginRight: 8,
                      marginBottom: 8,
                    },
                  ]}
                >
                  <Text style={[themedStyles.badgeText, { color: currentColors.text, fontSize: 12 }]}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={themedStyles.section}>
          <Text style={themedStyles.subtitle}>Custom Categories</Text>
          <View style={themedStyles.card}>
            {loading ? (
              <Text style={themedStyles.textSecondary}>Loading...</Text>
            ) : customs.length === 0 ? (
              <Text style={themedStyles.textSecondary}>No custom categories yet. You can add them while creating or editing an expense.</Text>
            ) : (
              customs.map((c) => {
                const used = isInUse(c);
                return (
                  <View
                    key={c}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: currentColors.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View
                        style={[
                          themedStyles.badge,
                          {
                            backgroundColor: currentColors.secondary + '20',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 16,
                            marginRight: 12,
                            borderWidth: 1,
                            borderColor: currentColors.secondary,
                          },
                        ]}
                      >
                        <Text style={[themedStyles.text, { color: currentColors.secondary, fontSize: 12, fontWeight: '700' }]}>{c}</Text>
                      </View>
                      {used && <Text style={[themedStyles.textSecondary, { color: currentColors.warning }]}>In use</Text>}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(c)}
                      disabled={used}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        backgroundColor: used ? currentColors.border : currentColors.error + '15',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="trash-outline" size={18} style={{ color: used ? currentColors.textSecondary : currentColors.error, marginRight: 6 }} />
                        <Text style={[themedStyles.text, { color: used ? currentColors.textSecondary : currentColors.error, fontWeight: '700' }]}>Delete</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
