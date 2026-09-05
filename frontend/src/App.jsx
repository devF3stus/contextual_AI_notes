import { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import SearchBar from "./components/SearchBar";
import NoteCard from "./components/NoteCard";
import NoteEditor from "./components/NoteEditor";
import PartitionModal from "./components/PartitionModal";
import Toast from "./components/Toast";
import {
  fetchNotes,
  createNote,
  updateNote,
  deleteNote,
  fetchPartitions,
  createPartition,
  updatePartition,
  deletePartition,
} from "./services/api";

export default function App() {
  const [notes, setNotes] = useState([]);
  const [partitions, setPartitions] = useState([]);
  const [activePartition, setActivePartition] = useState(null);
  const [noteInput, setNoteInput] = useState("");
  const [selectedPartitionId, setSelectedPartitionId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingNote, setEditingNote] = useState(null);
  const [partitionModal, setPartitionModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function showToast(message, type) {
    setToast({ message, type });
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const partitionId =
          activePartition && activePartition !== "all"
            ? activePartition
            : undefined;
        const [notesData, partitionsData] = await Promise.all([
          fetchNotes(partitionId),
          fetchPartitions(),
        ]);
        if (!cancelled) {
          setNotes(notesData);
          setPartitions(partitionsData);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
        if (!cancelled) {
          setError(
            "Unable to connect to the server. Please check your connection and try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activePartition]);

  async function reloadNotes() {
    try {
      const partitionId =
        activePartition && activePartition !== "all"
          ? activePartition
          : undefined;
      const data = await fetchNotes(partitionId);
      setNotes(data);
    } catch (err) {
      console.error("Failed to load notes:", err);
    }
  }

  async function reloadPartitions() {
    try {
      const data = await fetchPartitions();
      setPartitions(data);
    } catch (err) {
      console.error("Failed to load partitions:", err);
    }
  }

  // ─── Notes CRUD ─────────────────────────────────────────────

  const handleAddNote = useCallback(async () => {
    if (noteInput.trim() === "" || saving) return;
    setSaving(true);
    try {
      const partitionId = selectedPartitionId || null;
      const newNote = await createNote(noteInput, partitionId);
      setNotes((prev) => [newNote, ...prev]);
      setNoteInput("");
      showToast("Note created successfully", "success");
      reloadPartitions();
    } catch (err) {
      console.error("Failed to create note:", err);
      showToast("Failed to create note", "error");
    } finally {
      setSaving(false);
    }
  }, [noteInput, saving, selectedPartitionId]);

  const handleUpdateNote = useCallback(async (id, content) => {
    try {
      const updatedNote = await updateNote(id, content);
      setNotes((prev) => prev.map((n) => (n.id === id ? updatedNote : n)));
      setEditingNote(null);
      showToast("Note updated", "success");
    } catch (err) {
      console.error("Failed to update note:", err);
      showToast("Failed to update note", "error");
    }
  }, []);

  const handleDeleteNote = useCallback(async (id) => {
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      showToast("Note deleted", "success");
      reloadPartitions();
    } catch (err) {
      console.error("Failed to delete note:", err);
      showToast("Failed to delete note", "error");
    }
  }, []);

  // ─── Partitions CRUD ────────────────────────────────────────

  const handleSavePartition = useCallback(
    async (id, name) => {
      if (id) {
        await updatePartition(id, name);
        showToast("Partition renamed", "success");
      } else {
        await createPartition(name);
        showToast("Partition created", "success");
      }
      setPartitionModal(null);
      reloadPartitions();
    },
    []
  );

  const handleDeletePartition = useCallback(
    async (partition) => {
      if (
        !window.confirm(
          `Delete "${partition.name}"? Notes in this partition will become uncategorized.`
        )
      ) {
        return;
      }
      try {
        await deletePartition(partition.id);
        if (activePartition === partition.id) {
          setActivePartition(null);
        }
        showToast("Partition deleted", "success");
        reloadPartitions();
        reloadNotes();
      } catch (err) {
        console.error("Failed to delete partition:", err);
        showToast("Failed to delete partition", "error");
      }
    },
    [activePartition]
  );

  // ─── Derived state ──────────────────────────────────────────

  const filteredNotes = notes.filter(
    (note) =>
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.title &&
        note.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const displayNotes = searchQuery ? filteredNotes : notes;

  const activePartitionName =
    activePartition && activePartition !== "all"
      ? partitions.find((p) => p.id === activePartition)?.name
      : null;

  const pageTitle = searchQuery
    ? `Search results (${displayNotes.length})`
    : activePartition === "all"
    ? "All Notes"
    : activePartitionName
    ? activePartitionName
    : "Welcome back";

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        partitions={partitions}
        activePartition={activePartition}
        onSelectPartition={(id) => {
          setActivePartition(id);
          setSearchQuery("");
          setMobileMenuOpen(false);
        }}
        onAddPartition={() => setPartitionModal({ mode: "create" })}
        onRenamePartition={(p) =>
          setPartitionModal({ mode: "rename", partition: p })
        }
        onDeletePartition={handleDeletePartition}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Mobile header */}
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-900">
              Contextual AI Notes
            </h1>
          </div>

          {/* Page title */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {pageTitle}
            </h2>
            {activePartitionName && !searchQuery && (
              <p className="mt-1 text-gray-500">
                {notes.length} {notes.length === 1 ? "note" : "notes"} in this
                partition
              </p>
            )}
            {!activePartitionName && !searchQuery && (
              <p className="mt-1 text-gray-500">
                Capture your thoughts and keep your ideas organized.
              </p>
            )}
          </div>

          {/* Search */}
          <div className="mb-6">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Quick add */}
          <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Quick note... (just start typing)"
              className="w-full resize-none rounded-lg border-0 bg-transparent p-1 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              rows="2"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  handleAddNote();
                }
              }}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <select
                value={selectedPartitionId}
                onChange={(e) => setSelectedPartitionId(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Uncategorized</option>
                {partitions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-gray-400 sm:inline">
                  Ctrl+Enter to save
                </span>
                <button
                  onClick={handleAddNote}
                  disabled={noteInput.trim() === "" || saving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add Note"}
                </button>
              </div>
            </div>
          </div>

          {/* Notes section header */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {searchQuery
                ? `Search results (${displayNotes.length})`
                : "Your Notes"}
            </h3>
            {!searchQuery && notes.length > 0 && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                {notes.length} {notes.length === 1 ? "note" : "notes"}
              </span>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
              <p className="text-sm text-gray-500">Loading your notes...</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
              <svg
                className="mx-auto mb-3 h-10 w-10 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="mb-3 text-sm font-medium text-red-800">{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  const partitionId =
                    activePartition && activePartition !== "all"
                      ? activePartition
                      : undefined;
                  fetchNotes(partitionId)
                    .then(setNotes)
                    .catch(() =>
                      setError("Unable to connect to the server.")
                    )
                    .finally(() => setLoading(false));
                }}
                className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Notes grid */}
          {!loading && !error && displayNotes.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {displayNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={setEditingNote}
                  onDelete={handleDeleteNote}
                  onClick={() => setEditingNote(note)}
                />
              ))}
            </div>
          )}

          {/* Empty: no notes at all */}
          {!loading && !error && notes.length === 0 && !searchQuery && (
            <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
              <svg
                className="mx-auto mb-4 h-12 w-12 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <h3 className="mb-1 text-lg font-semibold text-gray-900">
                {activePartitionName
                  ? "This partition is empty"
                  : "No notes yet"}
              </h3>
              <p className="mb-6 text-sm text-gray-500">
                {activePartitionName
                  ? "Add a note to this partition to get started."
                  : "Capture your first thought and start building your personal knowledge space."}
              </p>
              <button
                onClick={() => document.querySelector("textarea")?.focus()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Your First Note
              </button>
            </div>
          )}

          {/* Empty: search no results */}
          {!loading &&
            !error &&
            searchQuery &&
            displayNotes.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
                <svg
                  className="mx-auto mb-4 h-12 w-12 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <h3 className="mb-1 text-lg font-semibold text-gray-900">
                  No notes found
                </h3>
                <p className="text-sm text-gray-500">
                  No notes found for &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            )}
        </div>
      </main>

      {/* Edit modal */}
      {editingNote && (
        <NoteEditor
          note={editingNote}
          onSave={handleUpdateNote}
          onClose={() => setEditingNote(null)}
        />
      )}

      {/* Partition modal */}
      {partitionModal && (
        <PartitionModal
          partition={
            partitionModal.mode === "rename" ? partitionModal.partition : null
          }
          onSave={handleSavePartition}
          onClose={() => setPartitionModal(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
