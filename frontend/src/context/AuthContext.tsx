import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { type User, onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { authApi, type UserProfile, ApiError } from '../services/api';

interface AuthContextType {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  needsUsername: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [needsUsername, setNeedsUsername] = useState<boolean>(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await authApi.getMyProfile();
      setProfile(res.user);
      setNeedsUsername(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PROFILE_NOT_FOUND') {
        // Usuario logueado con Google pero sin perfil completado en Firestore
        setProfile(null);
        setNeedsUsername(true);
      } else {
        console.error('Error al sincronizar perfil de usuario:', err);
        setProfile(null);
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await fetchProfile();
      } else {
        setProfile(null);
        setNeedsUsername(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  const logout = async () => {
    await fbSignOut(auth);
    setFirebaseUser(null);
    setProfile(null);
    setNeedsUsername(false);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        needsUsername,
        refreshProfile: fetchProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};