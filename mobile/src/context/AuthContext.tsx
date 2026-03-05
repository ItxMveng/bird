import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ConfirmationResult, onAuthStateChanged, signInWithPhoneNumber, User } from 'firebase/auth';
import { auth, USE_MOCK } from '../services/firebase';
import { AppUser } from '../types';

type AuthStep = 'loading' | 'enter_phone' | 'enter_otp' | 'complete_profile' | 'authenticated';

type AuthContextValue = {
  user: AppUser | null;
  firebaseUser: User | null;
  step: AuthStep;
  phoneDraft: string;
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (otp: string) => Promise<boolean>;
  completeProfile: (payload: { name: string; city: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const SESSION_KEY = 'bird.session.v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [step, setStep] = useState<AuthStep>('loading');
  const [phoneDraft, setPhoneDraft] = useState('+2376');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    let mounted = true;
    const restore = async () => {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (raw && mounted) {
        const parsed = JSON.parse(raw) as AppUser;
        setUser(parsed);
        setStep('authenticated');
      }
      if (!raw && mounted) setStep('enter_phone');
    };
    restore();

    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseUser,
      step,
      phoneDraft,
      requestOtp: async (phone: string) => {
        setPhoneDraft(phone);
        if (USE_MOCK) {
          setStep('enter_otp');
          return;
        }
        const result = await signInWithPhoneNumber(auth, phone);
        setConfirmationResult(result);
        setStep('enter_otp');
      },
      verifyOtp: async (otp: string) => {
        if (USE_MOCK) {
          const ok = otp.trim() === '000000';
          if (ok) {
            setUser({ uid: 'user-demo', phone: phoneDraft, role: 'user', isPro: false });
            setStep('complete_profile');
          }
          return ok;
        }

        if (!confirmationResult) return false;
        await confirmationResult.confirm(otp);
        const uid = auth.currentUser?.uid;
        if (!uid) return false;
        setUser({ uid, phone: phoneDraft, role: 'user', isPro: false });
        setStep('complete_profile');
        return true;
      },
      completeProfile: async ({ name, city }) => {
        const completed = { ...(user as AppUser), name, city };
        setUser(completed);
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(completed));
        setStep('authenticated');
      },
      logout: async () => {
        setUser(null);
        setConfirmationResult(null);
        await AsyncStorage.removeItem(SESSION_KEY);
        setStep('enter_phone');
      },
    }),
    [user, firebaseUser, step, phoneDraft, confirmationResult],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
