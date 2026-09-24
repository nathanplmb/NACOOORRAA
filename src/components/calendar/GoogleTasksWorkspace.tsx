import React, { useState, useEffect } from "react";
import { GoogleTaskItem, GoogleTaskList, Opportunity } from "../../types";
import { 
  listGoogleTaskLists, 
  listGoogleTasks, 
  createGoogleTask, 
  updateGoogleTask, 
  deleteGoogleTask 
} from "../../services/googleTasksService";
import { useAuth } from "../../context/AuthContext";
import { DestructiveConfirmModal } from "./DestructiveConfirmModal";
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  ListFilter, 
  Sparkles, 
  Loader2, 
  ExternalLink,
  ChevronDown,
  Layers,
  ArrowRight
} from "lucide-react";

interface GoogleTasksWorkspaceProps {
  opportunities?: Opportunity[];
  onNotify?: (msg: string) => void;
}

export const GoogleTasksWorkspace: React.FC<GoogleTasksWorkspaceProps> = ({
  opportunities = [],
  onNotify,
}) => {
  const { accessToken, connectGoogleWorkspace } = useAuth();
  
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("@default");
  const [tasks, setTasks] = useState<GoogleTaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("pending");

  // Add Task Form
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Edit Task
  const [editingTask, setEditingTask] = useState<GoogleTaskItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Confirmation Modal
  const [taskToDelete, setTaskToDelete] = useState<GoogleTaskItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick Opportunity Importer
  const [selectedOppId, setSelectedOppId] = useState("");
  const [oppActionType, setOppActionType] = useState<"relance" | "preparation" | "deadline">("relance");

  // Load lists on accessToken change
  useEffect(() => {
    if (!accessToken) {
      setTasks([]);
      setTaskLists([]);
      return;
    }
    loadTaskLists();
  }, [accessToken]);

  // Load tasks when selectedListId or accessToken changes
  useEffect(() => {
    if (accessToken && selectedListId) {
      loadTasks(selectedListId);
    }
  }, [accessToken, selectedListId]);

  const loadTaskLists = async () => {
    if (!accessToken) return;
    try {
      const lists = await listGoogleTaskLists(accessToken);
      setTaskLists(lists);
      if (lists.length > 0 && selectedListId === "@default") {
        setSelectedListId(lists[0].id);
      }
    } catch (e: any) {
      console.error("Failed to load Google Task lists:", e);
    }
  };

  const loadTasks = async (listId: string) => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const fetched = await listGoogleTasks(accessToken, listId, true);
      setTasks(fetched);
    } catch (e: any) {
      console.error("Failed to load Google Tasks:", e);
      if (onNotify) onNotify("Erreur lors de la récupération des tâches Google Tasks.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTaskStatus = async (task: GoogleTaskItem) => {
    if (!accessToken) return;
    const newStatus = task.status === "completed" ? "needsAction" : "completed";
    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    
    try {
      await updateGoogleTask(accessToken, task.id, { status: newStatus }, selectedListId);
      if (onNotify) {
        onNotify(newStatus === "completed" ? "Tâche marquée comme terminée dans Google Tasks." : "Tâche rouverte dans Google Tasks.");
      }
    } catch (e: any) {
      // Rollback
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
      if (onNotify) onNotify("Erreur lors de la mise à jour du statut de la tâche.");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newTitle.trim()) return;

    setIsAdding(true);
    try {
      const created = await createGoogleTask(accessToken, {
        title: newTitle.trim(),
        due: newDue || undefined,
        notes: newNotes.trim() || undefined,
        listId: selectedListId,
      });

      setTasks(prev => [created, ...prev]);
      setNewTitle("");
      setNewDue("");
      setNewNotes("");
      setShowAddForm(false);
      if (onNotify) onNotify("Tâche ajoutée avec succès sur Google Tasks.");
    } catch (e: any) {
      console.error(e);
      if (onNotify) onNotify("Erreur lors de la création de la tâche Google Tasks.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleStartEdit = (task: GoogleTaskItem) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditNotes(task.notes || "");
    setEditDue(task.due ? task.due.slice(0, 10) : "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !editingTask || !editTitle.trim()) return;

    setIsSavingEdit(true);
    try {
      const updated = await updateGoogleTask(
        accessToken,
        editingTask.id,
        {
          title: editTitle.trim(),
          notes: editNotes.trim(),
          due: editDue || undefined,
        },
        selectedListId
      );

      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
      setEditingTask(null);
      if (onNotify) onNotify("Tâche Google Tasks mise à jour.");
    } catch (e: any) {
      if (onNotify) onNotify("Erreur lors de la modification de la tâche.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!accessToken || !taskToDelete) return;
    setIsDeleting(true);
    try {
      await deleteGoogleTask(accessToken, taskToDelete.id, selectedListId);
      setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
      if (onNotify) onNotify("Tâche supprimée de Google Tasks.");
      setTaskToDelete(null);
    } catch (e: any) {
      if (onNotify) onNotify("Erreur lors de la suppression de la tâche.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickOppTask = async () => {
    if (!accessToken || !selectedOppId) return;
    const opp = opportunities.find(o => o.id === selectedOppId);
    if (!opp) return;

    let taskTitle = "";
    let taskNotes = `Opportunité: ${opp.title} chez ${opp.companyName}`;
    let taskDue: string | undefined = undefined;

    if (oppActionType === "relance") {
      taskTitle = `Relancer ${opp.companyName} (${opp.title})`;
      const d = new Date();
      d.setDate(d.getDate() + 3);
      taskDue = d.toISOString().slice(0, 10);
    } else if (oppActionType === "preparation") {
      taskTitle = `Préparer entretien pour ${opp.companyName}`;
      taskDue = opp.deadline || new Date().toISOString().slice(0, 10);
    } else {
      taskTitle = `Date limite candidature : ${opp.companyName}`;
      taskDue = opp.deadline;
    }

    try {
      const created = await createGoogleTask(accessToken, {
        title: taskTitle,
        notes: taskNotes,
        due: taskDue,
        listId: selectedListId,
      });

      setTasks(prev => [created, ...prev]);
      setSelectedOppId("");
      if (onNotify) onNotify(`Tâche Google Tasks générée pour ${opp.companyName} !`);
    } catch (e: any) {
      if (onNotify) onNotify("Erreur lors de la génération de la tâche.");
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    if (filter === "pending") return t.status === "needsAction";
    if (filter === "completed") return t.status === "completed";
    return true;
  });

  const pendingCount = tasks.filter(t => t.status === "needsAction").length;
  const completedCount = tasks.filter(t => t.status === "completed").length;

  if (!accessToken) {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center space-y-6 max-w-xl mx-auto my-6 border border-white/10">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#12B76A]/20 to-[#38BDF8]/20 border border-white/20 flex items-center justify-center mx-auto text-[#34D399] shadow-[0_0_30px_rgba(52,211,153,0.2)]">
          <CheckSquare className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white font-display">
            Google Tasks synchronisé
          </h3>
          <p className="text-xs text-[#9AA0B2] leading-relaxed">
            Connectez votre compte Google pour retrouver vos to-dos Google Tasks directement dans NACORA, programmer vos relances de candidatures et cocher vos actions en temps réel.
          </p>
        </div>
        <button
          type="button"
          onClick={connectGoogleWorkspace}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white hover:bg-gray-100 text-[#1F2937] text-sm font-bold shadow-xl transition-all hover:scale-105 cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Connecter Google Tasks</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Top Header & Task List Selector */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#12B76A]/10 border border-[#12B76A]/20 text-[#34D399]">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white font-display">
                Google Tasks
              </h2>
              {taskLists.length > 0 && (
                <div className="relative inline-block">
                  <select
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    className="bg-white/[0.06] border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white font-medium focus:outline-none focus:border-[#34D399] cursor-pointer"
                  >
                    {taskLists.map(l => (
                      <option key={l.id} value={l.id} className="bg-[#0B0F19] text-white">
                        {l.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <p className="text-[11px] text-[#9AA0B2]">
              {pendingCount} tâche{pendingCount > 1 ? "s" : ""} en attente • {completedCount} terminée{completedCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Filter Pills & Add Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                filter === "pending"
                  ? "bg-[#12B76A]/25 text-[#34D399] border border-[#12B76A]/30 shadow-sm"
                  : "text-[#9AA0B2] hover:text-white"
              }`}
            >
              À faire ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("completed")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                filter === "completed"
                  ? "bg-white/15 text-white"
                  : "text-[#9AA0B2] hover:text-white"
              }`}
            >
              Terminées ({completedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                filter === "all"
                  ? "bg-white/15 text-white"
                  : "text-[#9AA0B2] hover:text-white"
              }`}
            >
              Toutes ({tasks.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#D81A45] to-[#FF6685] hover:opacity-95 text-xs font-bold text-white shadow-[0_2px_10px_rgba(216,26,69,0.3)] transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvelle tâche</span>
          </button>
        </div>
      </div>

      {/* Quick Converter from Opportunity */}
      {opportunities.length > 0 && (
        <div className="glass-panel p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#9AA0B2]">
            <Sparkles className="w-4 h-4 text-[#C084FC] shrink-0" />
            <span>Créer rapidement une tâche Google depuis une candidature :</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={selectedOppId}
              onChange={(e) => setSelectedOppId(e.target.value)}
              className="bg-white/[0.06] border border-white/15 rounded-lg px-2 py-1 text-xs text-white max-w-[200px] truncate focus:outline-none focus:border-[#C084FC]"
            >
              <option value="" className="bg-[#0B0F19] text-[#9AA0B2]">Sélectionner une opportunité...</option>
              {opportunities.map(o => (
                <option key={o.id} value={o.id} className="bg-[#0B0F19] text-white">
                  {o.companyName} - {o.title}
                </option>
              ))}
            </select>
            <select
              value={oppActionType}
              onChange={(e) => setOppActionType(e.target.value as any)}
              className="bg-white/[0.06] border border-white/15 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
            >
              <option value="relance" className="bg-[#0B0F19]">Relance (+3 jours)</option>
              <option value="preparation" className="bg-[#0B0F19]">Préparation entretien</option>
              <option value="deadline" className="bg-[#0B0F19]">Date limite candidature</option>
            </select>
            <button
              type="button"
              onClick={handleQuickOppTask}
              disabled={!selectedOppId}
              className="px-3 py-1 rounded-lg bg-[#C084FC]/20 hover:bg-[#C084FC]/30 border border-[#C084FC]/30 text-xs font-semibold text-[#C084FC] transition-colors cursor-pointer disabled:opacity-40"
            >
              Ajouter à Google Tasks
            </button>
          </div>
        </div>
      )}

      {/* Add Task Form Collapsible */}
      {showAddForm && (
        <form onSubmit={handleCreateTask} className="glass-panel p-5 rounded-2xl border border-[#D81A45]/30 space-y-4 animate-fadeIn">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#FF6685]" />
            <span>Ajouter une tâche dans Google Tasks</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                placeholder="Titre de la tâche (ex: Rappeler le recruteur Capgemini)..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="w-full bg-white/[0.05] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-[#9AA0B2] focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
            <div>
              <input
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
          </div>
          <div>
            <textarea
              placeholder="Notes ou détails complémentaires (optionnel)..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              rows={2}
              className="w-full bg-white/[0.05] border border-white/15 rounded-xl p-3 text-xs text-white placeholder-[#9AA0B2] focus:outline-none focus:border-[#38BDF8]"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-xs text-[#9AA0B2] hover:text-white transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isAdding || !newTitle.trim()}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#D81A45] to-[#FF6685] hover:opacity-95 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{isAdding ? "Création..." : "Enregistrer dans Google Tasks"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tasks List */}
      {loading ? (
        <div className="glass-panel p-12 text-center text-[#9AA0B2] space-y-2 rounded-2xl border border-white/10">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#38BDF8]" />
          <p className="text-xs">Chargement de vos tâches Google Tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="glass-panel p-12 text-center text-[#9AA0B2] space-y-3 rounded-2xl border border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto text-[#9AA0B2]">
            <CheckSquare className="w-6 h-6" />
          </div>
          <p className="text-xs text-white font-medium">
            {filter === "completed" ? "Aucune tâche terminée." : "Aucune tâche en attente dans cette liste."}
          </p>
          <p className="text-[11px] text-[#9AA0B2] max-w-sm mx-auto">
            Cliquez sur « Nouvelle tâche » pour ajouter un rappel synchronisé avec votre compte Google.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const isDone = task.status === "completed";
            const hasDue = Boolean(task.due);
            const dueDateFormatted = task.due ? new Date(task.due).toLocaleDateString([], { day: "numeric", month: "short" }) : null;

            return (
              <div
                key={task.id}
                className={`glass-panel p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex items-start justify-between gap-3 group ${
                  isDone 
                    ? "bg-white/[0.015] border-white/5 opacity-60" 
                    : "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
                }`}
              >
                {/* Checkbox + Details */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleTaskStatus(task)}
                    className="mt-0.5 text-[#34D399] hover:scale-110 transition-transform cursor-pointer shrink-0"
                    title={isDone ? "Marquer comme à faire" : "Marquer comme terminée"}
                  >
                    {isDone ? (
                      <CheckSquare className="w-5 h-5 text-[#34D399]" />
                    ) : (
                      <Square className="w-5 h-5 text-[#9AA0B2] hover:text-[#34D399]" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0">
                    <p className={`text-xs font-medium leading-relaxed truncate ${isDone ? "line-through text-[#9AA0B2]" : "text-white"}`}>
                      {task.title}
                    </p>

                    {task.notes && (
                      <p className="text-[11px] text-[#9AA0B2] line-clamp-2 leading-relaxed">
                        {task.notes}
                      </p>
                    )}

                    {hasDue && (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          isDone 
                            ? "bg-white/5 text-[#9AA0B2]" 
                            : "bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30"
                        }`}>
                          <CalendarIcon className="w-3 h-3" />
                          <span>Échéance : {dueDateFormatted}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions: Edit & Delete */}
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(task)}
                    className="p-1.5 rounded-lg text-[#9AA0B2] hover:text-[#38BDF8] hover:bg-white/10 transition-colors cursor-pointer"
                    title="Modifier la tâche"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskToDelete(task)}
                    className="p-1.5 rounded-lg text-[#9AA0B2] hover:text-[#FF6685] hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Supprimer la tâche de Google Tasks"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <form 
            onSubmit={handleSaveEdit}
            className="glass-panel relative w-full max-w-lg overflow-hidden rounded-3xl p-6 space-y-4 border border-white/20 bg-[#0B0F19]/95 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white font-display">
              Modifier la tâche Google Tasks
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#9AA0B2] block mb-1">Titre</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full bg-white/[0.05] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#9AA0B2] block mb-1">Date d'échéance</label>
                <input
                  type="date"
                  value={editDue}
                  onChange={(e) => setEditDue(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#9AA0B2] block mb-1">Notes / Description</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-white/[0.05] border border-white/15 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs text-[#9AA0B2] hover:text-white transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSavingEdit || !editTitle.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#D81A45] to-[#FF6685] hover:opacity-95 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{isSavingEdit ? "Enregistrement..." : "Enregistrer"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mandatory User Confirmation Modal for Destructive Deletion */}
      <DestructiveConfirmModal
        isOpen={Boolean(taskToDelete)}
        title="Supprimer la tâche de Google Tasks ?"
        description="Cette action va supprimer définitivement cette tâche de votre compte Google Tasks. Cette action est irréversible."
        itemName={taskToDelete?.title}
        itemType="Tâche Google Tasks"
        confirmLabel="Supprimer de Google Tasks"
        cancelLabel="Annuler"
        isProcessing={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
};
