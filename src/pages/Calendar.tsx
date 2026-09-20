import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import { dbStore } from "../dbStore";
import { CalendarEvent, Opportunity } from "../types";
import { GlassButton, Modal } from "../components/Shared";
import { 
  Clock, 
  Plus, 
  Trash2, 
  Edit3,
  CheckSquare, 
  Square, 
  ChevronLeft, 
  ChevronRight,
  Building2,
  Briefcase,
  Check,
  CalendarCheck,
  ArrowRight
} from "lucide-react";

type FilterType = "all" | "interview" | "deadline" | "follow_up" | "other";

const DAYS_OF_WEEK_FR = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_OF_WEEK_SHORT_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAYS_OF_WEEK_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYS_OF_WEEK_SHORT_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const Calendar: React.FC = () => {
  const { language, t } = useLanguage();
  const DAYS_OF_WEEK = language === "en" ? DAYS_OF_WEEK_EN : DAYS_OF_WEEK_FR;
  const DAYS_OF_WEEK_SHORT = language === "en" ? DAYS_OF_WEEK_SHORT_EN : DAYS_OF_WEEK_SHORT_FR;

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  
  // Current calendar view date (defaults to today)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  
  // Filter
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Form State
  const [formId, setFormId] = useState<string>("");
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formType, setFormType] = useState<CalendarEvent["type"]>("deadline");
  const [formOppId, setFormOppId] = useState("");
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    setEvents(dbStore.getCalendarEvents());
    setOpportunities(dbStore.getOpportunities());
    
    const unsub = dbStore.subscribe(() => {
      setEvents(dbStore.getCalendarEvents());
      setOpportunities(dbStore.getOpportunities());
    });
    return unsub;
  }, []);

  // Format Helper YYYY-MM-DD
  const formatDateToIso = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayIso = useMemo(() => formatDateToIso(new Date()), []);

  // Relative Date Formatter for "À venir" column
  const formatEventDateLabel = (dateStr: string) => {
    if (dateStr === todayIso) return language === "en" ? "Today" : "Aujourd'hui";
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowIso = formatDateToIso(tomorrow);
    if (dateStr === tomorrowIso) return language === "en" ? "Tomorrow" : "Demain";

    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    const targetDate = new Date(y, m - 1, d);
    return targetDate.toLocaleDateString(language === "en" ? "en-US" : "fr-FR", { weekday: "short", day: "numeric", month: "short" });
  };

  // Current year & month
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Month label
  const monthTitle = useMemo(() => {
    const raw = currentDate.toLocaleDateString(language === "en" ? "en-US" : "fr-FR", { month: "long", year: "numeric" });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [currentDate, language]);

  // Calendar Grid Calculation
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    // 0 = Sunday in JS, convert to Monday = 0
    let startDayIndex = firstDayOfMonth.getDay() - 1;
    if (startDayIndex === -1) startDayIndex = 6;

    const cells: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      dateObj: Date;
    }> = [];

    // 1. Previous month trailing days
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = formatDateToIso(prevDate);
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayIso,
        dateObj: prevDate
      });
    }

    // 2. Current month days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const thisDate = new Date(currentYear, currentMonth, day);
      const dateStr = formatDateToIso(thisDate);
      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayIso,
        dateObj: thisDate
      });
    }

    // 3. Next month leading days (fill grid to complete 35 or 42 cells)
    const totalCells = cells.length > 35 ? 42 : 35;
    const remainingDays = totalCells - cells.length;
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(currentYear, currentMonth + 1, day);
      const dateStr = formatDateToIso(nextDate);
      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: dateStr === todayIso,
        dateObj: nextDate
      });
    }

    return cells;
  }, [currentYear, currentMonth, todayIso]);

  // Filtered Events Map by Date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(evt => {
      if (activeFilter !== "all" && evt.type !== activeFilter) return;
      
      const list = map.get(evt.date) || [];
      list.push(evt);
      map.set(evt.date, list);
    });

    // Sort each day's events by time or title
    map.forEach(list => {
      list.sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1;
        if (b.time) return 1;
        return a.title.localeCompare(b.title);
      });
    });

    return map;
  }, [events, activeFilter]);

  // Upcoming events list (sorted chronologically)
  const upcomingEvents = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return a.title.localeCompare(b.title);
    });

    // Filter for upcoming (date >= today or pending)
    const pendingUpcoming = sorted.filter(e => e.date >= todayIso && !e.completed);
    if (pendingUpcoming.length > 0) return pendingUpcoming;
    
    // If none future pending, show all uncompleted or recent
    const uncompleted = sorted.filter(e => !e.completed);
    return uncompleted.length > 0 ? uncompleted.slice(0, 8) : sorted.slice(0, 6);
  }, [events, todayIso]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
  };

  // Open add modal for a specific date
  const handleOpenAddForDate = (dateStr: string) => {
    setFormId("");
    setFormTitle("");
    setFormDate(dateStr);
    setFormTime("");
    setFormType("deadline");
    setFormOppId("");
    setFormNotes("");
    setIsAddOpen(true);
  };

  // Open add modal generic
  const handleOpenAdd = () => {
    handleOpenAddForDate(todayIso);
  };

  // Save new event
  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate) return;

    let oppTitle: string | undefined;
    let coName: string | undefined;

    if (formOppId) {
      const matched = opportunities.find(o => o.id === formOppId);
      if (matched) {
        oppTitle = matched.title;
        coName = matched.companyName;
      }
    }

    dbStore.addCalendarEvent({
      title: formTitle.trim(),
      date: formDate,
      time: formTime.trim() || undefined,
      type: formType,
      opportunityId: formOppId || undefined,
      opportunityTitle: oppTitle,
      companyName: coName,
      notes: formNotes.trim(),
      completed: false
    });

    setIsAddOpen(false);
  };

  // Open event details
  const handleOpenEventDetail = (evt: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(evt);
    setIsEditMode(false);
    setIsDetailOpen(true);
  };

  // Switch to edit mode in detail modal
  const handleStartEdit = () => {
    if (!selectedEvent) return;
    setFormId(selectedEvent.id);
    setFormTitle(selectedEvent.title);
    setFormDate(selectedEvent.date);
    setFormTime(selectedEvent.time || "");
    setFormType(selectedEvent.type);
    setFormOppId(selectedEvent.opportunityId || "");
    setFormNotes(selectedEvent.notes || "");
    setIsEditMode(true);
  };

  // Save edited event
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !formTitle.trim() || !formDate) return;

    let oppTitle = selectedEvent.opportunityTitle;
    let coName = selectedEvent.companyName;

    if (formOppId !== selectedEvent.opportunityId) {
      const matched = opportunities.find(o => o.id === formOppId);
      if (matched) {
        oppTitle = matched.title;
        coName = matched.companyName;
      } else {
        oppTitle = undefined;
        coName = undefined;
      }
    }

    const updated: CalendarEvent = {
      ...selectedEvent,
      title: formTitle.trim(),
      date: formDate,
      time: formTime.trim() || undefined,
      type: formType,
      opportunityId: formOppId || undefined,
      opportunityTitle: oppTitle,
      companyName: coName,
      notes: formNotes.trim()
    };

    dbStore.updateCalendarEvent(updated);
    setSelectedEvent(updated);
    setIsEditMode(false);
  };

  // Toggle completed state
  const handleToggleComplete = (evt: CalendarEvent) => {
    const updated = { ...evt, completed: !evt.completed };
    dbStore.updateCalendarEvent(updated);
    if (selectedEvent && selectedEvent.id === evt.id) {
      setSelectedEvent(updated);
    }
  };

  // Delete event
  const handleDeleteEvent = (id: string) => {
    dbStore.deleteCalendarEvent(id);
    setIsDetailOpen(false);
    setSelectedEvent(null);
  };

  // Type styling helpers
  const getTypeBadgeStyle = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "interview":
        return {
          pill: "bg-purple-950/50 text-[#C084FC] border-purple-500/35",
          dot: "bg-[#C084FC]",
          label: language === "en" ? "Interview" : "Entretien"
        };
      case "deadline":
        return {
          pill: "bg-[rgba(216,26,69,0.18)] text-[#FF6685] border-[rgba(216,26,69,0.35)]",
          dot: "bg-[#D81A45]",
          label: language === "en" ? "Deadline" : "Échéance"
        };
      case "follow_up":
        return {
          pill: "bg-[rgba(247,144,9,0.16)] text-[#FBBF24] border-[rgba(247,144,9,0.30)]",
          dot: "bg-[#FBBF24]",
          label: language === "en" ? "Follow-up" : "Relance"
        };
      default:
        return {
          pill: "bg-white/[0.04] text-[#9AA0B2] border-white/10",
          dot: "bg-[#9AA0B2]",
          label: language === "en" ? "Reminder" : "Rappel"
        };
    }
  };

  // Quick stats
  const totalCount = events.length;
  const interviewCount = events.filter(e => e.type === "interview").length;
  const deadlineCount = events.filter(e => e.type === "deadline").length;
  const followUpCount = events.filter(e => e.type === "follow_up").length;

  return (
    <div className="relative z-10 w-full space-y-2.5 pb-6">
      
      {/* 1. Header Toolbar (Compact, Single-Row Responsive) */}
      <div className="glass-panel px-3 py-2 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        
        {/* Left: Month Selector & Navigation */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-lg p-0.5 shrink-0">
            <button
              onClick={handlePrevMonth}
              title={language === "en" ? "Previous month" : "Mois précédent"}
              className="p-1 rounded text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleGoToday}
              title={language === "en" ? "Go to current month" : "Aller au mois actuel"}
              className="px-2 py-0.5 text-[11px] font-semibold text-[#F5F6FA] hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
            >
              {t.calendar.today}
            </button>
            <button
              onClick={handleNextMonth}
              title={language === "en" ? "Next month" : "Mois suivant"}
              className="p-1 rounded text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D81A45] shadow-[0_0_6px_rgba(216,26,69,0.8)] shrink-0 hidden sm:block"></div>
            <h1 className="text-base sm:text-lg font-bold text-[#F5F6FA] font-display tracking-tight truncate">
              {monthTitle}
            </h1>
          </div>
        </div>

        {/* Right: Filters & Add Action */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === "all"
                  ? "bg-white/15 text-[#F5F6FA] shadow-sm"
                  : "text-[#9AA0B2] hover:text-[#F5F6FA]"
              }`}
            >
              {t.calendar.allEvents} ({totalCount})
            </button>
            <button
              onClick={() => setActiveFilter("deadline")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                activeFilter === "deadline"
                  ? "bg-[rgba(216,26,69,0.25)] text-[#FF6685] border border-[rgba(216,26,69,0.4)]"
                  : "text-[#9AA0B2] hover:text-[#F5F6FA]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#D81A45]"></span>
              {t.calendar.deadlines} ({deadlineCount})
            </button>
            <button
              onClick={() => setActiveFilter("interview")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                activeFilter === "interview"
                  ? "bg-purple-950/60 text-[#C084FC] border border-purple-500/40"
                  : "text-[#9AA0B2] hover:text-[#F5F6FA]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#C084FC]"></span>
              {t.calendar.interviews} ({interviewCount})
            </button>
            <button
              onClick={() => setActiveFilter("follow_up")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                activeFilter === "follow_up"
                  ? "bg-amber-950/60 text-[#FBBF24] border border-amber-500/40"
                  : "text-[#9AA0B2] hover:text-[#F5F6FA]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24]"></span>
              {t.calendar.followUps} ({followUpCount})
            </button>
          </div>

          <GlassButton 
            variant="primary" 
            size="sm" 
            onClick={handleOpenAdd} 
            icon={<Plus className="w-3.5 h-3.5 text-white" />}
          >
            {t.calendar.addEvent}
          </GlassButton>
        </div>
      </div>

      {/* 2. Main Two-Column Structure: [ CALENDRIER MENSUEL (72%) ] [ À VENIR (28%) ] */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
        
        {/* --- LEFT: CALENDRIER MENSUEL PRINCIPAL (≈ 72% Width) --- */}
        <div className="lg:col-span-8 xl:col-span-9 glass-panel p-2 sm:p-2.5 flex flex-col justify-between shadow-xl">
          
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 mb-1 text-center">
            {DAYS_OF_WEEK.map((day, idx) => (
              <div key={day} className="py-1 text-center select-none">
                <span className="hidden sm:inline text-[11px] font-bold text-[#9AA0B2] uppercase tracking-wider font-display">
                  {day}
                </span>
                <span className="sm:hidden text-[10px] font-bold text-[#9AA0B2] uppercase font-display">
                  {DAYS_OF_WEEK_SHORT[idx]}
                </span>
              </div>
            ))}
          </div>

          {/* Compact 7-Columns Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarCells.map((cell) => {
              const dayEvents = eventsByDate.get(cell.dateStr) || [];

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => handleOpenAddForDate(cell.dateStr)}
                  className={`
                    group min-h-[58px] sm:min-h-[66px] lg:min-h-[72px] p-1 sm:p-1.5 rounded-lg sm:rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between relative
                    ${cell.isToday 
                      ? "bg-[rgba(216,26,69,0.08)] border-[rgba(216,26,69,0.42)] shadow-[inset_0_0_12px_rgba(216,26,69,0.1)]" 
                      : cell.isCurrentMonth
                        ? "bg-white/[0.02] hover:bg-white/[0.05] border-white/10 hover:border-white/20"
                        : "bg-white/[0.005] border-white/[0.03] opacity-35 hover:opacity-60"}
                  `}
                >
                  {/* Cell Header: Day Number + Quick Add */}
                  <div className="flex items-center justify-between mb-0.5 leading-none">
                    <span
                      className={`
                        inline-flex items-center justify-center text-[11px] font-bold rounded-md transition-transform
                        ${cell.isToday 
                          ? "w-5 h-5 bg-gradient-to-tr from-[#D81A45] to-[#FF1A55] text-white shadow-[0_0_8px_rgba(216,26,69,0.55)]" 
                          : cell.isCurrentMonth 
                            ? "text-[#F5F6FA] w-4 h-4" 
                            : "text-[#9AA0B2]/60 w-4 h-4"}
                      `}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Quick Add icon visible on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddForDate(cell.dateStr);
                      }}
                      title="Ajouter un événement"
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#9AA0B2] hover:text-white hover:bg-white/15 transition-all"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  {/* Events list inside cell (Compact) */}
                  <div className="flex-1 space-y-0.5 overflow-y-auto no-scrollbar max-h-[40px] sm:max-h-[48px] lg:max-h-[52px]">
                    {dayEvents.slice(0, 2).map((evt) => {
                      const badgeStyle = getTypeBadgeStyle(evt.type);
                      const isDone = evt.completed;

                      return (
                        <div
                          key={evt.id}
                          onClick={(e) => handleOpenEventDetail(evt, e)}
                          title={`${evt.title}${evt.time ? ` à ${evt.time}` : ''}`}
                          className={`
                            px-1 py-0.5 rounded text-[9.5px] sm:text-[10px] font-semibold border flex items-center gap-1 transition-all truncate select-none cursor-pointer leading-tight
                            ${badgeStyle.pill}
                            ${isDone ? "opacity-45 line-through grayscale-[35%]" : "hover:scale-[1.01]"}
                          `}
                        >
                          <span className={`w-1 h-1 rounded-full shrink-0 ${badgeStyle.dot}`}></span>
                          {evt.time && (
                            <span className="font-mono text-[8.5px] opacity-80 shrink-0">
                              {evt.time}
                            </span>
                          )}
                          <span className="truncate flex-1">{evt.title}</span>
                        </div>
                      );
                    })}

                    {/* If more than 2 events */}
                    {dayEvents.length > 2 && (
                      <div className="text-[8.5px] font-bold text-[#9AA0B2] px-0.5 leading-none">
                        +{dayEvents.length - 2} autre{dayEvents.length - 2 > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- RIGHT: COLONNE "À VENIR" (≈ 28% Width) --- */}
        <div className="lg:col-span-4 xl:col-span-3 glass-panel p-3 sm:p-3.5 flex flex-col justify-between min-h-[360px] lg:max-h-[530px] shadow-xl">
          
          {/* Header of "À venir" */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-[#D81A45]">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-[#F5F6FA] font-display">
                {t.calendar.upcoming}
              </h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-[#9AA0B2] border border-white/10">
              {upcomingEvents.length} {language === "en" ? (upcomingEvents.length > 1 ? "events" : "event") : (upcomingEvents.length > 1 ? "échéances" : "échéance")}
            </span>
          </div>

          {/* Upcoming Events List */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-0.5">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((evt) => {
                const badgeStyle = getTypeBadgeStyle(evt.type);
                const isToday = evt.date === todayIso;

                return (
                  <div
                    key={evt.id}
                    onClick={(e) => handleOpenEventDetail(evt, e)}
                    className={`
                      p-2.5 rounded-xl border transition-all duration-200 cursor-pointer group flex items-start justify-between gap-2
                      ${isToday 
                        ? "bg-[rgba(216,26,69,0.06)] hover:bg-[rgba(216,26,69,0.1)] border-[rgba(216,26,69,0.3)] shadow-[0_0_12px_rgba(216,26,69,0.08)]" 
                        : "bg-white/[0.025] hover:bg-white/[0.06] border-white/10 hover:border-white/20"}
                    `}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      
                      {/* Date & Type Tag */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md border ${
                          isToday 
                            ? "bg-[rgba(216,26,69,0.2)] text-[#FF6685] border-[rgba(216,26,69,0.4)]" 
                            : "bg-white/5 text-[#9AA0B2] border-white/10"
                        }`}>
                          {formatEventDateLabel(evt.date)}
                        </span>

                        {evt.time && (
                          <span className="text-[9.5px] font-mono text-[#9AA0B2] flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5 opacity-60" />
                            {evt.time}
                          </span>
                        )}

                        <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full border ${badgeStyle.pill}`}>
                          {badgeStyle.label}
                        </span>
                      </div>

                      {/* Event Title */}
                      <h4 className="text-xs font-bold text-[#F5F6FA] group-hover:text-white transition-colors truncate">
                        {evt.title}
                      </h4>

                      {/* Opportunity or Company */}
                      {(evt.companyName || evt.opportunityTitle) && (
                        <div className="flex items-center gap-1.5 text-[10px] text-[#9AA0B2] truncate pt-0.5">
                          {evt.companyName && (
                            <span className="flex items-center gap-1 text-[#F5F6FA]/80 truncate">
                              <Building2 className="w-2.5 h-2.5 text-[#D81A45] shrink-0" />
                              <span className="truncate">{evt.companyName}</span>
                            </span>
                          )}
                          {evt.opportunityTitle && !evt.companyName && (
                            <span className="flex items-center gap-1 text-[#9AA0B2] truncate">
                              <Briefcase className="w-2.5 h-2.5 text-[#38BDF8] shrink-0" />
                              <span className="truncate">{evt.opportunityTitle}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Complete Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleComplete(evt);
                      }}
                      title={evt.completed ? "Marquer non fait" : "Marquer comme fait"}
                      className="p-1 rounded-lg text-[#9AA0B2] hover:text-[#34D399] hover:bg-white/10 transition-colors shrink-0 mt-0.5"
                    >
                      {evt.completed ? (
                        <CheckSquare className="w-4 h-4 text-[#34D399]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2 my-auto">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-[#9AA0B2]">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#F5F6FA]">{language === "en" ? "No urgent deadlines" : "Aucune échéance urgente"}</p>
                  <p className="text-[11px] text-[#9AA0B2]">{language === "en" ? "All your deadlines and follow-ups are up to date." : "Toutes vos dates limites et relances sont à jour."}</p>
                </div>
                <button
                  onClick={handleOpenAdd}
                  className="mt-1 text-xs font-semibold text-[#D81A45] hover:text-[#FF6685] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {language === "en" ? "Schedule a milestone" : "Planifier un jalon"}
                </button>
              </div>
            )}
          </div>

          {/* Quick Footer Action */}
          <div className="pt-2.5 mt-2.5 border-t border-white/10 shrink-0">
            <button
              onClick={handleOpenAdd}
              className="w-full py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-[#F5F6FA] flex items-center justify-center gap-1.5 transition-all cursor-pointer group"
            >
              <Plus className="w-3.5 h-3.5 text-[#D81A45] group-hover:scale-110 transition-transform" />
              <span>{language === "en" ? "New milestone" : "Nouvelle échéance"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- 3. MODAL : AJOUTER UN ÉVÉNEMENT --- */}
      <Modal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        title={language === "en" ? "Add a deadline or interview" : "Ajouter une échéance ou un entretien"} 
        size="md"
      >
        <form onSubmit={handleSubmitAdd} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Title *" : "Titre de l'échéance *"}</label>
            <input
              type="text"
              required
              placeholder={language === "en" ? "e.g. HR Interview BNP Paribas, Application submission..." : "ex: Entretien RH BNP Paribas, Envoi du dossier..."}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Date *" : "Date *"}</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Time (optional)" : "Heure (optionnel)"}</label>
              <input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className="glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Event type" : "Type de jalon"}</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA] bg-[#060812]"
              >
                <option value="deadline" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Application deadline" : "Date limite de candidature"}</option>
                <option value="interview" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Job interview" : "Entretien d'embauche"}</option>
                <option value="follow_up" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Follow-up message" : "Message de relance"}</option>
                <option value="other" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Other reminder" : "Autre rappel"}</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Link opportunity (optional)" : "Associer une offre (optionnel)"}</label>
              <select
                value={formOppId}
                onChange={(e) => setFormOppId(e.target.value)}
                className="glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA] bg-[#060812]"
              >
                <option value="" className="bg-[#060812] text-[#9AA0B2]">{language === "en" ? "No linked opportunity" : "Aucune offre liée"}</option>
                {opportunities.map(opp => (
                  <option key={opp.id} value={opp.id} className="bg-[#060812] text-[#F5F6FA]">
                    {opp.companyName} — {opp.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Notes & Preparation" : "Notes & Préparation"}</label>
            <textarea
              placeholder={language === "en" ? "Details, video link, questions to ask, documents to bring..." : "Précisions, lien visio, questions à poser, documents à apporter..."}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full min-h-[80px] glass-input p-3 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
            <GlassButton type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
              {language === "en" ? "Cancel" : "Annuler"}
            </GlassButton>
            <GlassButton type="submit" variant="primary">
              {language === "en" ? "Schedule event" : "Planifier l'événement"}
            </GlassButton>
          </div>
        </form>
      </Modal>

      {/* --- 4. MODAL : DÉTAIL & MODIFICATION D'UN ÉVÉNEMENT --- */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setIsEditMode(false);
        }}
        title={isEditMode ? (language === "en" ? "Edit event" : "Modifier l'événement") : (language === "en" ? "Event details" : "Détail de l'échéance")}
        size="md"
      >
        {selectedEvent && (
          <div>
            {!isEditMode ? (
              <div className="space-y-4">
                {/* Header info */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${getTypeBadgeStyle(selectedEvent.type).pill}`}>
                        {getTypeBadgeStyle(selectedEvent.type).label}
                      </span>
                      {selectedEvent.completed && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#12B76A]/20 text-[#34D399] border border-[#12B76A]/40 flex items-center gap-1">
                          <Check className="w-3 h-3" /> {language === "en" ? "Completed" : "Terminé"}
                        </span>
                      )}
                    </div>
                    <h3 className={`text-base font-bold font-display ${selectedEvent.completed ? 'line-through text-[#9AA0B2]' : 'text-[#F5F6FA]'}`}>
                      {selectedEvent.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleToggleComplete(selectedEvent)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-white transition-colors cursor-pointer shrink-0"
                    title={selectedEvent.completed ? (language === "en" ? "Mark as to-do" : "Marquer comme à faire") : (language === "en" ? "Mark as completed" : "Marquer comme terminé")}
                  >
                    {selectedEvent.completed ? (
                      <CheckSquare className="w-5 h-5 text-[#34D399]" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Metadata cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#9AA0B2]" />
                    <div className="text-xs">
                      <span className="text-[#9AA0B2] block text-[10px]">{language === "en" ? "Date & Time" : "Date & Heure"}</span>
                      <span className="font-semibold text-[#F5F6FA]">
                        {selectedEvent.date} {selectedEvent.time ? (language === "en" ? `at ${selectedEvent.time}` : `à ${selectedEvent.time}`) : ""}
                      </span>
                    </div>
                  </div>

                  {selectedEvent.companyName && (
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#D81A45]" />
                      <div className="text-xs truncate">
                        <span className="text-[#9AA0B2] block text-[10px]">{language === "en" ? "Linked company" : "Entreprise liée"}</span>
                        <span className="font-semibold text-[#F5F6FA] truncate block">
                          {selectedEvent.companyName}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {selectedEvent.opportunityTitle && (
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#38BDF8]" />
                    <div className="text-xs truncate">
                      <span className="text-[#9AA0B2] block text-[10px]">{language === "en" ? "Associated opportunity" : "Opportunité associée"}</span>
                      <span className="font-semibold text-[#F5F6FA] truncate block">
                        {selectedEvent.opportunityTitle}
                      </span>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedEvent.notes && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[10px] text-[#9AA0B2] uppercase tracking-wider font-semibold">{language === "en" ? "Notes & Instructions" : "Notes & Consignes"}</span>
                    <p className="text-xs text-[#F5F6FA] leading-relaxed whitespace-pre-wrap">{selectedEvent.notes}</p>
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <button
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                    className="p-2 rounded-xl text-[#F04438] hover:bg-[rgba(240,68,56,0.12)] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Trash2 className="w-4 h-4" />
                    {language === "en" ? "Delete" : "Supprimer"}
                  </button>

                  <div className="flex items-center gap-2">
                    <GlassButton variant="secondary" size="sm" onClick={handleStartEdit} icon={<Edit3 className="w-3.5 h-3.5" />}>
                      {language === "en" ? "Edit" : "Modifier"}
                    </GlassButton>
                    <GlassButton 
                      variant="primary" 
                      size="sm" 
                      onClick={() => {
                        handleToggleComplete(selectedEvent);
                        setIsDetailOpen(false);
                      }}
                    >
                      {selectedEvent.completed ? (language === "en" ? "Reopen" : "Rouvrir") : (language === "en" ? "Complete" : "Terminer")}
                    </GlassButton>
                  </div>
                </div>
              </div>
            ) : (
              /* Edit Form */
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Title *" : "Titre de l'échéance *"}</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Date *" : "Date *"}</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Time" : "Heure"}</label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Event type" : "Type de jalon"}</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as any)}
                      className="glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA] bg-[#060812]"
                    >
                      <option value="deadline" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Application deadline" : "Date limite de candidature"}</option>
                      <option value="interview" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Job interview" : "Entretien d'embauche"}</option>
                      <option value="follow_up" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Follow-up message" : "Message de relance"}</option>
                      <option value="other" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Other reminder" : "Autre rappel"}</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Linked opportunity" : "Offre liée"}</label>
                    <select
                      value={formOppId}
                      onChange={(e) => setFormOppId(e.target.value)}
                      className="glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA] bg-[#060812]"
                    >
                      <option value="" className="bg-[#060812] text-[#9AA0B2]">{language === "en" ? "No linked opportunity" : "Aucune offre liée"}</option>
                      {opportunities.map(opp => (
                        <option key={opp.id} value={opp.id} className="bg-[#060812] text-[#F5F6FA]">
                          {opp.companyName} — {opp.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Notes" : "Notes"}</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full min-h-[80px] glass-input p-3 text-xs text-[#F5F6FA]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                  <GlassButton type="button" variant="ghost" onClick={() => setIsEditMode(false)}>
                    {language === "en" ? "Cancel" : "Annuler"}
                  </GlassButton>
                  <GlassButton type="submit" variant="primary">
                    {language === "en" ? "Save changes" : "Enregistrer les modifications"}
                  </GlassButton>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
