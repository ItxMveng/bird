import React, { createContext, useContext, useMemo, useState } from 'react';
import { AppUser } from '../types';

type AuthContextValue = {
  user: AppUser | null;
  loginWithPhone: (phone: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loginWithPhone: (phone: string) =>
        setUser({
          uid: 'user-demo',
          phone,
          name: 'Utilisateur Bird',
          city: 'Douala',
        }),
      logout: () => setUser(null),
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
