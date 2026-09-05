const API_BASE = "http://localhost:5000/api";

export async function fetchNotes() {
  const response = await fetch(`${API_BASE}/notes`);
  if (!response.ok) throw new Error("Failed to fetch notes");
  return response.json();
}

export async function createNote(content) {
  const response = await fetch(`${API_BASE}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error("Failed to create note");
  return response.json();
}

export async function updateNote(id, content) {
  const response = await fetch(`${API_BASE}/notes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
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
