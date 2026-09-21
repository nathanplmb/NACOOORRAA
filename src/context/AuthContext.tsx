import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut 
} from "firebase/auth";
import { auth } from "../firebase";
import { dbStore } from "../dbStore";

export interface SimulatedUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

interface AuthContextType {
  currentUser: SimulatedUser | null;
  loading: boolean;
  authError: string | null;
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<SimulatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const establishUserSession = async (uid: string, email: string, displayName: string, photoURL?: string) => {
    const user: SimulatedUser = {
      uid,
      email: email.trim().toLowerCase(),
      displayName: displayName.trim() || email.split("@")[0],
      photoURL: photoURL || undefined
    };
    localStorage.setItem("nacora_active_session", JSON.stringify(user));
    setCurrentUser(user);
    await dbStore.initializeForUser(user.uid, user.email, user.displayName);
  };

  useEffect(() => {
    // 1. Check local session for instant load
    const saved = localStorage.getItem("nacora_active_session");
    if (saved) {
      try {
        const user = JSON.parse(saved);
        setCurrentUser(user);
        dbStore.initializeForUser(user.uid, user.email, user.displayName);
      } catch (e) {
        localStorage.removeItem("nacora_active_session");
      }
    }

    // 2. Listen to real Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await establishUserSession(
          firebaseUser.uid,
          firebaseUser.email || "user@nacora.app",
          firebaseUser.displayName || "Utilisateur Google",
          firebaseUser.photoURL || undefined
        );
      }
      setLoading(false);
    }, (error) => {
      console.warn("Auth state warning:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearError = () => {
    setAuthError(null);
  };

  const loginWithGoogle = async () => {
    clearError();
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await establishUserSession(
        user.uid,
        user.email || "utilisateur@nacora.app",
        user.displayName || user.email?.split("@")[0] || "Utilisateur Google",
        user.photoURL || undefined
      );
    } catch (e: any) {
      console.error("Google Auth error:", e);
      const errorCode = e?.code || "";
      const currentHost = typeof window !== "undefined" ? window.location.hostname : "ce domaine";

      if (errorCode === "auth/popup-closed-by-user") {
        setAuthError("La fenêtre de sélection de compte Google a été fermée avant la finalisation.");
      } else if (errorCode === "auth/popup-blocked") {
        setAuthError("La fenêtre contextuelle Google a été bloquée par votre navigateur. Veuillez autoriser les popups pour ce site.");
      } else if (errorCode === "auth/unauthorized-domain") {
        setAuthError(`Le domaine actuel (${currentHost}) n'est pas autorisé dans Firebase. Ajoutez "${currentHost}" dans Firebase Console > Authentication > Paramètres > Domaines autorisés.`);
      } else if (errorCode === "auth/operation-not-allowed") {
        setAuthError("Le fournisseur Google n'est pas activé dans votre projet Firebase (Authentication > Méthode de connexion > Google).");
      } else if (errorCode === "auth/cancelled-popup-request") {
        setAuthError("Une tentative de connexion était déjà en cours.");
      } else {
        setAuthError(e?.message || "Échec de la connexion avec Google. Vérifiez votre configuration Firebase.");
      }
      throw e;
    }
  };

  const loginAsGuest = async () => {
    clearError();
    const uid = "usr_guest_" + Math.random().toString(36).substring(2, 10);
    await establishUserSession(
      uid,
      "candidat.demo@nacora.app",
      "Candidat Démo"
    );
  };

  const logout = async () => {
    clearError();
    localStorage.removeItem("nacora_active_session");
    dbStore.clearUser();
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        authError,
        loginWithGoogle,
        loginAsGuest,
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
