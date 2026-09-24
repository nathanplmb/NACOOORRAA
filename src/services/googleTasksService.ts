import { GoogleTaskItem, GoogleTaskList } from "../types";

/**
 * Lists all task lists for the user.
 */
export async function listGoogleTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
  const url = "https://tasks.googleapis.com/tasks/v1/users/@me/lists";
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erreur listes Google Tasks (${response.status})`);
  }

  const data = await response.json();
  return (data.items || []) as GoogleTaskList[];
}

/**
 * Lists tasks in a specific task list (or primary list).
 */
export async function listGoogleTasks(
  accessToken: string,
  listId: string = "@default",
  showCompleted: boolean = true
): Promise<GoogleTaskItem[]> {
  const url = new URL(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks`);
  url.searchParams.append("showCompleted", String(showCompleted));
  url.searchParams.append("showHidden", "false");
  url.searchParams.append("maxResults", "100");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erreur tâches Google Tasks (${response.status})`);
  }

  const data = await response.json();
  const items: any[] = data.items || [];
  return items.map((t) => ({
    id: t.id,
    title: t.title || "Tâche sans titre",
    notes: t.notes || "",
    due: t.due,
    status: t.status === "completed" ? "completed" : "needsAction",
    completed: t.completed,
    deleted: t.deleted,
    hidden: t.hidden,
    parent: t.parent,
    position: t.position,
    updated: t.updated,
    selfLink: t.selfLink,
    listId,
  }));
}

/**
 * Creates a new task in Google Tasks.
 */
export async function createGoogleTask(
  accessToken: string,
  task: {
    title: string;
    notes?: string;
    due?: string; // e.g. YYYY-MM-DD or RFC 3339
    listId?: string;
  }
): Promise<GoogleTaskItem> {
  const listId = task.listId || "@default";
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks`;

  let formattedDue: string | undefined = undefined;
  if (task.due) {
    if (task.due.includes("T")) {
      formattedDue = new Date(task.due).toISOString();
    } else {
      formattedDue = new Date(`${task.due}T00:00:00.000Z`).toISOString();
    }
  }

  const payload: any = {
    title: task.title,
    notes: task.notes || "",
  };
  if (formattedDue) {
    payload.due = formattedDue;
  }

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
    throw new Error(errorData.error?.message || `Erreur création tâche Google Tasks (${response.status})`);
  }

  const t = await response.json();
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    due: t.due,
    status: t.status === "completed" ? "completed" : "needsAction",
    completed: t.completed,
    updated: t.updated,
    selfLink: t.selfLink,
    listId,
  };
}

/**
 * Toggles or updates task status / content in Google Tasks.
 */
export async function updateGoogleTask(
  accessToken: string,
  taskId: string,
  updates: {
    title?: string;
    notes?: string;
    due?: string;
    status?: "needsAction" | "completed";
  },
  listId: string = "@default"
): Promise<GoogleTaskItem> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`;

  const payload: any = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.status !== undefined) {
    payload.status = updates.status;
    if (updates.status === "completed") {
      payload.completed = new Date().toISOString();
    } else {
      payload.completed = null;
    }
  }
  if (updates.due !== undefined) {
    if (updates.due) {
      payload.due = updates.due.includes("T") 
        ? new Date(updates.due).toISOString() 
        : new Date(`${updates.due}T00:00:00.000Z`).toISOString();
    } else {
      payload.due = null;
    }
  }

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
    throw new Error(errorData.error?.message || `Erreur mise à jour tâche Google Tasks (${response.status})`);
  }

  const t = await response.json();
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    due: t.due,
    status: t.status === "completed" ? "completed" : "needsAction",
    completed: t.completed,
    updated: t.updated,
    selfLink: t.selfLink,
    listId,
  };
}

/**
 * Deletes a task from Google Tasks.
 */
export async function deleteGoogleTask(
  accessToken: string,
  taskId: string,
  listId: string = "@default"
): Promise<void> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erreur suppression tâche Google Tasks (${response.status})`);
  }
}
