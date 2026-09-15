const API_BASE = "https://contextual-ai-notes.onrender.com/api";

// ─── Notes ─────────────────────────────────────────────────────
export async function fetchNotes(partitionId) {
  let url = `${API_BASE}/notes`;
  if (partitionId) url += `?partition_id=${partitionId}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch notes");
  return response.json();
}

export async function createNote(title, content, partitionId) {
  const response = await fetch(`${API_BASE}/notes`, {
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
  const response = await fetch(`${API_BASE}/notes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to update note");
  return response.json();
}

export async function deleteNote(id) {
  const response = await fetch(`${API_BASE}/notes/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete note");
  return response.json();
}

// ─── Partitions ────────────────────────────────────────────────

export async function fetchPartitions() {
  const response = await fetch(`${API_BASE}/partitions`);
  if (!response.ok) throw new Error("Failed to fetch partitions");
  return response.json();
}

export async function createPartition(name) {
  const response = await fetch(`${API_BASE}/partitions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error("Failed to create partition");
  return response.json();
}

export async function updatePartition(id, name) {
  const response = await fetch(`${API_BASE}/partitions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error("Failed to update partition");
  return response.json();
}

export async function deletePartition(id) {
  const response = await fetch(`${API_BASE}/partitions/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete partition");
  return response.json();
}

// ─── Note Pages ────────────────────────────────────────────────

export async function fetchPages(noteId) {
  const response = await fetch(`${API_BASE}/notes/${noteId}/pages`);
  if (!response.ok) throw new Error("Failed to fetch pages");
  return response.json();
}

export async function createPage(noteId, content, pageNumber) {
  const response = await fetch(`${API_BASE}/notes/${noteId}/pages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content || "", page_number: pageNumber }),
  });
  if (!response.ok) throw new Error("Failed to create page");
  return response.json();
}

export async function fetchPage(pageId) {
  const response = await fetch(`${API_BASE}/pages/${pageId}`);
  if (!response.ok) throw new Error("Failed to fetch page");
  return response.json();
}

export async function updatePage(pageId, content) {
  const response = await fetch(`${API_BASE}/pages/${pageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error("Failed to update page");
  return response.json();
}

export async function deletePage(pageId) {
  const response = await fetch(`${API_BASE}/pages/${pageId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete page");
  return response.json();
}

// ─── Sticky Notes ──────────────────────────────────────────────

export async function fetchStickyNotes(pageId) {
  const response = await fetch(`${API_BASE}/pages/${pageId}/sticky-notes`);
  if (!response.ok) throw new Error("Failed to fetch sticky notes");
  return response.json();
}

export async function createStickyNote(pageId, content) {
  const response = await fetch(`${API_BASE}/pages/${pageId}/sticky-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error("Failed to create sticky note");
  return response.json();
}

export async function updateStickyNote(id, content) {
  const response = await fetch(`${API_BASE}/sticky-notes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error("Failed to update sticky note");
  return response.json();
}

export async function deleteStickyNote(id) {
  const response = await fetch(`${API_BASE}/sticky-notes/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete sticky note");
  return response.json();
}
