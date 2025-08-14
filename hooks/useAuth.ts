
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase, AUTH_REDIRECT_HTTPS } from '../utils/supabase';

// Helper function to check if a session is expired
function isSessionExpired(session: Session | null): boolean {
  if (!session || !session.expires_at) return true;
  const now = Math.floor(Date.now() / 1000);
  return now >= session.expires_at;
}

// Helper function to safely refresh a session
async function safeRefreshSession(): Promise<{ session: Session | null; error: AuthError | null }> {
  try {
    const { data: currentSession } = await supabase.auth.getSession();
    
    if (!currentSession.session) {
      return { session: null, error: null };
    }

    if (isSessionExpired(currentSession.session)) {
      console.log('useAuth: Session expired, attempting refresh');
      const { data, error } = await supabase.auth.refreshSession();
      return { session: data.session, error };
    }

    return { session: currentSession.session, error: null };
  } catch (error) {
    console.error('useAuth: Safe refresh session error:', error);
    return { session: null, error: error as AuthError };
  }
}

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  resendVerification: () => Promise<{ success: boolean; message: string }>;
  signInWithApple: () => Promise<{ success: boolean; message: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; message: string }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthProvider(): AuthContextType {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('useAuth: Initializing auth state');
    
    // Get initial session with safe refresh
    safeRefreshSession().then(({ session, error }) => {
      if (error) {
        console.error('useAuth: Error during initial session check:', error);
        setSession(null);
        setUser(null);
      } else {
        console.log('useAuth: Initial session check complete:', session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('useAuth: Auth state changed:', event, session?.user?.email);
        
        // Handle specific auth events
        if (event === 'TOKEN_REFRESHED') {
          console.log('useAuth: Token refreshed automatically');
        } else if (event === 'SIGNED_OUT') {
          console.log('useAuth: User signed out');
        } else if (event === 'SIGNED_IN') {
          console.log('useAuth: User signed in');
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    console.log('useAuth: Signing out');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('useAuth: Sign out error:', error);
      }
    } catch (error) {
      console.error('useAuth: Sign out exception:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const resendVerification = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    console.log('useAuth: Resending verification email');
    
    if (!user?.email) {
      console.log('useAuth: No email address found for resend');
      return { success: false, message: 'No email address found' };
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: AUTH_REDIRECT_HTTPS,
        },
      });

      if (error) {
        console.error('useAuth: Resend verification error:', error);
        return { success: false, message: error.message };
      }

      console.log('useAuth: Verification email sent successfully');
      return { success: true, message: 'Verification email sent successfully' };
    } catch (error) {
      console.error('useAuth: Resend verification exception:', error);
      return { success: false, message: 'Failed to send verification email' };
    }
  }, [user?.email]);

  const signInWithApple = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    console.log('useAuth: Starting Apple sign in');
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: AUTH_REDIRECT_HTTPS,
        },
      });

      if (error) {
        console.error('useAuth: Apple sign in error:', error);
        return { success: false, message: error.message };
      }

      console.log('useAuth: Apple sign in initiated successfully');
      return { success: true, message: 'Redirecting to Apple...' };
    } catch (error) {
      console.error('useAuth: Apple sign in exception:', error);
      return { success: false, message: 'Failed to sign in with Apple' };
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    console.log('useAuth: Starting Google sign in');
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: AUTH_REDIRECT_HTTPS,
        },
      });

      if (error) {
        console.error('useAuth: Google sign in error:', error);
        return { success: false, message: error.message };
      }

      console.log('useAuth: Google sign in initiated successfully');
      return { success: true, message: 'Redirecting to Google...' };
    } catch (error) {
      console.error('useAuth: Google sign in exception:', error);
      return { success: false, message: 'Failed to sign in with Google' };
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    console.log('useAuth: Starting email signup for:', email);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: AUTH_REDIRECT_HTTPS,
        },
      });

      if (error) {
        console.error('useAuth: Email signup error:', error);
        return { success: false, message: error.message };
      }

      console.log('useAuth: Email signup response:', {
        user: data.user?.email,
        emailConfirmed: data.user?.email_confirmed_at,
      });

      if (data.user && !data.user.email_confirmed_at) {
        return { success: true, message: 'Please check your email to verify your account' };
      }

      return { success: true, message: 'Account created successfully' };
    } catch (error) {
      console.error('useAuth: Email signup exception:', error);
      return { success: false, message: 'Failed to create account' };
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    console.log('useAuth: Starting email signin for:', email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('useAuth: Email signin error:', error);
        return { success: false, message: error.message };
      }

      console.log('useAuth: Email signin response:', {
        user: data.user?.email,
        emailConfirmed: data.user?.email_confirmed_at,
      });

      if (data.user && !data.user.email_confirmed_at) {
        return { success: false, message: 'Please verify your email address before signing in' };
      }

      return { success: true, message: 'Signed in successfully' };
    } catch (error) {
      console.error('useAuth: Email signin exception:', error);
      return { success: false, message: 'Failed to sign in' };
    }
  }, []);

  const refreshSession = useCallback(async () => {
    console.log('useAuth: Manually refreshing session');
    
    const { session, error } = await safeRefreshSession();
    
    if (error) {
      console.error('useAuth: Refresh session error:', error.message);
      
      // If refresh fails due to invalid token, clear the session
      if (error.message.includes('Invalid Refresh Token') || 
          error.message.includes('refresh_token_not_found') ||
          error.message.includes('invalid_grant')) {
        console.log('useAuth: Invalid refresh token, clearing session');
        setSession(null);
        setUser(null);
        await supabase.auth.signOut();
      }
    } else {
      console.log('useAuth: Session refresh completed');
      setSession(session);
      setUser(session?.user ?? null);
    }
  }, []);

  return {
    session,
    user,
    loading,
    signOut,
    resendVerification,
    signInWithApple,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    refreshSession,
  };
}

export { AuthContext };
