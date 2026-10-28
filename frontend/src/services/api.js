const API_BASE = "https://contextual-ai-notes.onrender.com/api";

const TOKEN_KEY = "contextual_ai_notes_token";

// ─── Auth Token Helpers ────────────────────────────────────────

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.error("Failed to update token in localStorage:", err);
  }
}

export function removeStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error("Failed to remove token from localStorage:", err);
  }
}

export function authHeaders(extraHeaders = {}) {
  const token = getStoredToken();
  const headers = { ...extraHeaders };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function authFetch(url, options = {}) {
  const headers = authHeaders(options.headers || {});
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    removeStoredToken();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
  }
  return response;
}

// ─── Authentication ────────────────────────────────────────────

export async function login(username, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to log in");
  }
  if (data.token) {
    setStoredToken(data.token);
  }
  return data;
}

export async function verifyToken() {
  const token = getStoredToken();
  if (!token) return false;
  try {
    const response = await authFetch(`${API_BASE}/auth/verify`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.valid === true;
  } catch {
    return false;
  }
}

// ─── Notes ─────────────────────────────────────────────────────

export async function fetchNotes(partitionId) {
  let url = `${API_BASE}/notes`;
  if (partitionId) url += `?partition_id=${partitionId}`;
  const response = await authFetch(url);
  if (!response.ok) throw new Error("Failed to fetch notes");
  return response.json();
}

export async function createNote(title, content, partitionId) {
  const response = await authFetch(`${API_BASE}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title || null, content, partition_id: partitionId || null }),
  });
  if (!response.ok) throw new Error("Failed to create note");
  return response.json();
}

export async function updateNote(id, title, content, partitionId) {
  const body = { title: title !== undefined ? title : null, content };
  if (partitionId !== undefined) body.partition_id = partitionId;
  const response = await authFetch(`${API_BASE}/notes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to update note");
  return response.json();
}

export async function deleteNote(id) {
  const response = await authFetch(`${API_BASE}/notes/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete note");
  return response.json();
}

// ─── Partitions ────────────────────────────────────────────────

export async function fetchPartitions() {
  const response = await authFetch(`${API_BASE}/partitions`);
  if (!response.ok) throw new Error("Failed to fetch partitions");
  return response.json();
}

export async function createPartition(name) {
  const response = await authFetch(`${API_BASE}/partitions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error("Failed to create partition");
  return response.json();
}

export async function updatePartition(id, name) {
  const response = await authFetch(`${API_BASE}/partitions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error("Failed to update partition");
  return response.json();
}

export async function deletePartition(id) {
  const response = await authFetch(`${API_BASE}/partitions/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete partition");
  return response.json();
}

// ─── Note Pages ────────────────────────────────────────────────

export async function fetchPages(noteId) {
  const response = await authFetch(`${API_BASE}/notes/${noteId}/pages`);
  if (!response.ok) throw new Error("Failed to fetch pages");
  return response.json();
}

export async function createPage(noteId, content, pageNumber) {
  const response = await authFetch(`${API_BASE}/notes/${noteId}/pages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content || "", page_number: pageNumber }),
  });
  if (!response.ok) throw new Error("Failed to create page");
  return response.json();
}

export async function fetchPage(pageId) {
  const response = await authFetch(`${API_BASE}/pages/${pageId}`);
  if (!response.ok) throw new Error("Failed to fetch page");
  return response.json();
}

export async function updatePage(pageId, content, pageNumber) {
  const body = { content };
  if (pageNumber !== undefined) body.page_number = pageNumber;
  const response = await authFetch(`${API_BASE}/pages/${pageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to update page");
  return response.json();
}

export async function deletePage(pageId) {
  const response = await authFetch(`${API_BASE}/pages/${pageId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete page");
  return response.json();
}

// ─── Sticky Notes ──────────────────────────────────────────────

export async function fetchStickyNotes(pageId) {
  const response = await authFetch(`${API_BASE}/pages/${pageId}/sticky-notes`);
  if (!response.ok) throw new Error("Failed to fetch sticky notes");
  return response.json();
}

export async function createStickyNote(pageId, content) {
  const response = await authFetch(`${API_BASE}/pages/${pageId}/sticky-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error("Failed to create sticky note");
  return response.json();
}

export async function updateStickyNote(id, content) {
  const response = await authFetch(`${API_BASE}/sticky-notes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error("Failed to update sticky note");
  return response.json();
}

export async function deleteStickyNote(id) {
  const response = await authFetch(`${API_BASE}/sticky-notes/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete sticky note");
  return response.json();
}
