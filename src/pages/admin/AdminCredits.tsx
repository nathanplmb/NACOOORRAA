import React, { useState, useEffect } from "react";
import { adminService } from "../../services/adminService.ts";
import { CreditTransaction } from "../../types/admin.ts";
import { CreditCard, RefreshCw, PlusCircle, ArrowDownRight, ArrowUpRight, Search } from "lucide-react";

interface AdminCreditsProps {
  onSelectUser: (uid: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const AdminCredits: React.FC<AdminCreditsProps> = ({ onSelectUser, showToast }) => {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");

  const loadCredits = async () => {
    setLoading(true);
    try {
      // Fetch overview and recent transactions across system
      const usersRes = await adminService.getUsers({ page: 1, pageSize: 50 });
      const allTx: CreditTransaction[] = [];
      for (const u of usersRes.users.slice(0, 20)) {
        try {
          const res = await adminService.getUserCredits(u.uid);
          allTx.push(...(res.transactions || []));
        } catch (_) {}
      }
      allTx.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTransactions(allTx);
    } catch (err: any) {
      showToast(err.message || "Erreur de chargement des crédits", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredits();
  }, []);

  const filteredTx = transactions.filter(tx => {
    if (filterType !== "all" && tx.type !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      return tx.userId.toLowerCase().includes(s) || tx.reason.toLowerCase().includes(s) || (tx.feature && tx.feature.toLowerCase().includes(s));
    }
    return true;
  });

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(iso));
    } catch {
      return "—";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#F5F6FA] tracking-tight">Grand Livre des Crédits IA</h1>
          <p className="text-xs text-[#9AA0B2] mt-0.5 font-mono">
            Ledger immuable : chaque point est tracé avec son motif et son auteur
          </p>
        </div>
        <button
          onClick={loadCredits}
          disabled={loading}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] text-xs cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/10">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA0B2]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par UID ou motif..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1">
          {["all", "grant", "consume", "adjustment", "refund"].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                filterType === t ? "bg-white/15 text-[#F5F6FA]" : "text-[#9AA0B2] hover:text-[#F5F6FA]"
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/[0.03] border-b border-white/10 text-[11px] font-semibold text-[#9AA0B2] uppercase">
            <tr>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Utilisateur</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Variation</th>
              <th className="py-2.5 px-3">Solde après</th>
              <th className="py-2.5 px-3">Motif & Fonctionnalité</th>
              <th className="py-2.5 px-3">Initié par</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono text-[11px]">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#9AA0B2] font-sans">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#FF6685] mb-2" />
                  <span>Chargement du grand livre...</span>
                </td>
              </tr>
            ) : filteredTx.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#9AA0B2] font-sans">
                  Aucun mouvement enregistré dans le grand livre.
                </td>
              </tr>
            ) : (
              filteredTx.map(tx => (
                <tr key={tx.id} className="hover:bg-white/[0.02]">
                  <td className="py-2 px-3 text-[#9AA0B2] whitespace-nowrap">{formatDate(tx.createdAt)}</td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => onSelectUser(tx.userId)}
                      className="text-sky-400 hover:underline cursor-pointer"
                    >
                      {tx.userId.substring(0, 14)}...
                    </button>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                      tx.type === "grant" ? "bg-emerald-500/10 text-emerald-400" :
                      tx.type === "consume" ? "bg-purple-500/10 text-purple-400" :
                      tx.type === "refund" ? "bg-sky-500/10 text-sky-400" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-bold whitespace-nowrap">
                    <span className={tx.amount > 0 ? "text-emerald-400" : "text-rose-400"}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-[#F5F6FA] font-bold">{tx.balanceAfter} pts</td>
                  <td className="py-2 px-3 text-[#9AA0B2] font-sans max-w-xs truncate">
                    {tx.reason}
                    {tx.feature && <span className="ml-1 text-purple-300 font-mono text-[10px]">[{tx.feature}]</span>}
                  </td>
                  <td className="py-2 px-3 text-[#9AA0B2] text-[10px]">{tx.createdBy}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
