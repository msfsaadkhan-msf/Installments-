import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { User } from '../types';
import { auth, db } from '../services/firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLastUser, saveLastUser, saveCurrentUser, clearCurrentUser, syncFromCloud, syncDirtyKeys } from '../services/storage';
import NetInfo from '@react-native-community/netinfo';

// ─── State ────────────────────────────────────────────
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' };

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isLoggedIn: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN':
      return { user: action.payload, isLoading: false, isLoggedIn: true };
    case 'LOGOUT':
      return { user: null, isLoading: false, isLoggedIn: false };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  bioLogin: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Listen for Firebase Auth state changes globally
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Hydrate from local cache instantly — works 100% offline
        const cachedUserRaw = await AsyncStorage.getItem('@ims_user');
        if (cachedUserRaw) {
          dispatch({ type: 'LOGIN', payload: JSON.parse(cachedUserRaw) });
        }
        
        // Background: fetch latest user doc + sync cloud data (only if online)
        getDoc(doc(db, 'users', firebaseUser.uid)).then(async (userDoc) => {
          if (userDoc.exists()) {
             const userData = userDoc.data() as User;
             await syncFromCloud();
             await syncDirtyKeys(); // Push any offline-queued writes
             dispatch({ type: 'LOGIN', payload: userData });
             await saveCurrentUser(userData);
             await saveLastUser(userData);
          }
        }).catch(_err => { /* silently ignore cloud sync failure */ });
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    });

    // NetInfo listener: auto-sync dirty keys whenever internet reconnects
    const unsubscribeNetInfo = NetInfo.addEventListener((state: any) => {
      if (state.isConnected && state.isInternetReachable && auth.currentUser) {
        syncDirtyKeys().catch(() => {});
      }
    });

    return () => {
      unsubscribe();
      unsubscribeNetInfo();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (!userDoc.exists()) {
        await signOut(auth);
        return { success: false, error: 'User data not found in database.' };
      }

      await saveCurrentUser(userDoc.data() as User);
      dispatch({ type: 'LOGIN', payload: userDoc.data() as User });
      // Push any pending offline writes now that we're online
      syncDirtyKeys().catch(() => {});
      return { success: true };
    } catch (err: any) {
      // ── Offline fallback: let user in using cached credentials ──
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        const cachedUserRaw = await AsyncStorage.getItem('@ims_user');
        if (cachedUserRaw) {
          const cachedUser = JSON.parse(cachedUserRaw) as User;
          // Check email matches cached user so wrong credentials don't bypass login
          if (cachedUser.email?.toLowerCase() === email.toLowerCase()) {
            dispatch({ type: 'LOGIN', payload: cachedUser });
            return { success: true };
          }
        }
        return { success: false, error: 'No internet connection. Please connect and try again.' };
      }

      let errorMessage = 'Login failed';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password.';
      }
      return { success: false, error: errorMessage };
    }
  };

  const register = async (name: string, email: string, phone: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      const newUser: User = {
        id: uid,
        name,
        email: email.toLowerCase(),
        phone,
        role: 'admin',
      };

      // Save user to Firestore
      await setDoc(doc(db, 'users', uid), newUser);

      // Explicitly lock the user in memory and cache so race conditions don't boot them out
      await saveCurrentUser(newUser);
      dispatch({ type: 'LOGIN', payload: newUser });

      return { success: true };
    } catch (err: any) {
      let errorMessage = 'Registration failed';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      }
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // State updates automatically
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      if (!auth.currentUser || !state.user) return { success: false, error: 'Not logged in' };
      
      const updatedUser = { ...state.user, ...data };
      await setDoc(doc(db, 'users', auth.currentUser.uid), updatedUser, { merge: true });
      
      dispatch({ type: 'LOGIN', payload: updatedUser });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Update failed' };
    }
  };

  const bioLogin = async () => {
    try {
      const last = await getLastUser();
      // Notice: Since Firebase handles session persistence automatically, 
      // if someone is logging via biometrics and there is NO active Firebase session, 
      // they MUST re-enter their password (or we have to store logic for custom token).
      // For this implementation, if Firebase auto-login triggered, bioLogin is just unlocking 
      // the screen rather than re-authenticating Firebase.
      if (!last) return { success: false, error: 'No user registered for biometric login.' };
      
      // If Firebase still says we have a currentUser (cached session), just proceed
      if (auth.currentUser) {
        dispatch({ type: 'LOGIN', payload: last });
        return { success: true };
      } else {
        return { success: false, error: 'Session expired. Please log in with password.' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Biometric login failed' };
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateProfile, bioLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

