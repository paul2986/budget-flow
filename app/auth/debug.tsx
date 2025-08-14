
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useTheme } from '../../hooks/useTheme';
import StandardHeader from '../../components/StandardHeader';
import Button from '../../components/Button';
import { supabase } from '../../utils/supabase';

export default function AuthDebugScreen() {
  const { session, user, loading } = useAuth();
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const getDebugInfo = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        setDebugInfo({
          hookSession: session,
          hookUser: user,
          hookLoading: loading,
          supabaseSession: sessionData.session,
          supabaseUser: userData.user,
          sessionError,
          userError,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        setDebugInfo({ error: error.message });
      }
    };

    getDebugInfo();
  }, [session, user, loading]);

  const handleRefresh = async () => {
    try {
      await supabase.auth.refreshSession();
      const { data: sessionData } = await supabase.auth.getSession();
      const { data: userData } = await supabase.auth.getUser();
      
      setDebugInfo({
        ...debugInfo,
        refreshedSession: sessionData.session,
        refreshedUser: userData.user,
        refreshTimestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Refresh error:', error);
    }
  };

  return (
    <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
      <StandardHeader title="Auth Debug" />
      
      <ScrollView style={themedStyles.content}>
        <View style={{ padding: 16 }}>
          <Text style={[themedStyles.title, { marginBottom: 16 }]}>
            Authentication Debug Info
          </Text>
          
          <Button
            text="Refresh Session"
            onPress={handleRefresh}
            style={{ marginBottom: 16 }}
          />
          
          <View style={[themedStyles.card, { backgroundColor: currentColors.backgroundAlt }]}>
            <Text style={[themedStyles.text, { fontFamily: 'monospace', fontSize: 12 }]}>
              {JSON.stringify(debugInfo, null, 2)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
