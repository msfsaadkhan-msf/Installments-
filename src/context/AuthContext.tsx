import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { User } from '../types';
import {
  getCurrentUser,
  getUsers,
  saveCurrentUser,
  saveUsers,
  clearCurrentUser,
  updateCurrentUser,
  getLastUser,
  saveLastUser,
} from '../services/storage';
import { generateId } from '../utils/date';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// ─── Demo Credentials ─────────────────────────────────
const DEMO_USER: User = {
  id: 'demo-admin',
  name: 'Atif Aslam',
  email: 'admin@ims.pk',
  phone: '0300-1234567',
  role: 'admin',
};

const DEMO_PASSWORD = 'admin123';

// ─── Provider ─────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check persisted session on app load
  useEffect(() => {
    let isMounted = true;
    
    (async () => {
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('TIMEOUT'), 3000));
      
      try {
        const result = await Promise.race([getCurrentUser(), timeoutPromise]);
        
        if (!isMounted) return;

        if (result === 'TIMEOUT') {
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        const user = result as User | null;
        
        if (user) {
          dispatch({ type: 'LOGIN', payload: user });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (err) {
        if (isMounted) dispatch({ type: 'SET_LOADING', payload: false });
      }
    })();

    return () => { isMounted = false; };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Check demo credentials first
      if (email.toLowerCase() === DEMO_USER.email && password === DEMO_PASSWORD) {
        await saveCurrentUser(DEMO_USER);
        await saveLastUser(DEMO_USER);
        dispatch({ type: 'LOGIN', payload: DEMO_USER });
        return { success: true };
      }

      // Check registered users
      const users = await getUsers();
      const found = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );

      if (!found) {
        return { success: false, error: 'Account not found. Please register first.' };
      }

      // For now we store password in a simple way
      const passwordsRaw = await AsyncStorage.getItem('@ims_passwords');
      const passwords = JSON.parse(passwordsRaw || '{}');

      if (passwords[found.id] !== password) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }

      await saveCurrentUser(found);
      await saveLastUser(found);
      dispatch({ type: 'LOGIN', payload: found });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const register = async (name: string, email: string, phone: string, password: string) => {
    try {
      const users = await getUsers();
      const exists = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );

      if (exists) {
        return { success: false, error: 'An account with this email already exists.' };
      }

      const newUser: User = {
        id: generateId(),
        name,
        email: email.toLowerCase(),
        phone,
        role: 'admin',
      };

      users.push(newUser);
      await saveUsers(users);

      // Store password
      const passwordsRaw = await AsyncStorage.getItem('@ims_passwords');
      const passwords = JSON.parse(passwordsRaw || '{}');
      passwords[newUser.id] = password;
      await AsyncStorage.setItem('@ims_passwords', JSON.stringify(passwords));

      await saveCurrentUser(newUser);
      await saveLastUser(newUser);
      dispatch({ type: 'LOGIN', payload: newUser });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    await clearCurrentUser();
    dispatch({ type: 'LOGOUT' });
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const updated = await updateCurrentUser(data);
      if (updated) {
        dispatch({ type: 'LOGIN', payload: updated });
        return { success: true };
      }
      return { success: false, error: 'User not found' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Update failed' };
    }
  };

  const bioLogin = async () => {
    try {
      const lastUser = await getLastUser();
      if (!lastUser) {
        return { success: false, error: 'No user registered for biometric login.' };
      }
      await saveCurrentUser(lastUser);
      dispatch({ type: 'LOGIN', payload: lastUser });
      return { success: true };
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
