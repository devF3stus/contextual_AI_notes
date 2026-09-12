import { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import SearchBar from "./components/SearchBar";
import NoteCard from "./components/NoteCard";
import NoteWriter from "./components/NoteWriter";
import NoteEditor from "./components/NoteEditor";
import PartitionModal from "./components/PartitionModal";
import ThemeSettings from "./components/ThemeSettings";
import BackgroundSettings from "./components/BackgroundSettings";
import Toast from "./components/Toast";
import { useTheme } from "./context/ThemeContext";
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
  const { backgroundImage } = useTheme();
  const [notes, setNotes] = useState([]);
  const [partitions, setPartitions] = useState([]);
  const [activePartition, setActivePartition] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingNote, setEditingNote] = useState(null);
  const [writingNote, setWritingNote] = useState(null);
  const [partitionModal, setPartitionModal] = useState(null);
  const [themeSettingsOpen, setThemeSettingsOpen] = useState(false);
  const [backgroundSettingsOpen, setBackgroundSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
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

  const handleCreateFromWriter = useCallback(
    async (title, content, partitionId) => {
      const newNote = await createNote(title, content, partitionId);
      setNotes((prev) => [newNote, ...prev]);
      setWritingNote(null);
      showToast("Note created successfully", "success");
      reloadPartitions();
    },
    []
  );

  const handleUpdateFromWriter = useCallback(
    async (title, content, partitionId) => {
      const id = writingNote.note.id;
      const updatedNote = await updateNote(id, title, content, partitionId);
      setNotes((prev) => prev.map((n) => (n.id === id ? updatedNote : n)));
      setWritingNote(null);
      showToast("Note updated", "success");
    },
    [writingNote]
  );

  const handleUpdateFromEditor = useCallback(async (title, content) => {
    const id = editingNote.id;
    const updatedNote = await updateNote(id, title, content);
    setNotes((prev) => prev.map((n) => (n.id === id ? updatedNote : n)));
    setEditingNote(null);
    showToast("Note updated", "success");
  }, [editingNote]);

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

  function stripHtml(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  const filteredNotes = notes.filter((note) => {
    const plainContent = stripHtml(note.content);
    return (
      plainContent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.title &&
        note.title.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const sortedNotes = [...(searchQuery ? filteredNotes : notes)].sort((a, b) => {
    const dateA = new Date(a.updated_at || a.created_at);
    const dateB = new Date(b.updated_at || b.created_at);
    return dateB - dateA;
  });

  function getDateGroup(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const noteDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (noteDate.getTime() === today.getTime()) return "Today";
    if (noteDate.getTime() === yesterday.getTime()) return "Yesterday";
    if (noteDate >= weekStart) return "Earlier this week";
    return "Older";
  }

  const groupedNotes = sortedNotes.reduce((groups, note) => {
    const dateToUse = note.updated_at || note.created_at;
    const group = getDateGroup(dateToUse);
    if (!groups[group]) groups[group] = [];
    groups[group].push(note);
    return groups;
  }, {});

  const activePartitionName =
    activePartition && activePartition !== "all"
      ? partitions.find((p) => p.id === activePartition)?.name
      : null;

  const pageTitle = searchQuery
    ? `Search results (${sortedNotes.length})`
    : activePartition === "all"
    ? "All Notes"
    : activePartitionName
    ? activePartitionName
    : "Welcome back";

  // ─── Writing mode (full screen) ────────────────────────────

  if (writingNote) {
    return (
      <div className="flex h-screen bg-white dark:bg-gray-900">
        <NoteWriter
          partitions={partitions}
          initialPartitionId={
            writingNote.mode === "new"
              ? writingNote.partitionId || ""
              : writingNote.note.partition_id || ""
          }
          initialTitle={writingNote.mode === "edit" ? writingNote.note.title || "" : ""}
          initialContent={writingNote.mode === "edit" ? writingNote.note.content : ""}
          initialCreatedAt={writingNote.mode === "edit" ? writingNote.note.created_at : null}
          initialUpdatedAt={writingNote.mode === "edit" ? writingNote.note.updated_at : null}
          onSave={
            writingNote.mode === "new"
              ? handleCreateFromWriter
              : handleUpdateFromWriter
          }
          onClose={() => setWritingNote(null)}
        />
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

  // ─── Dashboard ──────────────────────────────────────────────

  const hasBackground = backgroundImage && backgroundImage.length > 0;

  return (
    <div className="relative flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Background image layer */}
      {hasBackground && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{ background: backgroundImage }}
        />
      )}

      {/* Overlay for readability */}
      {hasBackground && (
        <div className="pointer-events-none absolute inset-0 z-0 bg-white/70 dark:bg-gray-900/80" />
      )}

      <div className="relative z-10 flex h-full w-full">
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
        onOpenSettings={() => setThemeSettingsOpen(true)}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Mobile header */}
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Contextual AI Notes</h1>
          </div>

          {/* Page title */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                {pageTitle}
              </h2>
              {activePartitionName && !searchQuery && (
                <p className="mt-1 text-gray-500 dark:text-gray-400">
                  {notes.length} {notes.length === 1 ? "note" : "notes"} in this partition
                </p>
              )}
              {!activePartitionName && !searchQuery && (
                <p className="mt-1 text-gray-500 dark:text-gray-400">
                  Capture your thoughts and keep your ideas organized.
                </p>
              )}
            </div>
            <button
              onClick={() =>
                setWritingNote({
                  mode: "new",
                  partitionId: activePartition && activePartition !== "all" ? activePartition : null,
                })
              }
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">New Note</span>
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Notes section header */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {searchQuery
                ? `Search results (${sortedNotes.length})`
                : "Your Notes"}
            </h3>
            {!searchQuery && notes.length > 0 && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {notes.length} {notes.length === 1 ? "note" : "notes"}
              </span>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-blue-600 dark:border-blue-800 dark:border-t-blue-400"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading your notes...</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
              <svg className="mx-auto mb-3 h-10 w-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="mb-3 text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
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
                    .catch(() => setError("Unable to connect to the server."))
                    .finally(() => setLoading(false));
                }}
                className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Notes grid */}
          {!loading && !error && sortedNotes.length > 0 && (
            <div>
              {searchQuery ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {sortedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onEdit={(n) =>
                        setWritingNote({ mode: "edit", note: n })
                      }
                      onDelete={handleDeleteNote}
                      onClick={() =>
                        setWritingNote({ mode: "edit", note })
                      }
                    />
                  ))}
                </div>
              ) : (
                Object.entries(groupedNotes).map(([group, notesInGroup]) => (
                  <div key={group} className="mb-8">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {group}
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {notesInGroup.map((note) => (
                        <NoteCard
                          key={note.id}
                          note={note}
                          onEdit={(n) =>
                            setWritingNote({ mode: "edit", note: n })
                          }
                          onDelete={handleDeleteNote}
                          onClick={() =>
                            setWritingNote({ mode: "edit", note })
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Empty: no notes at all */}
          {!loading && !error && notes.length === 0 && !searchQuery && (
            <div className="animate-fade-in-up rounded-xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
              <svg className="mx-auto mb-4 h-12 w-12 text-gray-300 animate-bounce-subtle dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                {activePartitionName ? "This partition is empty" : "No notes yet"}
              </h3>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                {activePartitionName
                  ? "Add a note to this partition to get started."
                  : "Capture your first thought and start building your personal knowledge space."}
              </p>
              <button
                onClick={() =>
                  setWritingNote({
                    mode: "new",
                    partitionId:
                      activePartition && activePartition !== "all"
                        ? activePartition
                        : null,
                  })
                }
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your First Note
              </button>
            </div>
          )}

          {/* Empty: search no results */}
          {!loading && !error && searchQuery && sortedNotes.length === 0 && (
            <div className="animate-fade-in-up rounded-xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
              <svg className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">No notes found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No notes found for &ldquo;{searchQuery}&rdquo;
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Edit modal (kept for simple inline edits) */}
      {editingNote && (
        <NoteEditor
          note={editingNote}
          onSave={handleUpdateFromEditor}
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

      {/* Theme Settings modal */}
      {themeSettingsOpen && (
        <ThemeSettings
          onClose={() => setThemeSettingsOpen(false)}
          onOpenBackground={() => {
            setThemeSettingsOpen(false);
            setBackgroundSettingsOpen(true);
          }}
        />
      )}

      {/* Background Settings modal */}
      {backgroundSettingsOpen && (
        <BackgroundSettings onClose={() => setBackgroundSettingsOpen(false)} />
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
    </div>
  );
}
