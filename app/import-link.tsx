
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import StandardHeader from '../components/StandardHeader';
import Icon from '../components/Icon';
import { router, useLocalSearchParams } from 'expo-router';
import { useBudgetData } from '../hooks/useBudgetData';
import { useToast } from '../hooks/useToast';
import { fetchSharedBudget } from '../utils/shareLink';
import * as Clipboard from 'expo-clipboard';
import { Budget } from '../types/budget';
import { loadAppData, saveAppData } from '../utils/storage';

type ScannerModule = {
  BarCodeScanner: any;
};

export default function ImportLinkScreen() {
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();
  const { showToast } = useToast();
  const { refreshData } = useBudgetData();
  const params = useLocalSearchParams<{ q?: string }>();

  const [input, setInput] = useState<string>(typeof params?.q === 'string' ? params.q : '');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ name: string; peopleCount: number; expensesCount: number; budget: Omit<Budget, 'id' | 'createdAt'> } | null>(null);

  // Scanner state (lazy-loaded)
  const [scanMode, setScanMode] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [scannerComponent, setScannerComponent] = useState<any>(null);
  const scannerLoadErrorRef = useRef<string | null>(null);

  // Lazy load the scanner only when needed and not on web
  useEffect(() => {
    let cancelled = false;
    async function prepareScanner() {
      if (!scanMode) return;
      if (Platform.OS === 'web') return;
      try {
        // Dynamically import the module to avoid initialization errors on unsupported platforms
        const mod: ScannerModule = await import('expo-barcode-scanner');
        if (cancelled) return;

        // Request permissions via the module we just loaded
        if (mod?.BarCodeScanner?.requestPermissionsAsync) {
          const { status } = await mod.BarCodeScanner.requestPermissionsAsync();
          if (cancelled) return;
          setHasPermission(status === 'granted');
        } else {
          // In some edge cases the module may not expose the method (misinstalled)
          setHasPermission(false);
          scannerLoadErrorRef.current = 'Scanner permission API not available';
          console.log('ImportLink: Scanner permission API not available');
        }

        // Store the component for rendering
        if (mod?.BarCodeScanner) {
          setScannerComponent(() => mod.BarCodeScanner);
        } else {
          setScannerComponent(null);
          scannerLoadErrorRef.current = 'Scanner component not available';
          console.log('ImportLink: Scanner component not available');
        }
      } catch (e: any) {
        console.log('ImportLink: Failed to load scanner module', e?.message || e);
        scannerLoadErrorRef.current = e?.message || 'Failed to load scanner module';
        setHasPermission(false);
        setScannerComponent(null);
      }
    }

    prepareScanner();
    return () => {
      cancelled = true;
    };
  }, [scanMode]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setInput(text);
      } else {
        showToast('Clipboard is empty', 'info');
      }
    } catch (e) {
      showToast('Failed to read clipboard', 'error');
    }
  }, [showToast]);

  const handlePreview = useCallback(async () => {
    if (!input.trim()) {
      showToast('Paste a link or scan a QR code first', 'info');
      return;
    }
    setLoading(true);
    setPreview(null);
    try {
      const res = await fetchSharedBudget(input.trim());
      const name = res.budget.name || 'Imported Budget';
      const peopleCount = Array.isArray(res.budget.people) ? res.budget.people.length : 0;
      const expensesCount = Array.isArray(res.budget.expenses) ? res.budget.expenses.length : 0;
      setPreview({ name, peopleCount, expensesCount, budget: res.budget });
    } catch (e: any) {
      console.log('Preview failed', e?.message || e);
      showToast(e?.message || 'Failed to preview', 'error');
    } finally {
      setLoading(false);
    }
  }, [input, showToast]);

  const importBudget = useCallback(async (activate: boolean) => {
    if (!preview) return;
    setLoading(true);
    try {
      const app = await loadAppData();
      const newBudget: Budget = {
        id: `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: preview.budget.name || 'Imported Budget',
        people: preview.budget.people || [],
        expenses: preview.budget.expenses || [],
        householdSettings: preview.budget.householdSettings || { distributionMethod: 'even' },
        createdAt: Date.now(),
      };
      const newApp = {
        ...app,
        budgets: [...app.budgets, newBudget],
        activeBudgetId: activate ? newBudget.id : app.activeBudgetId,
      };
      const res = await saveAppData(newApp);
      if (!res.success) throw new Error('Failed to save imported budget');
      await refreshData(true);
      showToast('Budget imported', 'success');
      if (activate) {
        showToast('Activated imported budget', 'success');
      }
      router.replace('/budgets');
    } catch (e: any) {
      console.log('Import failed', e?.message || e);
      showToast(e?.message || 'Failed to import', 'error');
    } finally {
      setLoading(false);
    }
  }, [preview, refreshData, showToast]);

  const onBarCodeScanned = useCallback(({ data }: { data: string }) => {
    if (scanBusy) return;
    setScanBusy(true);
    try {
      setInput(String(data || ''));
      showToast('Scanned. Tap Preview to continue.', 'success');
    } catch (e) {
      showToast('Scan error', 'error');
    } finally {
      setTimeout(() => setScanBusy(false), 800);
    }
  }, [scanBusy, showToast]);

  const renderScanner = () => {
    // Web is not supported in Natively for camera usage
    if (Platform.OS === 'web') {
      return (
        <View style={[themedStyles.card, { padding: 20 }]}>
          <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
            Camera scanning is not supported on web in Natively. Paste the code instead.
          </Text>
        </View>
      );
    }

    // If the module failed to load, show a helpful message
    if (!scannerComponent) {
      return (
        <View style={[themedStyles.card, { padding: 20 }]}>
          <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
            Scanner is unavailable on this build. Paste the link/code above to continue.
          </Text>
          {scannerLoadErrorRef.current ? (
            <Text style={[themedStyles.textSecondary, { marginTop: 8, fontSize: 12, textAlign: 'center' }]}>
              {scannerLoadErrorRef.current}
            </Text>
          ) : null}
        </View>
      );
    }

    if (hasPermission === null) {
      return (
        <View style={[themedStyles.centerContent, { padding: 20 }]}>
          <ActivityIndicator color={currentColors.primary} />
          <Text style={[themedStyles.textSecondary, { marginTop: 8 }]}>Requesting camera permission...</Text>
        </View>
      );
    }
    if (hasPermission === false) {
      return (
        <View style={[themedStyles.card, { padding: 20 }]}>
          <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
            Camera permission not granted. You can paste the code above.
          </Text>
        </View>
      );
    }

    const Scanner = scannerComponent;
    return (
      <View style={[themedStyles.card, { overflow: 'hidden', padding: 0, height: 260 }]}>
        <Scanner
          onBarCodeScanned={onBarCodeScanned as any}
          style={{ width: '100%', height: '100%' }}
        />
      </View>
    );
  };

  return (
    <View style={themedStyles.container}>
      <StandardHeader
        title="Import from Link/QR"
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
        showRightIcon={false}
      />

      <ScrollView style={themedStyles.content} contentContainerStyle={themedStyles.scrollContent}>
        <View style={themedStyles.section}>
          <Text style={[themedStyles.subtitle, { marginBottom: 8 }]}>Paste Link or Code</Text>
          <TextInput
            style={[themedStyles.input, { minHeight: 80 }]}
            placeholder="Paste a link or QR contents here"
            placeholderTextColor={currentColors.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <TouchableOpacity
              onPress={handlePaste}
              style={[themedStyles.card, { flex: 1, padding: 12, backgroundColor: currentColors.secondary }]}
            >
              <Text style={[themedStyles.text, { color: '#FFFFFF', textAlign: 'center', fontWeight: '700' }]}>Paste</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePreview}
              style={[themedStyles.card, { flex: 1, padding: 12, backgroundColor: currentColors.primary }]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[themedStyles.text, { color: '#FFFFFF', textAlign: 'center', fontWeight: '700' }]}>Preview</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={themedStyles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' }}>
            <Text style={[themedStyles.subtitle]}>Scan QR</Text>
            <TouchableOpacity
              onPress={() => setScanMode(!scanMode)}
              style={[themedStyles.card, { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: currentColors.border }]}
            >
              <Text style={[themedStyles.text, { fontWeight: '700' }]}>{scanMode ? 'Hide Scanner' : 'Show Scanner'}</Text>
            </TouchableOpacity>
          </View>
          {scanMode && renderScanner()}
        </View>

        {preview && (
          <View style={[themedStyles.card, { padding: 16 }]}>
            <Text style={[themedStyles.subtitle, { marginBottom: 4 }]} numberOfLines={2}>
              {preview.name}
            </Text>
            <Text style={[themedStyles.textSecondary, { marginBottom: 12 }]}>
              {preview.peopleCount} people • {preview.expensesCount} expenses
            </Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => importBudget(false)}
                style={[themedStyles.card, { flex: 1, padding: 12, backgroundColor: currentColors.border }]}
              >
                {loading ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={[themedStyles.text, { textAlign: 'center', fontWeight: '700' }]}>Import</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => importBudget(true)}
                style={[themedStyles.card, { flex: 1, padding: 12, backgroundColor: currentColors.primary }]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[themedStyles.text, { textAlign: 'center', fontWeight: '700', color: '#FFFFFF' }]}>Import &amp; Activate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!preview && (
          <View style={[themedStyles.card, { padding: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="information-circle-outline" size={20} style={{ color: currentColors.textSecondary }} />
              <Text style={[themedStyles.textSecondary, { flex: 1 }]}>
                After previewing, you can import as a new budget. You can also activate it immediately.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
