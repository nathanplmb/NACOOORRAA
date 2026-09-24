import { CalendarEvent } from "../types";

export interface GoogleCalendarApiEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
  status?: string;
}

/**
 * Lists events from the user's primary Google Calendar.
 */
export async function listGoogleCalendarEvents(
  accessToken: string,
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 100
): Promise<GoogleCalendarApiEvent[]> {
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.append("singleEvents", "true");
  url.searchParams.append("orderBy", "startTime");
  url.searchParams.append("maxResults", String(maxResults));
  
  if (timeMin) {
    url.searchParams.append("timeMin", timeMin);
  } else {
    // Default to start of current month - 1 month
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    url.searchParams.append("timeMin", d.toISOString());
  }

  if (timeMax) {
    url.searchParams.append("timeMax", timeMax);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erreur Google Calendar (${response.status})`);
  }

  const data = await response.json();
  return (data.items || []) as GoogleCalendarApiEvent[];
}

/**
 * Creates an event on the user's primary Google Calendar.
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  event: {
    title: string;
    description?: string;
    location?: string;
    date: string; // YYYY-MM-DD
    time?: string; // HH:MM
    durationMinutes?: number;
  }
): Promise<GoogleCalendarApiEvent> {
  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

  let startPayload: { dateTime?: string; date?: string };
  let endPayload: { dateTime?: string; date?: string };

  if (event.time) {
    const startIso = `${event.date}T${event.time}:00`;
    const startDate = new Date(startIso);
    const duration = event.durationMinutes || 60;
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    
    // Format to local ISO without Z or with timezone offset
    const pad = (n: number) => String(n).padStart(2, "0");
    const formatLocal = (d: Date) => 
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    startPayload = { dateTime: new Date(startIso).toISOString() };
    endPayload = { dateTime: endDate.toISOString() };
  } else {
    startPayload = { date: event.date };
    // Google all-day end date is exclusive (day + 1)
    const nextDay = new Date(event.date);
    nextDay.setDate(nextDay.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    const nextDayStr = `${nextDay.getFullYear()}-${pad(nextDay.getMonth() + 1)}-${pad(nextDay.getDate())}`;
    endPayload = { date: nextDayStr };
  }

  const payload = {
    summary: event.title,
    description: event.description || "",
    location: event.location || "",
    start: startPayload,
    end: endPayload,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erreur création événement Google Calendar (${response.status})`);
  }

  return (await response.json()) as GoogleCalendarApiEvent;
}

/**
 * Updates an event on the user's primary Google Calendar.
 */
export async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  event: {
    title: string;
    description?: string;
    location?: string;
    date: string;
    time?: string;
    durationMinutes?: number;
  }
): Promise<GoogleCalendarApiEvent> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`;

  let startPayload: { dateTime?: string; date?: string };
  let endPayload: { dateTime?: string; date?: string };

  if (event.time) {
    const startIso = `${event.date}T${event.time}:00`;
    const startDate = new Date(startIso);
    const duration = event.durationMinutes || 60;
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    startPayload = { dateTime: startDate.toISOString() };
    endPayload = { dateTime: endDate.toISOString() };
  } else {
    startPayload = { date: event.date };
    const nextDay = new Date(event.date);
    nextDay.setDate(nextDay.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    const nextDayStr = `${nextDay.getFullYear()}-${pad(nextDay.getMonth() + 1)}-${pad(nextDay.getDate())}`;
    endPayload = { date: nextDayStr };
  }

  const payload = {
    summary: event.title,
    description: event.description || "",
    location: event.location || "",
    start: startPayload,
    end: endPayload,
  };

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erreur mise à jour Google Calendar (${response.status})`);
  }

  return (await response.json()) as GoogleCalendarApiEvent;
}

/**
 * Deletes an event from the user's primary Google Calendar.
 */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erreur suppression Google Calendar (${response.status})`);
  }
}

/**
 * Converts a GoogleCalendarApiEvent to a NACORA CalendarEvent.
 */
export function convertGoogleEventToNacora(gEvent: GoogleCalendarApiEvent): CalendarEvent {
  const rawDate = gEvent.start.dateTime || gEvent.start.date || "";
  let datePart = "";
  let timePart: string | undefined = undefined;

  if (rawDate.includes("T")) {
    const d = new Date(rawDate);
    const pad = (n: number) => String(n).padStart(2, "0");
    datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    timePart = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } else {
    datePart = rawDate.slice(0, 10);
  }

  let type: CalendarEvent["type"] = "other";
  const lowerSummary = (gEvent.summary || "").toLowerCase();
  const lowerDesc = (gEvent.description || "").toLowerCase();

  if (lowerSummary.includes("entretien") || lowerSummary.includes("interview") || lowerSummary.includes("rh") || lowerDesc.includes("entretien")) {
    type = "interview";
  } else if (lowerSummary.includes("deadline") || lowerSummary.includes("candidature") || lowerSummary.includes("date limite")) {
    type = "deadline";
  } else if (lowerSummary.includes("relance") || lowerSummary.includes("follow up") || lowerSummary.includes("rappel")) {
    type = "follow_up";
  }

  return {
    id: `gcal_${gEvent.id}`,
    googleEventId: gEvent.id,
    isGoogleEvent: true,
    title: gEvent.summary || "Événement Google Calendar",
    date: datePart,
    time: timePart,
    type,
    notes: gEvent.description || "",
    location: gEvent.location || "",
    htmlLink: gEvent.htmlLink,
    completed: false,
    createdAt: new Date().toISOString(),
  };
}

export const googleEventToCalendarEvent = convertGoogleEventToNacora;
