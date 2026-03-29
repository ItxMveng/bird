import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, USE_MOCK } from '../services/firebase';
import { AppUser } from '../types';

type AuthStep = 'loading' | 'enter_credentials' | 'complete_profile' | 'authenticated';
type AuthMode = 'signin' | 'signup';
type FeedbackType = 'idle' | 'info' | 'success' | 'error';
type PermissionState = 'unknown' | 'granted' | 'denied' | 'not_required';

type AuthFeedback = {
  type: FeedbackType;
  message: string;
};

type PermissionsState = {
  notifications: PermissionState;
};

type AuthContextValue = {
  user: AppUser | null;
  firebaseUser: User | null;
  step: AuthStep;
  mode: AuthMode;
  emailDraft: string;
  isBusy: boolean;
  feedback: AuthFeedback;
  permissions: PermissionsState;
  setMode: (mode: AuthMode) => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  completeProfile: (payload: { name: string; city: string }) => Promise<void>;
  setProStatus: (isPro: boolean) => Promise<void>;
  logout: () => Promise<void>;
  clearFeedback: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const SESSION_KEY = 'bird.session.v1';
const PROFILE_KEY_PREFIX = 'bird.profile.v1.';
const PERMISSIONS_KEY = 'bird.permissions.v1';

const profileKey = (uid: string) => `${PROFILE_KEY_PREFIX}${uid}`;

const parseJSON = <T,>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

const toReadableAuthError = (error: unknown) => {
  const fallback = 'Une erreur est survenue. Réessaie dans quelques secondes.';
  if (!error || typeof error !== 'object') return fallback;

  const maybeCode = 'code' in error && typeof error.code === 'string' ? error.code : '';

  if (maybeCode.includes('auth/invalid-email')) return 'Adresse email invalide.';
  if (maybeCode.includes('auth/missing-password')) return 'Mot de passe manquant.';
  if (maybeCode.includes('auth/weak-password')) return 'Mot de passe trop faible (minimum 6 caractères).';
  if (maybeCode.includes('auth/email-already-in-use')) return 'Cet email est déjà utilisé.';
  if (maybeCode.includes('auth/user-not-found')) return 'Aucun compte trouvé avec cet email.';
  if (maybeCode.includes('auth/wrong-password')) return 'Mot de passe incorrect.';
  if (maybeCode.includes('auth/invalid-credential')) return 'Identifiants invalides. Vérifie email et mot de passe.';
  if (maybeCode.includes('auth/user-disabled')) return 'Ce compte est désactivé.';
  if (maybeCode.includes('auth/operation-not-allowed'))
    return 'Provider Email/Password inactif. Active-le dans Firebase Authentication > Sign-in method.';
  if (maybeCode.includes('auth/too-many-requests')) return 'Trop de tentatives. Réessaie plus tard.';
  if (maybeCode.includes('auth/network-request-failed')) return 'Problème réseau. Vérifie ta connexion.';
  if (maybeCode.includes('auth/invalid-api-key')) return 'Configuration Firebase invalide. Vérifie les variables EXPO_PUBLIC_FIREBASE_*.';

  return 'message' in error && typeof error.message === 'string' ? error.message : fallback;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [step, setStep] = useState<AuthStep>('loading');
  const [mode, setMode] = useState<AuthMode>('signin');
  const [emailDraft, setEmailDraft] = useState('');
  const [feedback, setFeedback] = useState<AuthFeedback>({ type: 'idle', message: '' });
  const [permissions, setPermissions] = useState<PermissionsState>({ notifications: 'unknown' });
  const [permissionSetupForUid, setPermissionSetupForUid] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const clearFeedback = useCallback(() => {
    setFeedback({ type: 'idle', message: '' });
  }, []);

  useEffect(() => {
    let mounted = true;
    const restore = async () => {
      const [rawSession, rawPermissions] = await Promise.all([
        AsyncStorage.getItem(SESSION_KEY),
        AsyncStorage.getItem(PERMISSIONS_KEY),
      ]);

      if (!mounted) return;

      const parsedSession = parseJSON<AppUser>(rawSession);
      const parsedPermissions = parseJSON<PermissionsState>(rawPermissions);

      if (parsedPermissions?.notifications) {
        setPermissions(parsedPermissions);
      }

      if (parsedSession?.uid) {
        setUser(parsedSession);
        setEmailDraft(parsedSession.email ?? '');
        setStep('authenticated');
      } else {
        setStep('enter_credentials');
      }
    };

    restore().catch(() => {
      if (mounted) {
        setStep('enter_credentials');
        setFeedback({
          type: 'error',
          message: "Impossible de restaurer la session locale. Reconnecte-toi.",
        });
      }
    });

    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const ensureNotificationPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      const next: PermissionsState = { notifications: 'not_required' };
      setPermissions(next);
      await AsyncStorage.setItem(PERMISSIONS_KEY, JSON.stringify(next));
      return;
    }

    const platformVersion =
      typeof Platform.Version === 'string' ? Number.parseInt(Platform.Version, 10) : Platform.Version;

    if (Number.isNaN(platformVersion) || platformVersion < 33) {
      const next: PermissionsState = { notifications: 'granted' };
      setPermissions(next);
      await AsyncStorage.setItem(PERMISSIONS_KEY, JSON.stringify(next));
      return;
    }

    const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, {
      title: 'Notifications Bird',
      message: "Autoriser les notifications pour suivre les enchères et les transactions.",
      buttonPositive: 'Autoriser',
      buttonNegative: 'Plus tard',
    });

    const next: PermissionsState = {
      notifications: status === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied',
    };
    setPermissions(next);
    await AsyncStorage.setItem(PERMISSIONS_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    if (step !== 'authenticated' || !user?.uid || permissionSetupForUid === user.uid) return;

    let active = true;
    ensureNotificationPermission()
      .then(() => {
        if (active) setPermissionSetupForUid(user.uid);
      })
      .catch(() => {
        if (active) {
          setPermissions({ notifications: 'unknown' });
          setPermissionSetupForUid(user.uid);
        }
      });

    return () => {
      active = false;
    };
  }, [ensureNotificationPermission, permissionSetupForUid, step, user?.uid]);

  const promoteAuthenticatedUser = useCallback(
    async (payload: { uid: string; email?: string | null; modeUsed: AuthMode }) => {
      const normalizedEmail = normalizeEmail(payload.email ?? '');
      const storedProfile = parseJSON<AppUser>(await AsyncStorage.getItem(profileKey(payload.uid)));
      let cloudProfile: AppUser | null = null;

      if (!USE_MOCK) {
        const cloudDoc = await getDoc(doc(db, 'users', payload.uid)).catch(() => null);
        if (cloudDoc?.exists()) {
          cloudProfile = {
            uid: payload.uid,
            email: cloudDoc.get('email') ?? (normalizedEmail || undefined),
            name: cloudDoc.get('name') ?? undefined,
            city: cloudDoc.get('city') ?? undefined,
            phone: cloudDoc.get('phone') ?? undefined,
            role: cloudDoc.get('role') ?? 'user',
            isPro: Boolean(cloudDoc.get('isPro')),
          };
        }
      }

      if (storedProfile?.uid) {
        const merged: AppUser = {
          ...storedProfile,
          ...cloudProfile,
          email: storedProfile.email ?? (normalizedEmail || undefined),
        };
        setUser(merged);
        setEmailDraft(merged.email ?? normalizedEmail);
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(merged));
        setStep('authenticated');
        setFeedback({
          type: 'success',
          message: 'Connexion réussie. Bon retour sur Bird.',
        });
        return;
      }

      if (cloudProfile?.uid && cloudProfile.name && cloudProfile.city) {
        setUser(cloudProfile);
        setEmailDraft(cloudProfile.email ?? normalizedEmail);
        await Promise.all([
          AsyncStorage.setItem(profileKey(cloudProfile.uid), JSON.stringify(cloudProfile)),
          AsyncStorage.setItem(SESSION_KEY, JSON.stringify(cloudProfile)),
        ]);
        setStep('authenticated');
        setFeedback({
          type: 'success',
          message: 'Connexion réussie. Profil restauré depuis le cloud.',
        });
        return;
      }

      const draftUser: AppUser = {
        uid: payload.uid,
        email: normalizedEmail || undefined,
        role: 'user',
        isPro: false,
      };
      setUser(draftUser);
      setEmailDraft(normalizedEmail);
      setStep('complete_profile');
      setFeedback({
        type: 'info',
        message:
          payload.modeUsed === 'signup'
            ? 'Compte créé. Termine ton profil.'
            : 'Compte détecté sans profil local. Complète ton profil.',
      });
    },
    [],
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setIsBusy(true);
      clearFeedback();
      setMode('signin');

      const normalizedEmail = normalizeEmail(email);
      setEmailDraft(normalizedEmail);

      try {
        if (!isValidEmail(normalizedEmail)) {
          throw new Error('Adresse email invalide.');
        }
        if (password.length < 6) {
          throw new Error('Mot de passe invalide (minimum 6 caractères).');
        }

        if (USE_MOCK) {
          await promoteAuthenticatedUser({
            uid: `mock-${normalizedEmail || 'user'}`,
            email: normalizedEmail,
            modeUsed: 'signin',
          });
          return;
        }

        const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        await promoteAuthenticatedUser({
          uid: credential.user.uid,
          email: credential.user.email,
          modeUsed: 'signin',
        });
      } catch (error) {
        setFeedback({
          type: 'error',
          message: toReadableAuthError(error),
        });
        throw error;
      } finally {
        setIsBusy(false);
      }
    },
    [clearFeedback, promoteAuthenticatedUser],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      setIsBusy(true);
      clearFeedback();
      setMode('signup');

      const normalizedEmail = normalizeEmail(email);
      setEmailDraft(normalizedEmail);

      try {
        if (!isValidEmail(normalizedEmail)) {
          throw new Error('Adresse email invalide.');
        }
        if (password.length < 6) {
          throw new Error('Mot de passe trop faible (minimum 6 caractères).');
        }

        if (USE_MOCK) {
          await promoteAuthenticatedUser({
            uid: `mock-${normalizedEmail || 'user'}`,
            email: normalizedEmail,
            modeUsed: 'signup',
          });
          return;
        }

        const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        await sendEmailVerification(credential.user).catch(() => undefined);
        await promoteAuthenticatedUser({
          uid: credential.user.uid,
          email: credential.user.email,
          modeUsed: 'signup',
        });
      } catch (error) {
        setFeedback({
          type: 'error',
          message: toReadableAuthError(error),
        });
        throw error;
      } finally {
        setIsBusy(false);
      }
    },
    [clearFeedback, promoteAuthenticatedUser],
  );

  const completeProfile = useCallback(
    async ({ name, city }: { name: string; city: string }) => {
      setIsBusy(true);
      clearFeedback();

      try {
        const trimmedName = name.trim();
        const trimmedCity = city.trim();

        if (trimmedName.length < 2) {
          throw new Error('Le nom doit contenir au moins 2 caractères.');
        }
        if (trimmedCity.length < 2) {
          throw new Error('La ville doit contenir au moins 2 caractères.');
        }
        if (!user?.uid) {
          throw new Error("Session invalide. Recommence l'authentification.");
        }

        if (!USE_MOCK && auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: trimmedName }).catch(() => undefined);
        }

        const completed: AppUser = {
          ...user,
          name: trimmedName,
          city: trimmedCity,
          email: user.email ?? (emailDraft || undefined),
        };

        setUser(completed);
        await Promise.all([
          AsyncStorage.setItem(profileKey(completed.uid), JSON.stringify(completed)),
          AsyncStorage.setItem(SESSION_KEY, JSON.stringify(completed)),
        ]);

        if (!USE_MOCK) {
          await setDoc(
            doc(db, 'users', completed.uid),
            {
              uid: completed.uid,
              email: completed.email ?? null,
              name: completed.name ?? null,
              city: completed.city ?? null,
              role: completed.role ?? 'user',
              isPro: Boolean(completed.isPro),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }

        setStep('authenticated');
        setFeedback({
          type: 'success',
          message: 'Inscription terminée. Ton compte est prêt.',
        });
      } catch (error) {
        setFeedback({
          type: 'error',
          message: toReadableAuthError(error),
        });
        throw error;
      } finally {
        setIsBusy(false);
      }
    },
    [clearFeedback, emailDraft, user],
  );

  const setProStatus = useCallback(
    async (isPro: boolean) => {
      if (!user?.uid) return;
      const updated: AppUser = { ...user, isPro };
      setUser(updated);
      await Promise.all([
        AsyncStorage.setItem(profileKey(updated.uid), JSON.stringify(updated)),
        AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated)),
      ]);

      if (!USE_MOCK) {
        await setDoc(
          doc(db, 'users', updated.uid),
          {
            uid: updated.uid,
            email: updated.email ?? null,
            name: updated.name ?? null,
            city: updated.city ?? null,
            role: updated.role ?? 'user',
            isPro,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      setFeedback({
        type: 'success',
        message: isPro ? 'Mode vendeur PRO activé.' : 'Mode PRO désactivé.',
      });
    },
    [user],
  );

  const logout = useCallback(async () => {
    setIsBusy(true);
    clearFeedback();

    try {
      if (!USE_MOCK && auth.currentUser) {
        await signOut(auth);
      }
      setUser(null);
      setEmailDraft('');
      setPermissionSetupForUid(null);
      await AsyncStorage.removeItem(SESSION_KEY);
      setStep('enter_credentials');
      setMode('signin');
      setFeedback({
        type: 'info',
        message: 'Session fermée.',
      });
    } finally {
      setIsBusy(false);
    }
  }, [clearFeedback]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseUser,
      step,
      mode,
      emailDraft,
      isBusy,
      feedback,
      permissions,
      setMode,
      signInWithEmail,
      signUpWithEmail,
      completeProfile,
      setProStatus,
      logout,
      clearFeedback,
    }),
    [
      user,
      firebaseUser,
      step,
      mode,
      emailDraft,
      isBusy,
      feedback,
      permissions,
      signInWithEmail,
      signUpWithEmail,
      completeProfile,
      setProStatus,
      logout,
      clearFeedback,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
