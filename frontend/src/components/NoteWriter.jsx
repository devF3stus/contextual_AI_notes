import { useState, useEffect, useRef, useCallback } from "react";
import RichTextEditor from "./RichTextEditor";
import StickyNotes from "./StickyNotes";
import { fetchPages, createPage, updatePage } from "../services/api";

function formatTimestamp(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NoteWriter({
  noteId,
  partitions,
  initialPartitionId,
  initialTitle,
  initialContent,
  initialCreatedAt,
  initialUpdatedAt,
  onSave,
  onClose,
}) {
  const [title, setTitle] = useState(initialTitle || "");
  const [partitionId, setPartitionId] = useState(initialPartitionId || "");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);
  const editorRef = useRef(null);

  const isEditing = !!initialCreatedAt;

  // Page state
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pagesLoaded, setPagesLoaded] = useState(!isEditing);
  const [pageContent, setPageContent] = useState("");
  const [creatingPage, setCreatingPage] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);

  // Load pages for existing notes
  useEffect(() => {
    if (!noteId || !isEditing) return;
    let cancelled = false;
    async function loadPages() {
      try {
        const data = await fetchPages(noteId);
        if (cancelled) return;
        if (data.length === 0) {
          const created = await createPage(noteId, initialContent || "", 1);
          if (cancelled) return;
          setPages([created]);
          setPageContent(initialContent || "");
        } else {
          setPages(data);
          setPageContent(data[0].content || "");
        }
      } catch (err) {
        console.error("Failed to load pages:", err);
      } finally {
        if (!cancelled) setPagesLoaded(true);
      }
    }
    loadPages();
    return () => { cancelled = true; };
  }, [noteId, isEditing]);

  useEffect(() => {
    if (titleRef.current) titleRef.current.focus();
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Save current page content before switching
  const saveCurrentPage = useCallback(async () => {
    if (!noteId || pages.length === 0) return;
    const currentPage = pages[currentPageIndex];
    if (!currentPage) return;
    if (editorRef.current) {
      const newContent = editorRef.current.getHTML();
      if (newContent !== currentPage.content) {
        try {
          const updated = await updatePage(currentPage.id, newContent);
          setPages((prev) =>
            prev.map((p, i) => (i === currentPageIndex ? updated : p))
          );
          setEditorDirty(false);
        } catch (err) {
          console.error("Failed to save page:", err);
        }
      }
    }
  }, [noteId, pages, currentPageIndex]);

  // Switch to a different page
  const goToPage = useCallback(async (index) => {
    if (index < 0 || index >= pages.length || index === currentPageIndex) return;
    await saveCurrentPage();
    setCurrentPageIndex(index);
    setPageContent(pages[index].content || "");
    setEditorDirty(false);
  }, [pages, currentPageIndex, saveCurrentPage]);

  // Add a new page
  const addPage = useCallback(async () => {
    if (!noteId || creatingPage) return;
    await saveCurrentPage();
    setCreatingPage(true);
    try {
      const newPage = await createPage(noteId, "", pages.length + 1);
      setPages((prev) => [...prev, newPage]);
      setCurrentPageIndex(pages.length);
      setPageContent("");
      if (editorRef.current) {
        editorRef.current.commands.setContent("");
        editorRef.current.commands.focus();
      }
    } catch (err) {
      console.error("Failed to create page:", err);
    } finally {
      setCreatingPage(false);
    }
  }, [noteId, pages, creatingPage, saveCurrentPage]);

  async function handleSave() {
    const editorContent = editorRef.current?.getHTML() || "";
    const plainText = editorRef.current?.getText() || "";
    if ((plainText.trim() === "" && title.trim() === "") || saving) return;
    setSaving(true);
    try {
      // Save current page first
      if (noteId && pages.length > 0) {
        const currentPage = pages[currentPageIndex];
        if (currentPage && editorRef.current) {
          await updatePage(currentPage.id, editorRef.current.getHTML());
        }
      }
      await onSave(title.trim() || null, editorContent, partitionId || null);
    } catch (err) {
      console.error("Failed to save note:", err);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  }

  function handleContentChange(newContent) {
    setPageContent(newContent);
    setEditorDirty(true);
  }

  const hasUnsavedChanges =
    title !== (initialTitle || "") ||
    partitionId !== (initialPartitionId || "") ||
    editorDirty;

  const totalPages = pages.length;
  const currentPageNumber = currentPageIndex + 1;

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-900">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6 dark:border-gray-700">
        <button
          onClick={() => {
            if (hasUnsavedChanges && !window.confirm("Discard unsaved changes?"))
              return;
            onClose();
          }}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-gray-400 sm:inline dark:text-gray-500">
            Ctrl+S to save
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Note"}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Main editor */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
            {/* Metadata */}
            {isEditing && (
              <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
                <span>Created {formatTimestamp(initialCreatedAt)}</span>
                {initialUpdatedAt !== initialCreatedAt && (
                  <span>Edited {formatTimestamp(initialUpdatedAt)}</span>
                )}
              </div>
            )}

            {/* Partition selector */}
            <div className="mb-6">
              <select
                value={partitionId}
                onChange={(e) => setPartitionId(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-primary-500 dark:focus:ring-primary-900/50"
              >
                <option value="">Uncategorized</option>
                {partitions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Title"
              className="mb-4 w-full border-0 bg-transparent text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300 sm:text-3xl dark:text-white dark:placeholder:text-gray-600"
            />

            {/* Divider */}
            <div className="mb-6 border-b border-gray-100 dark:border-gray-700"></div>

            {/* Page indicator - top */}
            {isEditing && totalPages > 0 && (
              <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 dark:bg-gray-800">
                <button
                  onClick={() => goToPage(currentPageIndex - 1)}
                  disabled={currentPageIndex === 0}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Prev
                </button>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Page {currentPageNumber} of {totalPages}
                </span>
                <button
                  onClick={() => goToPage(currentPageIndex + 1)}
                  disabled={currentPageIndex >= totalPages - 1}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Next
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Content editor */}
            {pagesLoaded && (
              <RichTextEditor
                content={pageContent}
                onChange={handleContentChange}
                editorRef={editorRef}
              />
            )}

            {/* Page indicator - bottom */}
            {isEditing && totalPages > 0 && (
              <div className="mt-6 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 dark:bg-gray-800">
                <button
                  onClick={() => goToPage(currentPageIndex - 1)}
                  disabled={currentPageIndex === 0}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Prev
                </button>
                <button
                  onClick={addPage}
                  disabled={creatingPage}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-primary-400 dark:hover:bg-primary-900/30"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Page
                </button>
                <button
                  onClick={() => goToPage(currentPageIndex + 1)}
                  disabled={currentPageIndex >= totalPages - 1}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Next
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sticky notes - mobile/tablet bottom panel, edit mode only */}
        {isEditing && noteId && pages.length > 0 && (
          <div className="h-56 flex-shrink-0 border-t border-gray-100 sm:h-64 lg:hidden dark:border-gray-700">
            <StickyNotes key={pages[currentPageIndex]?.id} pageId={pages[currentPageIndex]?.id} />
          </div>
        )}

        {/* Sticky notes - desktop side panel, edit mode only */}
        {isEditing && noteId && pages.length > 0 && (
          <div className="hidden w-72 flex-shrink-0 border-l border-gray-100 dark:border-gray-700 lg:flex lg:flex-col">
            <StickyNotes key={pages[currentPageIndex]?.id} pageId={pages[currentPageIndex]?.id} />
          </div>
        )}
      </div>
    </div>
  );
}
