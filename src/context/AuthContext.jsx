import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { supabase, supabaseConfigError } from '../lib/supabase';
import {
  createProfile,
  fetchProfile,
  upsertProfile,
} from '../services/cloudProfileService';
import { getDefaultData } from '../services/storageService';

const AuthContext = createContext(null);

function friendlyAuthError(error) {
  const message = error?.message || String(error || '');

  if (!message) {
    return 'Something went wrong. Please try again.';
  }

  // Email confirmation
  if (
    /email not confirmed|email_not_confirmed|email.*not.*confirm/i.test(
      message
    )
  ) {
    return 'Please verify your email before signing in. Check your inbox and spam folder.';
  }

  // Login errors
  if (/invalid login|invalid credentials/i.test(message)) {
    return 'Email or password is incorrect.';
  }

  // Existing account
  if (/already registered|already exists|user already/i.test(message)) {
    return 'An account already exists for this email.';
  }

  // Password problems
  if (/password/i.test(message) && /weak|short|least/i.test(message)) {
    return 'Please choose a stronger password.';
  }

  // Network problems
  if (/fetch|network|failed/i.test(message)) {
    return 'Network trouble. Check your connection and try again.';
  }

  // Profile problems
  if (/profile/i.test(message)) {
    return 'We could not load your cloud profile yet.';
  }

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
  const [isRecovery, setIsRecovery] = useState(false);

  const userRef = useRef(null);

  userRef.current = user;

  // ------------------------------------------------------------
  // Load / refresh cloud profile
  // ------------------------------------------------------------

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

      const created = await createProfile(
        activeUser.id,
        profileForSignup(fallbackName)
      );

      setProfile(created);
      setAuthError(null);

      return created;
    } catch (error) {
      setAuthError(friendlyAuthError(error));
      setProfile(null);
      return null;
    }
  }, []);

  // ------------------------------------------------------------
  // Initial authentication boot
  // ------------------------------------------------------------

  useEffect(() => {
    let mounted = true;

    async function boot() {
      if (!supabase) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

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

      if (mounted) {
        setLoading(false);
      }
    }

    boot();

    if (!supabase) {
      return () => {
        mounted = false;
      };
    }

    const {
      data: listener,
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user || null);

        if (_event === 'PASSWORD_RECOVERY') {
          setIsRecovery(true);
        } else if (_event === 'SIGNED_IN') {
          setIsRecovery(false);
        }

        if (nextSession?.user) {
          refreshProfile(nextSession.user);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  // ------------------------------------------------------------
  // Sign in
  // ------------------------------------------------------------

  const signIn = useCallback(
    async ({ email, password }) => {
      if (!supabase) {
        return {
          success: false,
          error: supabaseConfigError,
        };
      }

      setAuthError(null);

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        const msg = friendlyAuthError(error);

        setAuthError(msg);

        return {
          success: false,
          error: msg,
          code: error.code,
        };
      }

      await refreshProfile(data.user);

      return {
        success: true,
      };
    },
    [refreshProfile]
  );

  // ------------------------------------------------------------
  // Sign up
  // ------------------------------------------------------------

  const signUp = useCallback(
    async ({ username, email, password, avatar }) => {
      if (!supabase) {
        return {
          success: false,
          error: supabaseConfigError,
        };
      }

      setAuthError(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,

        options: {
          data: {
            username,
            avatar: avatar || '',
          },

          // Sends the user back to the website after
          // successfully confirming their email.
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        const msg = friendlyAuthError(error);

        setAuthError(msg);

        return {
          success: false,
          error: msg,
        };
      }

      // If email confirmation is disabled, Supabase gives us
      // a session immediately.
      if (data.user && data.session) {
        try {
          const created = await upsertProfile(
            data.user.id,
            profileForSignup(username, avatar)
          );

          setProfile(created);
        } catch (profileError) {
          const msg = friendlyAuthError(profileError);

          setAuthError(msg);

          return {
            success: false,
            error: msg,
          };
        }
      }

      // If there is no session, Supabase is waiting for
      // email confirmation.
      return {
        success: true,
        needsEmailConfirmation: !data.session,
      };
    },
    []
  );

  // ------------------------------------------------------------
  // Resend verification email
  // ------------------------------------------------------------

  const resendVerificationEmail = useCallback(
    async (email) => {
      if (!supabase) {
        return {
          success: false,
          error: supabaseConfigError,
        };
      }

      if (!email?.trim()) {
        return {
          success: false,
          error: 'Please enter your email address.',
        };
      }

      setAuthError(null);

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        const msg = friendlyAuthError(error);

        setAuthError(msg);

        return {
          success: false,
          error: msg,
        };
      }

      return {
        success: true,
      };
    },
    []
  );

  // ------------------------------------------------------------
  // Sign out
  // ------------------------------------------------------------

  const signOut = useCallback(async () => {
    if (!supabase) {
      return {
        success: true,
      };
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      const msg = friendlyAuthError(error);

      setAuthError(msg);

      return {
        success: false,
        error: msg,
      };
    }

    setSession(null);
    setUser(null);
    setProfile(null);

    return {
      success: true,
    };
  }, []);

  // ------------------------------------------------------------
  // Forgot password
  // ------------------------------------------------------------

  const forgotPassword = useCallback(async (email) => {
    if (!supabase) {
      return {
        success: false,
        error: supabaseConfigError,
      };
    }

    const redirectTo = window.location.origin;

    const { error } =
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

    if (error) {
      const msg = friendlyAuthError(error);

      setAuthError(msg);

      return {
        success: false,
        error: msg,
      };
    }

    return {
      success: true,
    };
  }, []);

  // ------------------------------------------------------------
  // Update password (after recovery)
  // ------------------------------------------------------------

  const updatePassword = useCallback(async (newPassword) => {
    if (!supabase) {
      return { success: false, error: supabaseConfigError };
    }

    setAuthError(null);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      const msg = friendlyAuthError(error);
      setAuthError(msg);
      return { success: false, error: msg };
    }

    setIsRecovery(false);

    return { success: true };
  }, []);

  // ------------------------------------------------------------
  // Auth context
  // ------------------------------------------------------------

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      authError,

      isAuthenticated: !!user,
      isRecovery,

      signIn,
      signUp,
      signOut,
      forgotPassword,
      updatePassword,
      resendVerificationEmail,

      refreshProfile,
      setProfile,
    }),
    [
      authError,
      forgotPassword,
      loading,
      isRecovery,
      profile,
      refreshProfile,
      resendVerificationEmail,
      session,
      signIn,
      signOut,
      signUp,
      updatePassword,
      user,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return value;
}