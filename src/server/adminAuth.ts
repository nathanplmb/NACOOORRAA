import { Request, Response, NextFunction } from "express";
import { verifyServerToken, serverDb } from "./firebaseAdmin.ts";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { UserRole } from "../types/admin.ts";

export interface AuthenticatedAdmin {
  uid: string;
  email?: string;
  role: UserRole;
  tokenClaims: Record<string, any>;
}

export interface AdminRequest extends Request {
  adminUser?: AuthenticatedAdmin;
}

// Runtime configured bootstrap super-admin (from AI Studio runtime metadata)
const BOOTSTRAP_ADMIN_EMAIL = "nathpa1423@gmail.com";

/**
 * Centralized server authorization middleware for all /api/admin/* routes
 * 1. Extracts the Firebase ID Token from Authorization header (Bearer)
 * 2. Cryptographically verifies it using Firebase Admin public keys
 * 3. Extracts UID and claims
 * 4. Verifies admin custom claim or authoritative Firestore role in /admins/{uid}
 * 5. Rejects unauthorized requests with 401 or 403 JSON
 */
export function requireAdmin(allowedRoles: UserRole[] = ["admin", "support", "viewer"]) {
  return async (req: AdminRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Accès non authentifié. En-tête Authorization Bearer requis."
      });
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Token d'autorisation vide."
      });
    }

    try {
      // Step 2 & 3: Cryptographic verification of the token
      const decoded = await verifyServerToken(token);
      const uid = decoded.uid;
      const email = (decoded.email || "").toLowerCase();

      // Step 4: Determine administrator role
      let resolvedRole: UserRole | null = null;

      // Check bootstrap super-admin identity first
      if (email === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
        resolvedRole = "admin";
      } else if (decoded.role === "admin" || decoded.admin === true) {
        resolvedRole = "admin";
      } else if (decoded.role === "support") {
        resolvedRole = "support";
      } else if (decoded.role === "viewer") {
        resolvedRole = "viewer";
      }

      // If no custom claim found in token, optionally check the authoritative Firestore collection /admins/{uid}
      if (!resolvedRole) {
        try {
          const adminDocRef = doc(serverDb, "admins", uid);
          const adminDocSnap = await getDoc(adminDocRef);
          if (adminDocSnap.exists()) {
            const data = adminDocSnap.data();
            if (data?.role && ["admin", "support", "viewer"].includes(data.role)) {
              resolvedRole = data.role as UserRole;
            }
          }
        } catch (_) {
          // If Firestore is locked down or transient error, proceed to permission verification
        }
      }

      // Step 5: Check permissions against required role hierarchy
      if (!resolvedRole || !allowedRoles.includes(resolvedRole)) {
        return res.status(403).json({
          success: false,
          error: "Accès refusé. Privilèges administrateur insuffisants.",
          code: "INSUFFICIENT_PERMISSIONS",
          requiredRoles: allowedRoles,
          currentRole: resolvedRole || "user"
        });
      }

      // Populate verified admin in request object
      req.adminUser = {
        uid,
        email,
        role: resolvedRole,
        tokenClaims: decoded
      };

      return next();
    } catch (error: any) {
      console.error("[AdminAuth] Token verification failed:", error.message || error);
      return res.status(401).json({
        success: false,
        error: "Session invalide ou expirée. Veuillez vous reconnecter.",
        code: "AUTH_TOKEN_INVALID"
      });
    }
  };
}
