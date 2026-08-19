import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase';

interface DemoUser {
  uid: string;
  email: string;
  displayName: string;
  isDemo: boolean;
}

export type AuthUser = (User | DemoUser) & {
  email?: string | null;
  displayName?: string | null;
};

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsDemoAdmin: (email?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEMO_USER_STORAGE_KEY = 'abc_lubricants_demo_admin_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(DEMO_USER_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        // Check if demo user exists in local storage
        try {
          const stored = localStorage.getItem(DEMO_USER_STORAGE_KEY);
          if (stored) {
            setUser(JSON.parse(stored));
          } else {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function login(email: string, password: string) {
    if (isFirebaseConfigured && auth) {
      await signInWithEmailAndPassword(auth, email, password);
      localStorage.removeItem(DEMO_USER_STORAGE_KEY);
    } else {
      // Local demo mode sign in
      const demoUser: DemoUser = {
        uid: 'demo-admin-id',
        email: email.trim() || 'admin@abclubricants.com',
        displayName: 'Demo Administrator',
        isDemo: true,
      };
      localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(demoUser));
      setUser(demoUser);
    }
  }

  async function loginWithGoogle() {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase Auth is not configured for Google Sign-In.');
    }
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    localStorage.removeItem(DEMO_USER_STORAGE_KEY);
  }

  function loginAsDemoAdmin(email = 'admin@abclubricants.com') {
    const demoUser: DemoUser = {
      uid: 'demo-admin-id',
      email,
      displayName: 'Catalog Administrator',
      isDemo: true,
    };
    localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(demoUser));
    setUser(demoUser);
  }

  async function logout() {
    localStorage.removeItem(DEMO_USER_STORAGE_KEY);
    setUser(null);
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured: isFirebaseConfigured,
        login,
        loginWithGoogle,
        loginAsDemoAdmin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
