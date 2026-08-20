import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Profile } from '../lib/types';
import { loadStoredUser, saveStoredUser, clearStoredUser } from '../lib/storage';
import { supabase } from '../lib/supabase';

interface UserContextValue {
  user: Profile | null;
  loading: boolean;
  setUser: (user: Profile | null) => void;
  refreshUser: () => Promise<void>;
  signOut: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = loadStoredUser();
    if (stored) {
      setUserState(stored);
      (async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', stored.id)
            .maybeSingle();
          if (data) {
            const fresh = data as Profile;
            saveStoredUser(fresh);
            setUserState(fresh);
          }
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setLoading(false);
    }
  }, []);

  const setUser = (u: Profile | null) => {
    setUserState(u);
    if (u) saveStoredUser(u);
  };

  const refreshUser = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (data) {
      const fresh = data as Profile;
      saveStoredUser(fresh);
      setUserState(fresh);
    }
  };

  const signOut = () => {
    clearStoredUser();
    setUserState(null);
  };

  return (
    <UserContext.Provider value={{ user, loading, setUser, refreshUser, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
