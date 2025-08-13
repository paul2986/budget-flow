
import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useBudgetData } from '../hooks/useBudgetData';
import { useTheme } from '../hooks/useTheme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import StandardHeader from '../components/StandardHeader';
import Icon from '../components/Icon';
import { useToast } from '../hooks/useToast';
import { Budget } from '../types/budget';
import { loadAppData, saveAppData } from '../utils/storage';

export default function BudgetsScreen() {
  const { appData, setActiveBudget, addBudget, renameBudget, deleteBudget, refreshData } = useBudgetData();
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();
  const { showToast } = useToast();

  const [creating, setCreating] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [cloneValue, setCloneValue] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingCreate, setPendingCreate] = useState(false);

  // Memoize budgets to satisfy exhaustive-deps and avoid changing reference on every render
  const budgets = useMemo(() => (appData && Array.isArray(appData.budgets) ? appData.budgets : []), [appData]);
  const activeId = appData?.activeBudgetId;

  const sortedBudgets = useMemo(() => {
    return [...budgets].sort((a, b) => {
      const aTime = typeof a.createdAt === 'number' ? a.createdAt : Number(a.createdAt);
      const bTime = typeof b.createdAt === 'number' ? b.createdAt : Number(b.createdAt);
      return bTime - aTime;
    });
  }, [budgets]);

  const handleRowPress = useCallback(async (id: string) => {
    if (pendingId) return;
    try {
      setPendingId(id);
      const res = await setActiveBudget(id);
      if (res.success) {
        // Do not show success toast when switching budgets (as requested)
        router.back();
      } else {
        showToast('Failed to set active budget', 'error');
      }
    } catch (e) {
      console.log('Budgets: error setting active', e);
      showToast('Failed to set active budget', 'error');
    } finally {
      setPendingId(null);
    }
  }, [pendingId, setActiveBudget, showToast]);

  const handleCreatePress = useCallback(() => {
    setCreating((v) => !v);
    setNewBudgetName('');
  }, []);

  const handleCreateSubmit = useCallback(async () => {
    if (!newBudgetName.trim()) {
      Alert.alert('Name required', 'Please enter a budget name.');
      return;
    }
    try {
      setPendingCreate(true);
      const res = await addBudget(newBudgetName.trim());
      if (res.success && res.budget) {
        await refreshData(true);
        showToast(`Created "${res.budget.name}"`, 'success');
        router.back();
      } else {
        showToast('Failed to create budget', 'error');
      }
    } catch (e) {
      console.log('Budgets: error creating budget', e);
      showToast('Failed to create budget', 'error');
    } finally {
      setPendingCreate(false);
      setCreating(false);
      setNewBudgetName('');
    }
  }, [newBudgetName, addBudget, refreshData, showToast]);

  const handleRenameStart = useCallback((b: Budget) => {
    setExpandedId(b.id);
    setRenamingId(b.id);
    setCloneValue('');
    setRenameValue(b.name);
  }, []);

  const handleRenameConfirm = useCallback(async (b: Budget) => {
    if (!renameValue.trim()) {
      Alert.alert('Name required', 'Please enter a new name.');
      return;
    }
    try {
      setPendingId(b.id);
      const res = await renameBudget(b.id, renameValue.trim());
      if (res.success) {
        await refreshData(true);
        showToast('Budget renamed', 'success');
        setRenamingId(null);
      } else {
        showToast('Failed to rename budget', 'error');
      }
    } catch (e) {
      console.log('Budgets: error renaming budget', e);
      showToast('Failed to rename budget', 'error');
    } finally {
      setPendingId(null);
    }
  }, [renameBudget, renameValue, refreshData, showToast]);

  const handleDelete = useCallback((b: Budget) => {
    const isOnly = budgets.length <= 1;
    if (isOnly) return;
    Alert.alert(
      'Delete Budget',
      `Delete "${b.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setPendingId(b.id);
              const res = await deleteBudget(b.id);
              if (res.success) {
                await refreshData(true);
                showToast('Budget deleted', 'success');
              } else {
                showToast('Failed to delete budget', 'error');
              }
            } catch (e) {
              console.log('Budgets: error deleting budget', e);
              showToast('Failed to delete budget', 'error');
            } finally {
              setPendingId(null);
            }
          },
        },
      ]
    );
  }, [budgets.length, deleteBudget, refreshData, showToast]);

  // Local clone implementation to avoid changing hooks/storage public API footprint in this diff
  const cloneBudgetLocal = useCallback(async (sourceId: string, newName: string) => {
    const app = await loadAppData();
    const src = app.budgets.find(b => b.id === sourceId);
    if (!src) throw new Error('Source budget not found');
    const clone: Budget = {
      ...src,
      id: `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newName,
      createdAt: Date.now(),
    };
    const newApp = { ...app, budgets: [...app.budgets, clone] };
    const res = await saveAppData(newApp);
    if (!res.success) throw res.error || new Error('Failed to save cloned budget');
    return clone;
  }, []);

  const handleCloneStart = useCallback((b: Budget) => {
    setExpandedId(b.id);
    setCloningId(b.id);
    setRenameValue('');
    const defaultName = `${b.name} (Copy)`;
    setCloneValue(defaultName);
  }, []);

  const handleCloneConfirm = useCallback(async (b: Budget) => {
    if (!cloneValue.trim()) {
      Alert.alert('Name required', 'Please enter a name for the copy.');
      return;
    }
    try {
      setPendingId(b.id);
      const clone = await cloneBudgetLocal(b.id, cloneValue.trim());
      await refreshData(true);
      showToast(`Cloned to "${clone.name}"`, 'success');
      setCloningId(null);
    } catch (e) {
      console.log('Budgets: error cloning budget', e);
      showToast('Failed to clone budget', 'error');
    } finally {
      setPendingId(null);
    }
  }, [cloneValue, cloneBudgetLocal, refreshData, showToast]);

  const RowActions = ({ budget }: { budget: Budget }) => {
    const isOnly = budgets.length <= 1;
    const isActive = budget.id === activeId;
    const isPending = pendingId === budget.id;

    if (renamingId === budget.id) {
      return (
        <View style={[themedStyles.card, { marginTop: 8, padding: 12 }]}>
          <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>Rename Budget</Text>
          <TextInput
            style={themedStyles.input}
            placeholder="New budget name"
            placeholderTextColor={currentColors.textSecondary}
            value={renameValue}
            onChangeText={setRenameValue}
            editable={!isPending}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                style={[
                  themedStyles.card,
                  { padding: 12, minHeight: 44, borderColor: currentColors.primary, borderWidth: 2, backgroundColor: 'transparent' }
                ]}
                onPress={() => { setRenamingId(null); setExpandedId(null); }}
                disabled={isPending}
              >
                <Text style={[themedStyles.text, { textAlign: 'center', color: currentColors.primary, fontWeight: '700' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                style={[
                  themedStyles.card,
                  { padding: 12, minHeight: 44, backgroundColor: currentColors.primary, borderColor: currentColors.primary, borderWidth: 2 }
                ]}
                onPress={() => handleRenameConfirm(budget)}
                disabled={isPending}
              >
                {isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[themedStyles.text, { textAlign: 'center', color: '#FFFFFF', fontWeight: '700' }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    if (cloningId === budget.id) {
      return (
        <View style={[themedStyles.card, { marginTop: 8, padding: 12 }]}>
          <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>Clone Budget</Text>
          <TextInput
            style={themedStyles.input}
            placeholder="Copy name"
            placeholderTextColor={currentColors.textSecondary}
            value={cloneValue}
            onChangeText={setCloneValue}
            editable={!isPending}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                style={[
                  themedStyles.card,
                  { padding: 12, minHeight: 44, borderColor: currentColors.secondary, borderWidth: 2, backgroundColor: 'transparent' }
                ]}
                onPress={() => { setCloningId(null); setExpandedId(null); }}
                disabled={isPending}
              >
                <Text style={[themedStyles.text, { textAlign: 'center', color: currentColors.secondary, fontWeight: '700' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                style={[
                  themedStyles.card,
                  { padding: 12, minHeight: 44, backgroundColor: currentColors.secondary, borderColor: currentColors.secondary, borderWidth: 2 }
                ]}
                onPress={() => handleCloneConfirm(budget)}
                disabled={isPending}
              >
                {isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[themedStyles.text, { textAlign: 'center', color: '#FFFFFF', fontWeight: '700' }]}>Create Copy</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        {!isActive && (
          <TouchableOpacity
            onPress={() => handleRowPress(budget.id)}
            disabled={isPending}
            style={[
              themedStyles.card,
              { paddingVertical: 12, paddingHorizontal: 14, minHeight: 44, backgroundColor: currentColors.primary + '15', borderColor: currentColors.primary, borderWidth: 2 }
            ]}
          >
            <Text style={[themedStyles.text, { color: currentColors.primary, fontWeight: '700' }]}>
              Set Active
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => handleRenameStart(budget)}
          disabled={isPending}
          style={[
            themedStyles.card,
            { paddingVertical: 12, paddingHorizontal: 14, minHeight: 44 }
          ]}
        >
          <Text style={[themedStyles.text, { fontWeight: '700' }]}>Rename</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleCloneStart(budget)}
          disabled={isPending}
          style={[
            themedStyles.card,
            { paddingVertical: 12, paddingHorizontal: 14, minHeight: 44 }
          ]}
        >
          <Text style={[themedStyles.text, { fontWeight: '700' }]}>Clone</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleDelete(budget)}
          disabled={isOnly || isPending}
          style={[
            themedStyles.card,
            { 
              paddingVertical: 12, paddingHorizontal: 14, minHeight: 44,
              backgroundColor: isOnly ? currentColors.textSecondary + '10' : currentColors.error + '15',
              borderWidth: 2,
              borderColor: isOnly ? currentColors.textSecondary + '60' : currentColors.error
            }
          ]}
        >
          <Text style={[themedStyles.text, { fontWeight: '700', color: isOnly ? currentColors.textSecondary : currentColors.error }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={themedStyles.container}>
      <StandardHeader
        title="Budgets"
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
        rightIcon="add"
        onRightPress={handleCreatePress}
      />

      <ScrollView style={themedStyles.content} contentContainerStyle={themedStyles.scrollContent}>
        {/* Create new budget form */}
        {creating && (
          <View style={[themedStyles.card, { backgroundColor: currentColors.primary + '10' }]}>
            <Text style={[themedStyles.subtitle, { marginBottom: 8 }]}>Create New Budget</Text>
            <TextInput
              style={themedStyles.input}
              placeholder="Budget name"
              placeholderTextColor={currentColors.textSecondary}
              value={newBudgetName}
              onChangeText={setNewBudgetName}
              autoFocus
              editable={!pendingCreate}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={[
                    themedStyles.card,
                    { padding: 12, minHeight: 44, borderColor: currentColors.primary, borderWidth: 2, backgroundColor: 'transparent' }
                  ]}
                  onPress={() => { setCreating(false); setNewBudgetName(''); }}
                  disabled={pendingCreate}
                >
                  <Text style={[themedStyles.text, { textAlign: 'center', color: currentColors.primary, fontWeight: '700' }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={[
                    themedStyles.card,
                    { padding: 12, minHeight: 44, backgroundColor: currentColors.primary, borderColor: currentColors.primary, borderWidth: 2 }
                  ]}
                  onPress={handleCreateSubmit}
                  disabled={pendingCreate}
                >
                  {pendingCreate ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={[themedStyles.text, { textAlign: 'center', color: '#FFFFFF', fontWeight: '700' }]}>Create &amp; Set Active</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={themedStyles.section}>
          <Text style={[themedStyles.subtitle, { marginBottom: 12 }]}>Your Budgets</Text>
          {sortedBudgets.map((b) => {
            const isActive = b.id === activeId;
            const isExpanded = expandedId === b.id;
            const isPending = pendingId === b.id;

            return (
              <Pressable
                key={b.id}
                style={[themedStyles.card, { padding: 16, marginBottom: 12 }]}
                onPress={() => handleRowPress(b.id)}
                disabled={isPending}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={[themedStyles.text, { fontWeight: '800', fontSize: 18 }]}>
                        {b.name}
                      </Text>
                      {isActive && (
                        <View style={[
                          themedStyles.badge,
                          { marginLeft: 8, backgroundColor: currentColors.primary, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 }
                        ]}>
                          <Text style={[themedStyles.badgeText, { color: '#FFFFFF', fontSize: 11, fontWeight: '800' }]}>
                            ACTIVE
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>
                      Created {new Date(b.createdAt).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {isPending ? (
                      <ActivityIndicator color={currentColors.textSecondary} />
                    ) : (
                      <TouchableOpacity
                        onPress={() => setExpandedId(isExpanded ? null : b.id)}
                        style={{
                          minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center',
                          borderRadius: 22, backgroundColor: currentColors.border + '40'
                        }}
                      >
                        <Icon name={isExpanded ? 'chevron-up' : 'ellipsis-horizontal'} size={22} style={{ color: currentColors.text }} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {isExpanded && <RowActions budget={b} />}
              </Pressable>
            );
          })}

          {sortedBudgets.length === 0 && (
            <View style={themedStyles.card}>
              <View style={themedStyles.centerContent}>
                <Icon name="folder-open-outline" size={48} style={{ color: currentColors.textSecondary, marginBottom: 12 }} />
                <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 8 }]}>No Budgets Yet</Text>
                <Text style={[themedStyles.textSecondary, { textAlign: 'center', marginBottom: 12 }]}>
                  Create your first budget to get started.
                </Text>
                <TouchableOpacity
                  onPress={handleCreatePress}
                  style={[
                    themedStyles.card,
                    { backgroundColor: currentColors.primary, borderColor: currentColors.primary, borderWidth: 2, minHeight: 44 }
                  ]}
                >
                  <Text style={[themedStyles.text, { color: '#FFFFFF', textAlign: 'center', fontWeight: '700' }]}>+ New Budget</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
