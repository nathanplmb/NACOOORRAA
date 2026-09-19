import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  updateProfile
} from "firebase/auth";
import { auth } from "../firebase";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  authError: string | null;
  isOperationNotAllowed: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, fullName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getFriendlyAuthErrorMessage(errorCode: string): { message: string; isNotAllowed: boolean } {
  switch (errorCode) {
    case "auth/invalid-email":
      return { message: "L'adresse e-mail n'est pas valide.", isNotAllowed: false };
    case "auth/user-disabled":
      return { message: "Ce compte utilisateur a été désactivé.", isNotAllowed: false };
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return { message: "Adresse e-mail ou mot de passe incorrect.", isNotAllowed: false };
    case "auth/email-already-in-use":
      return { message: "Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.", isNotAllowed: false };
    case "auth/weak-password":
      return { message: "Le mot de passe doit comporter au moins 6 caractères.", isNotAllowed: false };
    case "auth/operation-not-allowed":
      return { 
        message: "L'authentification par e-mail et mot de passe n'est pas encore activée dans votre console Firebase.", 
        isNotAllowed: true 
      };
    case "auth/popup-closed-by-user":
      return { message: "La fenêtre de connexion Google a été fermée avant la fin de l'authentification.", isNotAllowed: false };
    case "auth/popup-blocked":
      return { message: "La fenêtre popup de connexion a été bloquée par votre navigateur. Veuillez autoriser les popups.", isNotAllowed: false };
    default:
      return { message: `Erreur d'authentification (${errorCode}).`, isNotAllowed: false };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const clearError = () => {
    setAuthError(null);
    setIsOperationNotAllowed(false);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    clearError();
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      const { message, isNotAllowed } = getFriendlyAuthErrorMessage(err?.code || "");
      setAuthError(message);
      setIsOperationNotAllowed(isNotAllowed);
      throw err;
    }
  };

  const registerWithEmail = async (email: string, pass: string, fullName: string) => {
    clearError();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (fullName.trim()) {
        await updateProfile(userCredential.user, {
          displayName: fullName.trim()
        });
        // Force refresh local user object
        setCurrentUser({ ...userCredential.user, displayName: fullName.trim() });
      }
    } catch (err: any) {
      const { message, isNotAllowed } = getFriendlyAuthErrorMessage(err?.code || "");
      setAuthError(message);
      setIsOperationNotAllowed(isNotAllowed);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    clearError();
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        const { message, isNotAllowed } = getFriendlyAuthErrorMessage(err?.code || "");
        setAuthError(message);
        setIsOperationNotAllowed(isNotAllowed);
      }
      throw err;
    }
  };

  const logout = async () => {
    clearError();
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        authError,
        isOperationNotAllowed,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
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
