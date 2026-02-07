'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, query, where, getDocs, collection } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole } from './types';

export interface SignUpProfile {
  studentId: string;
  role: UserRole;
  hostelId?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, profileData: SignUpProfile) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          const data = profileDoc.data() as UserProfile;
          if (data.role === 'office') {
            setProfile(data);
          } else {
            const raAccessSnap = await getDocs(
              query(collection(db, 'raAccess'), where('studentId', '==', data.studentId))
            );
            const hasRaAccess = !raAccessSnap.empty || data.role === 'ra';
            const effectiveRole: UserRole = hasRaAccess ? 'ra' : 'resident';
            setProfile({ ...data, role: effectiveRole });
          }
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, profileData: SignUpProfile) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    await setDoc(doc(db, 'users', uid), {
      uid,
      email,
      studentId: profileData.studentId,
      role: profileData.role,
      hostelId: profileData.hostelId || '',
      roomNumber: null,
      createdAt: Timestamp.now(),
    });
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
