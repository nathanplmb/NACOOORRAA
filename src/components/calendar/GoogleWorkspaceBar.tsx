import React from "react";
import { 
  Calendar as CalendarIcon, 
  CheckSquare, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface GoogleWorkspaceBarProps {
  activeTab: "calendar" | "tasks";
  onChangeTab: (tab: "calendar" | "tasks") => void;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  lastSyncTime?: Date | null;
  tasksCount?: number;
  eventsCount?: number;
}

export const GoogleWorkspaceBar: React.FC<GoogleWorkspaceBarProps> = ({
  activeTab,
  onChangeTab,
  onSync,
  isSyncing,
  lastSyncTime,
  tasksCount = 0,
  eventsCount = 0,
}) => {
  const { currentUser, accessToken, connectGoogleWorkspace, authError, clearError } = useAuth();
  const isConnected = Boolean(accessToken);

  const handleConnect = async () => {
    try {
      await connectGoogleWorkspace();
    } catch (e) {
      // handled by authError
    }
  };

  const formatLastSync = (d?: Date | null) => {
    if (!d) return null;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="glass-panel relative overflow-hidden rounded-2xl p-3 sm:p-4 space-y-3 border border-white/10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: View Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-xl p-1 shrink-0">
            <button
              id="tab-view-calendar"
              type="button"
              onClick={() => onChangeTab("calendar")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "calendar"
                  ? "bg-white/15 text-white shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
                  : "text-[#9AA0B2] hover:text-white"
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Agenda & Google Calendar</span>
              {eventsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-semibold text-[#F5F6FA]">
                  {eventsCount}
                </span>
              )}
            </button>

            <button
              id="tab-view-tasks"
              type="button"
              onClick={() => onChangeTab("tasks")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "tasks"
                  ? "bg-gradient-to-r from-[#D81A45]/30 to-[#FF6685]/20 text-white border border-[#D81A45]/40 shadow-[0_2px_10px_rgba(216,26,69,0.2)]"
                  : "text-[#9AA0B2] hover:text-white"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Google Tasks</span>
              {tasksCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#34D399]/20 text-[10px] font-bold text-[#34D399]">
                  {tasksCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right: Google Workspace Connection & Sync Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isConnected ? (
            <div className="flex items-center gap-2.5">
              {/* Connected Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                {/* Official mini Google G */}
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="text-[11px] text-[#9AA0B2]">
                  Google Workspace : <span className="text-white font-medium">{currentUser?.email || "Connecté"}</span>
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
              </div>

              {/* Sync Button */}
              <button
                id="btn-sync-google-workspace"
                type="button"
                onClick={onSync}
                disabled={isSyncing}
                title="Synchroniser Google Calendar et Google Tasks"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/20 text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50"
              >
                {isSyncing ? (
                  <Loader2 className="w-3.5 h-3.5 text-[#38BDF8] animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-[#38BDF8]" />
                )}
                <span>{isSyncing ? "Synchronisation..." : "Synchroniser"}</span>
              </button>

              {lastSyncTime && (
                <span className="text-[10px] text-[#9AA0B2] hidden sm:inline">
                  Dernière synchro : {formatLastSync(lastSyncTime)}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#9AA0B2] hidden md:inline">
                Synchronisez vos entretiens et vos to-dos avec votre compte Google :
              </span>
              <button
                id="btn-connect-google-workspace"
                type="button"
                onClick={handleConnect}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-gray-100 text-[#1F2937] text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Connecter Google Calendar & Tasks</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Auth Error Banner if any */}
      {authError && (
        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-[#FF6685] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="text-[10px] text-white/70 hover:text-white underline cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
};
