import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, supabaseConfigError } from '../lib/supabase';
import { createProfile, fetchProfile, upsertProfile } from '../services/cloudProfileService';
import { getDefaultData } from '../services/storageService';

const AuthContext = createContext(null);

function friendlyAuthError(error) {
  const message = error?.message || String(error || '');
  if (!message) return 'Something went wrong. Please try again.';
  if (/invalid login|invalid credentials/i.test(message)) return 'Email or password is incorrect.';
  if (/already registered|already exists|user already/i.test(message)) return 'An account already exists for this email.';
  if (/password/i.test(message) && /weak|short|least/i.test(message)) return 'Please choose a stronger password.';
  if (/fetch|network|failed/i.test(message)) return 'Network trouble. Check your connection and try again.';
  if (/profile/i.test(message)) return 'We could not load your cloud profile yet.';
  return message;
}

function profileForSignup(username, avatar) {
  const data = getDefaultData();
  data.profile.username = username;
  data.profile.avatar = avatar || '';
  data.settings.onboarded = true;
  return data.profile;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(supabaseConfigError);
  const userRef = useRef(null);

  userRef.current = user;

  const refreshProfile = useCallback(async (targetUser) => {
    const activeUser = targetUser || userRef.current;
    if (!supabase || !activeUser) {
      setProfile(null);
      return null;
    }

    try {
      const loaded = await fetchProfile(activeUser.id);
      if (loaded) {
        setProfile(loaded);
        setAuthError(null);
        return loaded;
      }

      const fallbackName =
        activeUser.user_metadata?.username ||
        activeUser.email?.split('@')[0] ||
        'Player';
      const created = await createProfile(activeUser.id, profileForSignup(fallbackName));
      setProfile(created);
      setAuthError(null);
      return created;
    } catch (error) {
      setAuthError(friendlyAuthError(error));
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      if (!supabase) {
        if (mounted) setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) {
        setAuthError(friendlyAuthError(error));
        setLoading(false);
        return;
      }

      const currentSession = data.session;
      setSession(currentSession);
      setUser(currentSession?.user || null);
      if (currentSession?.user) {
        await refreshProfile(currentSession.user);
      }
      if (mounted) setLoading(false);
    }

    boot();

    if (!supabase) return () => {
      mounted = false;
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user || null);
      if (nextSession?.user) {
        refreshProfile(nextSession.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signIn = useCallback(async ({ email, password }) => {
    if (!supabase) return { success: false, error: supabaseConfigError };
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = friendlyAuthError(error);
      setAuthError(msg);
      return { success: false, error: msg };
    }
    await refreshProfile(data.user);
    return { success: true };
  }, [refreshProfile]);

  const signUp = useCallback(async ({ username, email, password, avatar }) => {
    if (!supabase) return { success: false, error: supabaseConfigError };
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, avatar: avatar || '' },
      },
    });

    if (error) {
      const msg = friendlyAuthError(error);
      setAuthError(msg);
      return { success: false, error: msg };
    }

    if (data.user && data.session) {
      try {
        const created = await upsertProfile(data.user.id, profileForSignup(username, avatar));
        setProfile(created);
      } catch (profileError) {
        const msg = friendlyAuthError(profileError);
        setAuthError(msg);
        return { success: false, error: msg };
      }
    }

    return {
      success: true,
      needsEmailConfirmation: !data.session,
    };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return { success: true };
    const { error } = await supabase.auth.signOut();
    if (error) {
      const msg = friendlyAuthError(error);
      setAuthError(msg);
      return { success: false, error: msg };
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    return { success: true };
  }, []);

  const forgotPassword = useCallback(async (email) => {
    if (!supabase) return { success: false, error: supabaseConfigError };
    const redirectTo = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      const msg = friendlyAuthError(error);
      setAuthError(msg);
      return { success: false, error: msg };
    }
    return { success: true };
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    authError,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    forgotPassword,
    refreshProfile,
    setProfile,
  }), [authError, forgotPassword, loading, profile, refreshProfile, session, signIn, signOut, signUp, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
