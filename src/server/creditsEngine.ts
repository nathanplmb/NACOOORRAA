import { serverDb, safeServerWrite } from "./firebaseAdmin.ts";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  runTransaction,
  limit as firestoreLimit 
} from "firebase/firestore";
import { 
  CreditTransaction, 
  CreditTransactionType, 
  CreditMode 
} from "../types/admin.ts";
import { recordAuditLog, recordSystemActivity } from "./auditEngine.ts";

// Memory cache for user transactions and balances to survive Firestore write quota limits
const memoryTransactions: CreditTransaction[] = [];
const memoryUserBalances = new Map<string, number>();

// Memory cache for Idempotency keys (TTL: 10 minutes)
interface IdempotencyRecord {
  timestamp: number;
  result: any;
}
const idempotencyStore = new Map<string, IdempotencyRecord>();

// Clean expired idempotency keys periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (now - record.timestamp > 10 * 60 * 1000) {
      idempotencyStore.delete(key);
    }
  }
}, 60 * 1000);

function cleanForDb<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      clean[k] = v;
    }
  }
  return clean as T;
}

export async function getUserCreditTransactions(userId: string, maxCount = 100): Promise<CreditTransaction[]> {
  const map = new Map<string, CreditTransaction>();
  for (const t of memoryTransactions) {
    if (t.userId === userId) {
      map.set(t.id, t);
    }
  }

  try {
    const colRef = collection(serverDb, "credit_transactions");
    const q = query(
      colRef, 
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      firestoreLimit(maxCount)
    );
    const snap = await getDocs(q);
    snap.forEach(d => {
      const data = d.data() as CreditTransaction;
      if (!map.has(data.id)) {
        map.set(data.id, data);
      }
    });
  } catch (err) {
    try {
      const colRef = collection(serverDb, "credit_transactions");
      const q = query(colRef, where("userId", "==", userId));
      const snap = await getDocs(q);
      snap.forEach(d => {
        const data = d.data() as CreditTransaction;
        if (!map.has(data.id)) {
          map.set(data.id, data);
        }
      });
    } catch (_) {}
  }

  const list = Array.from(map.values());
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, maxCount);
}

export async function getUserCreditSummary(userId: string) {
  const userDocRef = doc(serverDb, "users", userId);
  const userSnap = await getDoc(userDocRef);
  const userData = userSnap.exists() ? userSnap.data() : null;

  const creditMode: CreditMode = userData?.creditMode || "limited";
  const creditLimit: number = typeof userData?.creditLimit === "number" ? userData.creditLimit : 0;
  const recordedBalance: number = typeof userData?.creditsBalance === "number" ? userData.creditsBalance : 0;

  // Retrieve transactions to calculate ledger balance
  const transactions = await getUserCreditTransactions(userId, 500);
  let calculatedLedgerBalance = 0;
  
  if (transactions.length > 0) {
    // Sum all transactions: grants & refunds are positive, consumes & negative adjustments are negative
    calculatedLedgerBalance = transactions.reduce((acc, tx) => acc + tx.amount, 0);
  } else {
    // If no transactions have been created yet, default starting balance is the recordedBalance
    calculatedLedgerBalance = recordedBalance;
  }

  return {
    userId,
    creditMode,
    creditLimit,
    recordedBalance,
    calculatedLedgerBalance,
    isConsistent: Math.abs(recordedBalance - calculatedLedgerBalance) < 0.001,
    transactionsCount: transactions.length,
    status: userData?.status || "active",
    userDocExists: userSnap.exists()
  };
}

