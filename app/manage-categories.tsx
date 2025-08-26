
import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import StandardHeader from '../components/StandardHeader';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useTheme } from '../hooks/useTheme';
import Icon from '../components/Icon';
import { DEFAULT_CATEGORIES } from '../types/budget';
import { getCustomExpenseCategories, saveCustomExpenseCategories, normalizeCategoryName, renameCustomExpenseCategory } from '../utils/storage';
import { useBudgetData } from '../hooks/useBudgetData';
import { router } from 'expo-router';
import Button from '../components/Button';

export default function ManageCategoriesScreen() {
  const { themedStyles } = useThemedStyles();
  const { currentColors } = useTheme();
  const { data, refreshData } = useBudgetData();

  const [customs, setCustoms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [categoryToRename, setCategoryToRename] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [renaming, setRenaming] = useState(false);

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

  // Refresh when data changes (e.g., after clearing all data)
  useEffect(() => {
    refresh();
  }, [data.people.length, data.expenses.length, refresh]);

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

  const handleRename = (category: string) => {
    setCategoryToRename(category);
    setNewCategoryName(category);
    setRenameModalVisible(true);
  };

  const handleRenameSubmit = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Category name cannot be empty.');
      return;
    }

    if (newCategoryName.trim() === categoryToRename) {
      setRenameModalVisible(false);
      return;
    }

    setRenaming(true);
    try {
      const result = await renameCustomExpenseCategory(categoryToRename, newCategoryName.trim());
      
      if (result.success) {
        await refresh();
        await refreshData(); // Refresh budget data to reflect changes in expenses
        setRenameModalVisible(false);
        setCategoryToRename('');
        setNewCategoryName('');
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to rename category. Please try again.');
      }
    } catch (e) {
      console.log('Failed to rename custom category', e);
      Alert.alert('Error', 'Failed to rename category. Please try again.');
    } finally {
      setRenaming(false);
    }
  };

  const handleRenameCancel = () => {
    setRenameModalVisible(false);
    setCategoryToRename('');
    setNewCategoryName('');
  };

  return (
    <View style={themedStyles.container}>
      <StandardHeader 
        title="Manage Categories" 
        onLeftPress={() => router.back()} 
        showRightIcon={false} 
      />

      <ScrollView style={themedStyles.content} contentContainerStyle={[themedStyles.scrollContent, { paddingHorizontal: 0, paddingTop: 16 }]}>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity
                        onPress={() => handleRename(c)}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          backgroundColor: currentColors.primary + '15',
                          marginRight: 8,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Icon name="pencil-outline" size={18} style={{ color: currentColors.primary, marginRight: 6 }} />
                          <Text style={[themedStyles.text, { color: currentColors.primary, fontWeight: '700' }]}>Rename</Text>
                        </View>
                      </TouchableOpacity>
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
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Rename Category Modal */}
      <Modal
        visible={renameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleRenameCancel}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
          }}>
            <View style={[
              themedStyles.card,
              {
                width: '100%',
                maxWidth: 400,
                padding: 24,
                borderRadius: 16,
              }
            ]}>
              <Text style={[themedStyles.title, { marginBottom: 8, textAlign: 'center' }]}>
                Rename Category
              </Text>
              <Text style={[themedStyles.textSecondary, { marginBottom: 20, textAlign: 'center' }]}>
                Enter a new name for "{categoryToRename}"
              </Text>

              <View style={{ marginBottom: 24 }}>
                <Text style={[themedStyles.label, { marginBottom: 8 }]}>Category Name</Text>
                <TextInput
                  style={[
                    themedStyles.input,
                    {
                      borderColor: currentColors.border,
                      borderWidth: 1,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: currentColors.text,
                      backgroundColor: currentColors.background,
                    }
                  ]}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="Enter category name"
                  placeholderTextColor={currentColors.textSecondary}
                  maxLength={20}
                  autoFocus={true}
                  selectTextOnFocus={true}
                />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Button
                  title="Cancel"
                  onPress={handleRenameCancel}
                  variant="secondary"
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Rename"
                  onPress={handleRenameSubmit}
                  loading={renaming}
                  disabled={!newCategoryName.trim() || newCategoryName.trim() === categoryToRename}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
