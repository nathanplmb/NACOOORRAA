import { serverDb } from "./firebaseAdmin.ts";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { DataHealthReport } from "../types/admin.ts";
import { getUserCreditSummary } from "./creditsEngine.ts";

export async function runDataHealthAudit(): Promise<DataHealthReport> {
  const timestamp = new Date().toISOString();

  const orphanedAuthUsers: Array<{ uid: string; email: string; reason: string }> = [];
  const orphanedProfiles: Array<{ id: string; email: string; reason: string }> = [];
  const orphanedContacts: Array<{ id: string; name: string; company?: string }> = [];
  const orphanedCompanies: Array<{ id: string; name: string }> = [];
  const creditInconsistencies: Array<{ userId: string; email: string; recordedBalance: number; calculatedLedgerBalance: number; delta: number }> = [];
  const orphanedTransactions: Array<{ id: string; userId: string; reason: string }> = [];
  const orphanedSessions: Array<{ id: string; userId: string; reason: string }> = [];
  const brokenReferences: Array<{ type: string; id: string; detail: string }> = [];

  try {
    // 1. Fetch all users in collection "users"
    const usersColRef = collection(serverDb, "users");
    const usersSnap = await getDocs(usersColRef);
    const existingUserIds = new Set<string>();

    for (const d of usersSnap.docs) {
      const u = d.data();
      const uid = d.id;
      existingUserIds.add(uid);

      // Check profile presence and integrity
      if (!u.profile || typeof u.profile !== "object") {
        orphanedProfiles.push({
          id: uid,
          email: u.email || "Non renseigné",
          reason: "Document utilisateur présent mais objet 'profile' absent ou mal formaté"
        });
      } else if (!u.email && !u.profile?.email) {
        orphanedProfiles.push({
          id: uid,
          email: "Aucun email",
          reason: "Profil utilisateur sans adresse email valide"
        });
      }

      // Check credit consistency for this user
      try {
        const creditSum = await getUserCreditSummary(uid);
        if (!creditSum.isConsistent) {
          creditInconsistencies.push({
            userId: uid,
            email: u.email || u.profile?.email || "Inconnu",
            recordedBalance: creditSum.recordedBalance,
            calculatedLedgerBalance: creditSum.calculatedLedgerBalance,
            delta: creditSum.recordedBalance - creditSum.calculatedLedgerBalance
          });
        }
      } catch (cErr) {
        console.warn(`[DataHealth] Error auditing credits for ${uid}:`, cErr);
      }

      // Check orphan contacts or companies inside user document
      if (Array.isArray(u.contacts)) {
        const companyNames = new Set(
          (Array.isArray(u.companies) ? u.companies : []).map((c: any) => (c.name || "").trim().toLowerCase())
        );

        for (const ct of u.contacts) {
          if (!ct.name && !ct.firstName && !ct.lastName) {
            orphanedContacts.push({
              id: ct.id || "unknown",
              name: "Contact anonyme/sans nom",
              company: ct.company
            });
          } else if (ct.company && !companyNames.has(ct.company.trim().toLowerCase())) {
            // Note: Contact attached to an enterprise not in companies list
            // Not necessarily a fatal error, but a broken relational link
            brokenReferences.push({
              type: "contact_company_ref",
              id: ct.id || uid,
              detail: `Contact "${ct.name || ct.firstName}" rattaché à l'entreprise "${ct.company}" non répertoriée dans le portefeuille d'entreprises`
            });
          }
        }
      }

      if (Array.isArray(u.companies)) {
        for (const comp of u.companies) {
          if (!comp.name) {
            orphanedCompanies.push({
              id: comp.id || "unknown",
              name: "Entreprise sans nom"
            });
          }
        }
      }
    }

    // 2. Audit Credit Transactions for orphaned user references
    try {
      const txColRef = collection(serverDb, "credit_transactions");
      const txSnap = await getDocs(txColRef);
      for (const tDoc of txSnap.docs) {
        const tx = tDoc.data();
        if (!tx.userId || !existingUserIds.has(tx.userId)) {
          orphanedTransactions.push({
            id: tDoc.id,
            userId: tx.userId || "Non défini",
            reason: `Transaction de crédit orpheline : l'utilisateur '${tx.userId}' n'existe pas dans la base`
          });
        }
      }
    } catch (_) {
      // Permission restricted or quota reached
    }

    // 3. Audit User Sessions for orphaned user references
    try {
      const sessColRef = collection(serverDb, "user_sessions");
      const sessSnap = await getDocs(sessColRef);
      for (const sDoc of sessSnap.docs) {
        const sess = sDoc.data();
        if (!sess.userId || !existingUserIds.has(sess.userId)) {
          orphanedSessions.push({
            id: sDoc.id,
            userId: sess.userId || "Non défini",
            reason: `Session applicative orpheline : l'utilisateur '${sess.userId}' n'existe pas`
          });
        }
      }
    } catch (_) {
      // Permission restricted or quota reached
    }

  } catch (globalErr: any) {
    const msg = globalErr?.message || String(globalErr);
    if (!msg.includes("Missing or insufficient permissions") && !msg.includes("permission-denied")) {
      console.warn("[DataHealth] Notice during health check:", msg);
    }
  }

  const totalIssues = 
    orphanedAuthUsers.length +
    orphanedProfiles.length +
    orphanedContacts.length +
    orphanedCompanies.length +
    creditInconsistencies.length +
    orphanedTransactions.length +
    orphanedSessions.length +
    brokenReferences.length;

  let severity: 'healthy' | 'minor_issues' | 'action_required' = "healthy";
  if (creditInconsistencies.length > 0 || orphanedTransactions.length > 0) {
    severity = "action_required";
  } else if (totalIssues > 0) {
    severity = "minor_issues";
  }

  return {
    timestamp,
    orphanedAuthUsers,
    orphanedProfiles,
    orphanedContacts,
    orphanedCompanies,
    creditInconsistencies,
    orphanedTransactions,
    orphanedSessions,
    brokenReferences,
    summary: {
      totalIssues,
      severity
    }
  };
}