export async function addCreditTransaction(params: {
  userId: string;
  type: CreditTransactionType;
  amount: number;
  reason: string;
  createdBy: string;
  feature?: string;
  model?: string;
  requestId?: string;
  adminEmail?: string;
}): Promise<CreditTransaction> {
  const cleanReason = (params.reason || "").trim();
  if (!cleanReason) {
    throw new Error("Motif d'ajustement obligatoire pour l'audit et la traçabilité.");
  }
  if (typeof params.amount !== "number" || isNaN(params.amount) || params.amount === 0) {
    throw new Error("Montant de transaction valide et non nul requis.");
  }

  const txId = `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const userDocRef = doc(serverDb, "users", params.userId);
  const txRef = doc(serverDb, "credit_transactions", txId);

  let currentBalance = 0;
  let newBalance = 0;
  let targetUserEmail = "";

  // Perform atomic Firestore transaction
  await safeServerWrite(async () => {
    await runTransaction(serverDb, async (transaction) => {
      const userSnap = await transaction.get(userDocRef);
      const userData = userSnap.exists() ? userSnap.data() : null;
      targetUserEmail = userData?.email || "";

      currentBalance = typeof userData?.creditsBalance === "number" ? userData.creditsBalance : 0;
      newBalance = Math.max(0, currentBalance + params.amount);

      const txRecord: CreditTransaction = {
        id: txId,
        userId: params.userId,
        type: params.type,
        amount: params.amount,
        balanceAfter: newBalance,
        reason: cleanReason,
        feature: params.feature,
        model: params.model,
        requestId: params.requestId,
        createdAt: new Date().toISOString(),
        createdBy: params.createdBy
      };

      transaction.set(txRef, cleanForDb(txRecord));
      transaction.set(userDocRef, {
        creditsBalance: newBalance,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });
  });

  const tx: CreditTransaction = {
    id: txId,
    userId: params.userId,
    type: params.type,
    amount: params.amount,
    balanceAfter: newBalance,
    reason: cleanReason,
    feature: params.feature,
    model: params.model,
    requestId: params.requestId,
    createdAt: new Date().toISOString(),
    createdBy: params.createdBy
  };

  // Always record in memory cache immediately
  memoryTransactions.unshift(tx);
  memoryUserBalances.set(params.userId, newBalance);

  // Log in Admin Audit if initiated by an administrator
  if (params.adminEmail && (params.type === "grant" || params.type === "adjustment")) {
    await recordAuditLog({
      adminUserId: params.createdBy,
      adminEmail: params.adminEmail,
      action: params.type === "grant" ? "credits_granted" : "credits_adjusted",
      targetUserId: params.userId,
      targetUserEmail: targetUserEmail,
      metadata: {
        amount: params.amount,
        reason: cleanReason,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        transactionId: txId
      }
    });

    await recordSystemActivity({
      userId: params.userId,
      userName: targetUserEmail || "Utilisateur",
      type: "credits_update",
      description: `Mise à jour des crédits (${params.amount > 0 ? '+' : ''}${params.amount}) : ${cleanReason}`,
      metadata: { transactionId: txId, amount: params.amount }
    });
  }

  return tx;
}

/**
 * Gatekeeper checking credit availability BEFORE calling Gemini
 */
export async function checkCredits(userId: string, requiredCredits = 1): Promise<{
  allowed: boolean;
  creditMode: CreditMode;
  currentBalance: number;
  reason?: string;
}> {
  if (!userId) {
    return { allowed: false, creditMode: "limited", currentBalance: 0, reason: "Identifiant utilisateur requis" };
  }

  const userDocRef = doc(serverDb, "users", userId);
  const userSnap = await getDoc(userDocRef);

  if (!userSnap.exists()) {
    // Non-existent user document: no credits initialized
    return { allowed: false, creditMode: "limited", currentBalance: 0, reason: "Compte utilisateur non initialisé." };
  }

  const data = userSnap.data();
  if (data?.status === "disabled" || data?.status === "suspended") {
    return {
      allowed: false,
      creditMode: data?.creditMode || "limited",
      currentBalance: data?.creditsBalance || 0,
      reason: "Compte utilisateur suspendu ou désactivé."
    };
  }

  const creditMode: CreditMode = data?.creditMode || "limited";
  const currentBalance: number = typeof data?.creditsBalance === "number" ? data.creditsBalance : 0;

  if (creditMode === "unlimited") {
    return { allowed: true, creditMode: "unlimited", currentBalance };
  }

  if (currentBalance < requiredCredits) {
    return {
      allowed: false,
      creditMode: "limited",
      currentBalance,
      reason: `Crédits insuffisants (${currentBalance} restants, ${requiredCredits} requis).`
    };
  }

  return { allowed: true, creditMode: "limited", currentBalance };
}

/**
 * Consumes credits after successful AI call with Idempotency Protection
 */
export async function consumeCredits(params: {
  userId: string;
  creditsToDeduct: number;
  feature: string;
  model: string;
  tokens: { input: number; output: number; total: number };
  costEuro: number;
  requestId?: string;
  idempotencyKey?: string;
}) {
  // Idempotency check: prevent duplicate charges on retry
  if (params.idempotencyKey && idempotencyStore.has(params.idempotencyKey)) {
    const cached = idempotencyStore.get(params.idempotencyKey);
    return cached?.result;
  }

  const userDocRef = doc(serverDb, "users", params.userId);
  const userSnap = await getDoc(userDocRef);
  const userData = userSnap.exists() ? userSnap.data() : null;

  const creditMode: CreditMode = userData?.creditMode || "limited";
  const amountToDeduct = creditMode === "unlimited" ? 0 : Math.abs(params.creditsToDeduct);

  let tx: CreditTransaction | null = null;
  if (amountToDeduct > 0) {
    tx = await addCreditTransaction({
      userId: params.userId,
      type: "consume",
      amount: -amountToDeduct,
      reason: `Utilisation IA : ${params.feature} (${params.model})`,
      createdBy: "ai_engine",
      feature: params.feature,
      model: params.model,
      requestId: params.requestId
    });
  }

  // Update user usage statistics
  const currentTotalAiCalls = (userData?.totalAiCalls || 0) + 1;
  const currentTotalTokens = (userData?.totalTokensUsed || 0) + params.tokens.total;
  const currentTotalCost = (userData?.totalCostEuro || 0) + params.costEuro;

  await safeServerWrite(async () => {
    await setDoc(userDocRef, {
      totalAiCalls: currentTotalAiCalls,
      totalTokensUsed: currentTotalTokens,
      totalCostEuro: currentTotalCost,
      lastActivityAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  });

  const result = {
    success: true,
    creditsDeducted: amountToDeduct,
    transactionId: tx?.id,
    balanceRemaining: tx ? tx.balanceAfter : (userData?.creditsBalance || 0),
    creditMode
  };

  if (params.idempotencyKey) {
    idempotencyStore.set(params.idempotencyKey, {
      timestamp: Date.now(),
      result
    });
  }

  return result;
}
