import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut 
} from "firebase/auth";
import { auth } from "../firebase";
import { dbStore } from "../dbStore";

export const WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
];

// In-memory token cache (strictly not persisted in localStorage/sessionStorage as required)
let cachedAccessToken: string | null = null;

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export interface SimulatedUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

interface AuthContextType {
  currentUser: SimulatedUser | null;
  accessToken: string | null;
  loading: boolean;
  authError: string | null;
  loginWithGoogle: () => Promise<string | null>;
  loginWithEmail: (email: string, displayName?: string) => Promise<void>;
  connectGoogleWorkspace: () => Promise<string | null>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  hasGoogleWorkspaceAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<SimulatedUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const createGoogleLoginProvider = () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return provider;
  };

  const createWorkspaceProvider = () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "consent" });
    WORKSPACE_SCOPES.forEach((scope) => provider.addScope(scope));
    return provider;
  };

  const establishUserSession = (uid: string, email: string, displayName: string, photoURL?: string) => {
    // If switching user, wipe any previously loaded in-memory state immediately (0ms)
    if (currentUser && currentUser.uid !== uid) {
      dbStore.clearUser();
    }
    const user: SimulatedUser = {
      uid,
      email: email.trim().toLowerCase(),
      displayName: displayName.trim() || email.split("@")[0],
      photoURL: photoURL || undefined
    };
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("nacora_active_session", JSON.stringify(user));
      } catch (_) {}
    }
    setCurrentUser(user);
    setLoading(false);
    
    // Background cloud sync, strictly non-blocking
    dbStore.initializeForUser(user.uid, user.email, user.displayName).catch(err => {
      console.warn("[Auth] Background initialize notice:", err);
    });
  };

  useEffect(() => {
    // 1. Instant load from local session (0ms render)
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("nacora_active_session");
      if (saved) {
        try {
          const user = JSON.parse(saved);
          setCurrentUser(user);
          setLoading(false);
          dbStore.initializeForUser(user.uid, user.email, user.displayName).catch(() => {});
        } catch (e) {
          try {
            localStorage.removeItem("nacora_active_session");
          } catch (_) {}
        }
      }
    }

    // Safety timeout: Never keep the loading screen longer than 400ms
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 400);

    // 2. Listen to real Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(safetyTimer);
      if (firebaseUser) {
        establishUserSession(
          firebaseUser.uid,
          firebaseUser.email || "user@nacora.app",
          firebaseUser.displayName || "Utilisateur Google",
          firebaseUser.photoURL || undefined
        );
      } else {
        cachedAccessToken = null;
        setAccessToken(null);
        setCurrentUser(null);
        dbStore.clearUser();
        if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
          try {
            localStorage.removeItem("nacora_active_session");
          } catch (_) {}
        }
      }
      setLoading(false);
    }, (error) => {
      clearTimeout(safetyTimer);
      console.warn("Auth state warning:", error);
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const clearError = () => {
    setAuthError(null);
  };

  const loginWithGoogle = async (): Promise<string | null> => {
    clearError();
    try {
      const provider = createGoogleLoginProvider();
      console.log("[Auth] Calling signInWithPopup...");
      const startPopup = Date.now();
      const result = await signInWithPopup(auth, provider);
      console.log(`[Auth] signInWithPopup took ${Date.now() - startPopup}ms`);
      const user = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      
      if (token) {
        cachedAccessToken = token;
        setAccessToken(token);
      }

      await establishUserSession(
        user.uid,
        user.email || "utilisateur@nacora.app",
        user.displayName || user.email?.split("@")[0] || "Utilisateur Google",
        user.photoURL || undefined
      );

      return token;
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
      } else if (errorCode === "auth/access-denied" || String(e?.message).includes("access_denied") || String(e?.message).includes("procédure de validation")) {
        setAuthError("L'écran de consentement OAuth Google est en mode Test. Ajoutez votre adresse email dans Google Cloud Console > Écran de consentement OAuth > Utilisateurs test, ou passez l'application en mode Production.");
      } else {
        setAuthError(e?.message || "Échec de la connexion avec Google. Vérifiez votre configuration Firebase.");
      }
      throw e;
    }
  };

  const connectGoogleWorkspace = async (): Promise<string | null> => {
    clearError();
    try {
      const provider = createWorkspaceProvider();
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      if (token) {
        cachedAccessToken = token;
        setAccessToken(token);
      }
      return token;
    } catch (e: any) {
      console.error("Google Workspace Auth error:", e);
      setAuthError(e?.message || "Échec de la connexion aux services Google Workspace.");
      throw e;
    }
  };

  const loginWithEmail = async (email: string, displayName?: string) => {
    clearError();
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setAuthError("Veuillez saisir une adresse email valide.");
      return;
    }

    const name = displayName?.trim() || (cleanEmail === "nathpa1423@gmail.com" ? "Nathan Palumbo" : cleanEmail.split("@")[0]);
    const uid = cleanEmail === "nathpa1423@gmail.com" 
      ? "32UA6me7itQe0JBHIhzMNDaEIrI2" 
      : `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;

    cachedAccessToken = null;
    setAccessToken(null);

    await establishUserSession(
      uid,
      cleanEmail,
      name
    );
  };

  const loginAsGuest = async () => {
    clearError();
    const uid = "usr_guest_" + Math.random().toString(36).substring(2, 10);
    cachedAccessToken = null;
    setAccessToken(null);
    await establishUserSession(
      uid,
      "candidat.demo@nacora.app",
      "Candidat Démo"
    );
  };

  const logout = async () => {
    clearError();
    cachedAccessToken = null;
    setAccessToken(null);
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        localStorage.removeItem("nacora_active_session");
      } catch (_) {}
    }
    dbStore.clearUser();
    setCurrentUser(null);
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        accessToken,
        loading,
        authError,
        loginWithGoogle,
        loginWithEmail,
        connectGoogleWorkspace,
        loginAsGuest,
        logout,
        clearError,
        hasGoogleWorkspaceAuth: Boolean(accessToken)
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
