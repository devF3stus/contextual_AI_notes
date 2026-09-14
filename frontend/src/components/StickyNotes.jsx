import { useState, useEffect } from "react";
import {
  fetchStickyNotes,
  createStickyNote,
  updateStickyNote,
  deleteStickyNote,
} from "../services/api";

function StickyNoteCard({ note, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!editContent.trim() || saving) return;
    setSaving(true);
    try {
      await updateStickyNote(note.id, editContent.trim());
      onEdit(note.id, editContent.trim());
      setEditing(false);
    } catch {
      alert("Failed to update sticky note. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditContent(note.content);
    setEditing(false);
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") handleCancel();
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          className="w-full resize-none rounded border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-amber-400 dark:text-gray-100 dark:placeholder:text-amber-600"
          placeholder="Sticky note..."
          autoFocus
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !editContent.trim()}
            className="rounded px-3 py-1 text-xs font-medium text-white bg-amber-500 transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleCancel}
            className="rounded px-3 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-lg border border-amber-200 bg-amber-50 p-3 transition-colors hover:border-amber-300 dark:border-amber-800 dark:bg-amber-950/30 dark:hover:border-amber-700">
      <div className="mb-1 flex items-start gap-2">
        <span className="mt-0.5 text-amber-500 dark:text-amber-400" aria-hidden="true">
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
          </svg>
        </span>
        <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          {note.content}
        </p>
      </div>
      <div className="flex items-center gap-2 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100">
        <button
          onClick={() => setEditing(true)}
          className="rounded px-2 py-1 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/50"
          aria-label="Edit sticky note"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(note.id)}
          className="rounded px-2 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
          aria-label="Delete sticky note"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function StickyNotes({ noteId }) {
  const [stickyNotes, setStickyNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newContent, setNewContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    if (!noteId) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchStickyNotes(noteId);
        if (!cancelled) setStickyNotes(data);
      } catch {
        if (!cancelled) setError("Failed to load sticky notes.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [noteId]);

  async function handleCreate() {
    if (!newContent.trim() || creating) return;
    setCreating(true);
    try {
      const created = await createStickyNote(noteId, newContent.trim());
      setStickyNotes((prev) => [...prev, created]);
      setNewContent("");
      setShowEditor(false);
    } catch {
      alert("Failed to create sticky note. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  function handleEdit(id, newContentText) {
    setStickyNotes((prev) =>
      prev.map((sn) => (sn.id === id ? { ...sn, content: newContentText } : sn))
    );
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this sticky note?")) return;
    try {
      await deleteStickyNote(id);
      setStickyNotes((prev) => prev.filter((sn) => sn.id !== id));
    } catch {
      alert("Failed to delete sticky note. Please try again.");
    }
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleCreate();
    }
    if (e.key === "Escape") {
      setNewContent("");
      setShowEditor(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700 sm:px-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Sticky Notes
          {stickyNotes.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-gray-500">
              ({stickyNotes.length})
            </span>
          )}
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-3">
        {/* Loading */}
        {loading && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-amber-200 border-t-amber-500"></div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Loading...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center dark:border-red-800 dark:bg-red-900/20">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && stickyNotes.length === 0 && !showEditor && (
          <div className="py-6 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              No sticky notes yet.
            </p>
          </div>
        )}

        {/* Sticky notes list */}
        {!loading && !error && stickyNotes.length > 0 && (
          <div className="space-y-2">
            {stickyNotes.map((sn) => (
              <StickyNoteCard
                key={sn.id}
                note={sn}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Inline editor */}
        {showEditor && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className="w-full resize-none rounded border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-amber-400 dark:text-gray-100 dark:placeholder:text-amber-600"
              placeholder="Type your sticky note..."
              autoFocus
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !newContent.trim()}
                className="rounded px-3 py-1 text-xs font-medium text-white bg-amber-500 transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? "Saving..." : "Add"}
              </button>
              <button
                onClick={() => {
                  setNewContent("");
                  setShowEditor(false);
                }}
                className="rounded px-3 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add button */}
      {!showEditor && !loading && (
        <div className="border-t border-gray-100 px-3 py-3 dark:border-gray-700 sm:px-3">
          <button
            onClick={() => setShowEditor(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-3 py-2 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-50 hover:border-amber-400 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-400 dark:hover:bg-amber-950/40 dark:hover:border-amber-600"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Sticky Note
          </button>
        </div>
      )}
    </div>
  );
}
