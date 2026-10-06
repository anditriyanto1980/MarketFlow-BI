import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import { auth } from '@/src/lib/firebase/client';
import { getUserProfile, createUserProfile } from '@/src/services/user.service';
import {
  getUserBusinesses,
  getBusiness,
  getMemberRole,
} from '@/src/services/business.service';
import type { UserProfile, BusinessMember, UserRole } from '@/src/types/auth';
import type { Business } from '@/src/types/business';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  currentBusiness: Business | null;
  currentMembership: BusinessMember | null;
  currentRole: UserRole | null;
  userBusinesses: Business[];
  loading: boolean;
  switchBusiness: (businessId: string) => Promise<void>;
  refreshBusiness: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_BUSINESS_KEY = 'marketflow_active_business_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [currentMembership, setCurrentMembership] = useState<BusinessMember | null>(null);
  const [userBusinesses, setUserBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadBusinessData = useCallback(
    async (userId: string, preferredBusinessId?: string, defaultBusinessId?: string) => {
      try {
        const businesses = await getUserBusinesses(userId, defaultBusinessId);
        setUserBusinesses(businesses);

        let targetBusiness: Business | null = null;
        const savedId = preferredBusinessId || localStorage.getItem(CURRENT_BUSINESS_KEY);

        if (savedId) {
          targetBusiness = businesses.find((b) => b.id === savedId) || null;
        }

        if (!targetBusiness && businesses.length > 0) {
          targetBusiness = businesses[0];
        }

        if (targetBusiness) {
          localStorage.setItem(CURRENT_BUSINESS_KEY, targetBusiness.id);
          setCurrentBusiness(targetBusiness);
          const member = await getMemberRole(targetBusiness.id, userId);
          setCurrentMembership(member);
        } else {
          localStorage.removeItem(CURRENT_BUSINESS_KEY);
          setCurrentBusiness(null);
          setCurrentMembership(null);
        }
      } catch (err) {
        console.error('Error loading business workspace:', err);
      }
    },
    []
  );

  const refreshProfile = useCallback(async () => {
    if (!currentUser) return;
    try {
      const profile = await getUserProfile(currentUser.uid);
      setUserProfile(profile);
      if (profile?.onboardingCompleted) {
        await loadBusinessData(currentUser.uid, undefined, profile.defaultBusinessId);
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
    }
  }, [currentUser, loadBusinessData]);

  const refreshBusiness = useCallback(async () => {
    if (!currentUser) return;
    await loadBusinessData(currentUser.uid, currentBusiness?.id, userProfile?.defaultBusinessId);
  }, [currentUser, currentBusiness?.id, userProfile?.defaultBusinessId, loadBusinessData]);

  const switchBusiness = useCallback(
    async (businessId: string) => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const b = await getBusiness(businessId);
        if (b) {
          localStorage.setItem(CURRENT_BUSINESS_KEY, b.id);
          setCurrentBusiness(b);
          const member = await getMemberRole(b.id, currentUser.uid);
          setCurrentMembership(member);
        }
      } finally {
        setLoading(false);
      }
    },
    [currentUser]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          let profile = await getUserProfile(user.uid);
          if (!profile) {
            // First time login/register sync
            profile = await createUserProfile(user.uid, {
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'User',
              photoURL: user.photoURL || '',
            });
          }
          setUserProfile(profile);

          if (profile.onboardingCompleted) {
            await loadBusinessData(user.uid, undefined, profile.defaultBusinessId);
          } else {
            setCurrentBusiness(null);
            setCurrentMembership(null);
            setUserBusinesses([]);
          }
        } catch (err) {
          console.error('Auth state initialization error:', err);
        }
      } else {
        setUserProfile(null);
        setCurrentBusiness(null);
        setCurrentMembership(null);
        setUserBusinesses([]);
        localStorage.removeItem(CURRENT_BUSINESS_KEY);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [loadBusinessData]);

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string, displayName: string) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const profile = await createUserProfile(cred.user.uid, {
        email: cred.user.email || email.trim(),
        displayName: displayName.trim() || email.split('@')[0],
      });
      setUserProfile(profile);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      let profile = await getUserProfile(cred.user.uid);
      if (!profile) {
        profile = await createUserProfile(cred.user.uid, {
          email: cred.user.email || '',
          displayName: cred.user.displayName || 'Google User',
          photoURL: cred.user.photoURL || '',
        });
      }
      setUserProfile(profile);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      localStorage.removeItem(CURRENT_BUSINESS_KEY);
      setCurrentUser(null);
      setUserProfile(null);
      setCurrentBusiness(null);
      setCurrentMembership(null);
      setUserBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        currentBusiness,
        currentMembership,
        currentRole: currentMembership?.role || null,
        userBusinesses,
        loading,
        switchBusiness,
        refreshBusiness,
        refreshProfile,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
