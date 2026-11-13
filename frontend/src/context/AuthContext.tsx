import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { type User, onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { authApi, type UserProfile, ApiError } from '../services/api';

interface AuthContextType {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  needsUsername: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [needsUsername, setNeedsUsername] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const profileRequest = useRef(0);

  const fetchProfile = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    const request = ++profileRequest.current;
    const isCurrent = () => request === profileRequest.current && auth.currentUser?.uid === user.uid;
    setLoading(true);
    setProfileError(null);
    try {
      const res = await authApi.getMyProfile();
      if (!isCurrent()) return;
      setProfile(res.user);
      setNeedsUsername(!res.user.username?.trim());
    } catch (err) {
      if (!isCurrent()) return;
      setProfile(null);
      if (err instanceof ApiError && err.code === 'PROFILE_NOT_FOUND') {
        // Usuario logueado con Google pero sin perfil completado en Firestore
        setNeedsUsername(true);
      } else {
        setNeedsUsername(false);
        setProfileError('No pudimos verificar tu perfil. Reintenta para continuar.');
        throw err;
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      ++profileRequest.current;
      setProfile(null);
      setNeedsUsername(false);
      setProfileError(null);
      // El handler de Google informa el rechazo y cierra la sesión. No redirigir
      // antes de que pueda mostrar ese mensaje ni consultar un perfil no admitido.
      const acceptedUser = user?.email?.toLowerCase().endsWith('.edu.co') ? user : null;
      setFirebaseUser(acceptedUser);
      if (acceptedUser) {
        try {
          await fetchProfile();
        } catch {
          // El error recuperable se presenta en los guards; nunca se abre el panel.
        }
      } else {
        setLoading(false);
      }
    });

    return () => {
      ++profileRequest.current;
      unsubscribe();
    };
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    await fbSignOut(auth);
    ++profileRequest.current;
    setFirebaseUser(null);
    setProfile(null);
    setNeedsUsername(false);
    setProfileError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // US-03 E4: al volver con el botón atrás, el navegador puede restaurar esta
    // página desde su caché (bfcache) con el estado de una sesión ya cerrada,
    // lo que dejaría datos privados a la vista. Se recarga para volver a leer
    // la sesión real de Firebase y proteger las rutas privadas.
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        needsUsername,
        profileError,
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
