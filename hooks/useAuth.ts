
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase, AUTH_REDIRECT_HTTPS } from '../utils/supabase';

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
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('useAuth: Error getting initial session:', error);
      } else {
        console.log('useAuth: Initial session:', session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('useAuth: Auth state changed:', event, session?.user?.email);
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
    if (!user?.email) {
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

      return { success: true, message: 'Verification email sent successfully' };
    } catch (error) {
      console.error('useAuth: Resend verification exception:', error);
      return { success: false, message: 'Failed to send verification email' };
    }
  }, [user?.email]);

  const signInWithApple = useCallback(async (): Promise<{ success: boolean; message: string }> => {
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

      return { success: true, message: 'Redirecting to Apple...' };
    } catch (error) {
      console.error('useAuth: Apple sign in exception:', error);
      return { success: false, message: 'Failed to sign in with Apple' };
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<{ success: boolean; message: string }> => {
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

      return { success: true, message: 'Redirecting to Google...' };
    } catch (error) {
      console.error('useAuth: Google sign in exception:', error);
      return { success: false, message: 'Failed to sign in with Google' };
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
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
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('useAuth: Email signin error:', error);
        return { success: false, message: error.message };
      }

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
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('useAuth: Refresh session error:', error);
      } else {
        console.log('useAuth: Session refreshed');
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }
    } catch (error) {
      console.error('useAuth: Refresh session exception:', error);
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
