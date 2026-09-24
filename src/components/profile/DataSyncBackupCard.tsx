import React, { useState, useRef } from "react";
import { dbStore } from "../../dbStore";
import { useAuth } from "../../context/AuthContext";
import { 
  Cloud, 
  CloudCheck, 
  Download, 
  Upload, 
  RefreshCw, 
  Database, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Globe, 
  FileJson,
  Loader2
} from "lucide-react";

interface DataSyncBackupCardProps {
  onNotify?: (msg: string) => void;
}

export const DataSyncBackupCard: React.FC<DataSyncBackupCardProps> = ({ onNotify }) => {
  const { currentUser } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = () => {
    try {
      const jsonStr = dbStore.exportFullBackup();
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `nacora-backup-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      const successMsg = "Sauvegarde complète JSON exportée avec succès.";
      if (onNotify) onNotify(successMsg);
    } catch (e: any) {
      if (onNotify) onNotify("Erreur lors de l'exportation de la sauvegarde.");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const success = dbStore.importFullBackup(parsed);
        if (success) {
          const msg = "Toutes vos données (profil, contacts, opportunités, calendrier) ont été restaurées avec succès !";
          setSyncStatus("Restauration réussie !");
          if (onNotify) onNotify(msg);
        } else {
          setSyncStatus("Format de fichier de sauvegarde invalide.");
          if (onNotify) onNotify("Format de fichier JSON non reconnu.");
        }
      } catch (err) {
        setSyncStatus("Erreur lors de la lecture du fichier JSON.");
        if (onNotify) onNotify("Erreur : Fichier JSON corrompu ou illisible.");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleManualCloudSync = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await dbStore.forceCloudSync();
      if (res.success) {
        setSyncStatus("Cloud synchronisé à l'instant.");
        if (onNotify) onNotify("Synchronisation Cloud réussie !");
      } else {
        setSyncStatus(res.message);
        if (onNotify) onNotify(res.message);
      }
    } catch (err: any) {
      setSyncStatus("Échec de synchronisation.");
      if (onNotify) onNotify("Erreur lors de la synchronisation.");
    } finally {
      setIsSyncing(false);
    }
  };

  const oppCount = dbStore.getOpportunities().length;
  const contactCount = dbStore.getContacts().length;
  const companyCount = dbStore.getCompanies().length;

  return (
    <div id="data-sync-backup-card" className="glass-panel relative overflow-hidden rounded-3xl p-6 md:p-8 space-y-6 group transition-all duration-300 before:absolute before:top-0 before:left-0 before:right-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent">
      {/* Specular highlights */}
      <div className="absolute top-0 left-0 w-1/3 h-1/2 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#38BDF8]/8 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-white/[0.06] border border-white/15 text-[#38BDF8] shadow-[0_0_20px_rgba(56,189,248,0.2)] backdrop-blur-xl">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-display tracking-tight flex items-center gap-2">
              <span>Persistance, Synchronisation & Sauvegardes</span>
              <span className="px-2 py-0.5 rounded-full bg-[#12B76A]/20 border border-[#12B76A]/40 text-[10px] font-bold text-[#34D399]">
                Actif
              </span>
            </h3>
            <p className="text-xs text-[#9AA0B2]">
              Vos données sont stockées en local et synchronisées sur Firestore Cloud pour être conservées entre déploiements.
            </p>
          </div>
        </div>

        {/* Cloud Sync Button */}
        <button
          id="btn-force-cloud-sync"
          type="button"
          onClick={handleManualCloudSync}
          disabled={isSyncing}
          className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/20 hover:border-[#38BDF8]/40 text-xs font-bold text-white backdrop-blur-xl shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
        >
          {isSyncing ? (
            <Loader2 className="w-4 h-4 text-[#38BDF8] animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 text-[#38BDF8]" />
          )}
          <span>{isSyncing ? "Synchronisation..." : "Synchroniser vers le Cloud"}</span>
        </button>
      </div>

      {/* Database Quick Counters */}
      <div className="relative z-10 grid grid-cols-3 gap-3">
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
          <span className="text-lg font-black text-white font-display">{oppCount}</span>
          <span className="text-[11px] text-[#9AA0B2] block">Opportunités</span>
        </div>
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
          <span className="text-lg font-black text-[#38BDF8] font-display">{contactCount}</span>
          <span className="text-[11px] text-[#9AA0B2] block">Contacts RH & Réseau</span>
        </div>
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
          <span className="text-lg font-black text-[#C084FC] font-display">{companyCount}</span>
          <span className="text-[11px] text-[#9AA0B2] block">Entreprises ciblées</span>
        </div>
      </div>

      {/* Export / Import Action Panel */}
      <div className="relative z-10 p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FileJson className="w-4 h-4 text-[#FF6685]" />
              <span>Sauvegarde & Migration instantanée (JSON)</span>
            </h4>
            <p className="text-xs text-[#9AA0B2] leading-relaxed max-w-xl">
              Téléchargez une copie intégrale de toutes vos données pour les transférer sur Vercel, un autre navigateur ou les sécuriser sur votre ordinateur.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Export JSON Button */}
            <button
              id="btn-export-backup-json"
              type="button"
              onClick={handleExportBackup}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D81A45] to-[#FF6685] hover:opacity-95 text-xs font-bold text-white shadow-[0_4px_16px_rgba(216,26,69,0.35)] transition-all duration-300 hover:-translate-y-0.5 cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>Exporter (JSON)</span>
            </button>

            {/* Import JSON Button */}
            <button
              id="btn-import-backup-json"
              type="button"
              onClick={handleImportClick}
              disabled={isImporting}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 text-xs font-bold text-white backdrop-blur-xl shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 text-[#34D399] animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-[#34D399]" />
              )}
              <span>Importer (JSON)</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json,application/json"
              className="hidden"
            />
          </div>
        </div>

        {syncStatus && (
          <div className="p-3 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-[#34D399] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}
      </div>

      {/* Helpful explanation box for Vercel deployment */}
      <div className="relative z-10 p-4 rounded-2xl bg-[#060812]/80 border border-white/10 text-xs text-[#9AA0B2] space-y-2">
        <div className="flex items-start gap-2.5">
          <Globe className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-white">Pourquoi vos données semblaient réinitialisées sur Vercel ?</p>
            <p className="leading-relaxed">
              Le stockage local du navigateur (LocalStorage) est <strong>strictement isolé par domaine web</strong> : les données créées sur le domaine de développement ne sont pas partagées avec votre URL Vercel.
            </p>
            <p className="leading-relaxed">
              <strong>2 solutions immédiates pour retrouver toutes vos données sur Vercel :</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[#F5F6FA]/90">
              <li>
                <strong>Option 1 (Immédiate) :</strong> Cliquez sur <strong>Exporter (JSON)</strong> ici, ouvrez votre site Vercel, et cliquez sur <strong>Importer (JSON)</strong>. Vos opportunités et contacts seront immédiatement là.
              </li>
              <li>
                <strong>Option 2 (Synchronisation permanente) :</strong> Connectez-vous avec votre compte Google sur les deux sites. Dans la <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-[#38BDF8] underline">Console Firebase</a> &gt; <em>Authentication &gt; Paramètres &gt; Domaines autorisés</em>, ajoutez votre domaine Vercel (ex: <code className="text-[#34D399] bg-black/50 px-1 py-0.5 rounded">votre-app.vercel.app</code>) pour que la synchronisation Firestore soit 100% automatique et continue.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
