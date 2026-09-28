import { useState, useEffect, useRef, useCallback } from "react";
import RichTextEditor from "./RichTextEditor";
import StickyNotes from "./StickyNotes";
import { fetchPages, createNote, createPage, updatePage } from "../services/api";

const AUTOSAVE_DELAY = 1500;
const AUTOSAVE_RETRY_DELAY = 5000;

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
  onUpdateNote,
  onCreated,
  onClose,
}) {
  const [title, setTitle] = useState(initialTitle || "");
  const [partitionId, setPartitionId] = useState(initialPartitionId || "");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);
  const editorRef = useRef(null);

  const isEditing = !!initialCreatedAt;

  // Page state.
  // New (unsaved) notes start with a local in-memory page so pagination and
  // navigation work from the first keystroke. Local pages are joined into
  // the note body on save and become real pages on reopen.
  const [pages, setPages] = useState(() => {
    if (isEditing) return [];
    return [
      {
        id: `local-${Date.now()}-init`,
        note_id: null,
        page_number: 1,
        content: "",
        created_at: new Date().toISOString(),
        updated_at: null,
        local: true,
      },
    ];
  });
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pagesLoaded, setPagesLoaded] = useState(!isEditing);
  const [pageContent, setPageContent] = useState("");
  const [pageBusy, setPageBusy] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);
  const [cursorRequest, setCursorRequest] = useState(null);
  const [savedNoteId, setSavedNoteId] = useState(null);
  const [saveState, setSaveState] = useState({ status: "idle", at: null });
  const [cleanTitle, setCleanTitle] = useState(initialTitle || "");
  const [cleanPartitionId, setCleanPartitionId] = useState(initialPartitionId || "");

  // Serialize every page mutation (overflow distribution, navigation,
  // manual page creation) so concurrent triggers can never create
  // duplicate pages or interleave writes.
  const pageLockRef = useRef(false);
  const cursorIdRef = useRef(0);
  const localPageIdRef = useRef(0);
  const pagesRef = useRef([]);
  const pageIndexRef = useRef(0);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  useEffect(() => {
    pageIndexRef.current = currentPageIndex;
  }, [currentPageIndex]);

  // The note record id, whether it came in as a prop (edit mode) or was
  // created by autosave (new mode). Null until a new note is persisted.
  const activeNoteId = noteId || savedNoteId;
  const activeNoteIdRef = useRef(null);

  useEffect(() => {
    activeNoteIdRef.current = activeNoteId;
  }, [activeNoteId]);

  // Autosave bookkeeping. dirtyRef marks unsaved changes; dirtyGenRef guards
  // against clearing flags for keystrokes typed mid-save.
  const dirtyRef = useRef(false);
  const dirtyGenRef = useRef(0);
  const autosaveTimerRef = useRef(null);
  const doAutosaveRef = useRef(null);

  function scheduleAutosave() {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      doAutosaveRef.current?.();
    }, AUTOSAVE_DELAY);
  }

  function markDirty() {
    dirtyRef.current = true;
    dirtyGenRef.current += 1;
    scheduleAutosave();
  }

  function scheduleAutosaveRetry() {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      doAutosaveRef.current?.();
    }, AUTOSAVE_RETRY_DELAY);
  }

  async function acquirePageLock() {
    let waited = 0;
    while (pageLockRef.current && waited < 2000) {
      await new Promise((r) => setTimeout(r, 50));
      waited += 50;
    }
    if (pageLockRef.current) return false;
    pageLockRef.current = true;
    return true;
  }

  function releasePageLock() {
    pageLockRef.current = false;
  }

  function nextPageNumber(list) {
    let max = list.length;
    for (const p of list) {
      const n = Number(p.page_number) || 0;
      if (n > max) max = n;
    }
    return max + 1;
  }

  function makeLocalPage(content, pageNumber) {
    localPageIdRef.current += 1;
    return {
      id: `local-${Date.now()}-${localPageIdRef.current}`,
      note_id: null,
      page_number: pageNumber,
      content: content || "",
      created_at: new Date().toISOString(),
      updated_at: null,
      local: true,
    };
  }

  function isPersistedPage(page) {
    return (
      !!page &&
      !page.local &&
      !!page.id &&
      String(page.id).indexOf("local-") !== 0
    );
  }

  function requestCursor(pos) {
    cursorIdRef.current += 1;
    setCursorRequest({ id: cursorIdRef.current, pos: Math.max(0, pos || 0) });
  }

  function joinPages(list, idx, liveHtml) {
    return list
      .map((p, i) => (i === idx ? liveHtml : p.content || ""))
      .join("");
  }

  // Ensure every page slot is persisted (update changed pages, create local
  // ones). Assumes the page lock is held. Returns the up-to-date list.
  async function persistAllPages(liveHtml) {
    const list = pagesRef.current;
    const idx = pageIndexRef.current;
    let working = [...list];
    for (let i = 0; i < working.length; i++) {
      const p = working[i];
      const html = i === idx ? liveHtml : p.content || "";
      if (isPersistedPage(p)) {
        if (i === idx && html !== p.content) {
          working[i] = await updatePage(p.id, html);
        }
      } else if (activeNoteIdRef.current) {
        working[i] = await createPage(activeNoteIdRef.current, html, p.page_number || i + 1);
      }
    }
    pagesRef.current = working;
    setPages(working);
    return working;
  }

  async function doAutosave() {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (!dirtyRef.current || saving) {
      if (saving) scheduleAutosave();
      return;
    }
    if (!pagesLoaded) {
      scheduleAutosave();
      return;
    }
    const editor = editorRef.current;
    const liveHtml = editor?.getHTML() ?? pageContent;
    const liveText = editor?.getText() ?? "";
    const gen = dirtyGenRef.current;

    if (!activeNoteIdRef.current) {
      // New note: only create once there is real body content.
      if (liveText.trim() === "") return;
      const acquired = await acquirePageLock();
      if (!acquired) {
        scheduleAutosave();
        return;
      }
      setSaveState({ status: "saving", at: null });
      try {
        const list = pagesRef.current;
        const idx = pageIndexRef.current;
        const joined = joinPages(list.length > 0 ? list : [{ content: "" }], list.length > 0 ? idx : 0, liveHtml);
        const createdNote = await createNote(
          title.trim() || null,
          joined,
          partitionId || null
        );
        const createdPages = [];
        const source = list.length > 0 ? list : [{ content: "" }];
        for (let i = 0; i < source.length; i++) {
          const html = i === idx ? liveHtml : source[i].content || "";
          createdPages.push(await createPage(createdNote.id, html, i + 1));
        }
        pagesRef.current = createdPages;
        setPages(createdPages);
        setSavedNoteId(createdNote.id);
        activeNoteIdRef.current = createdNote.id;
        try {
          await onCreated?.(createdNote);
        } catch (err) {
          console.error("Failed to register created note:", err);
        }
        if (dirtyGenRef.current === gen) {
          dirtyRef.current = false;
          setEditorDirty(false);
          setCleanTitle(title);
          setCleanPartitionId(partitionId);
        }
        setSaveState({ status: "saved", at: Date.now() });
      } catch (err) {
        console.error("Autosave failed:", err);
        setSaveState({ status: "error", at: Date.now() });
        scheduleAutosaveRetry();
      } finally {
        releasePageLock();
      }
      return;
    }

    const acquired = await acquirePageLock();
    if (!acquired) {
      scheduleAutosave();
      return;
    }
    setSaveState({ status: "saving", at: null });
    try {
      const working = await persistAllPages(liveHtml);
      const joined = working.map((p) => p.content || "").join("");
      await onUpdateNote?.(
        activeNoteIdRef.current,
        title.trim() || null,
        joined,
        partitionId || null,
        { silent: true }
      );
      if (dirtyGenRef.current === gen) {
        dirtyRef.current = false;
        setEditorDirty(false);
        setCleanTitle(title);
        setCleanPartitionId(partitionId);
      }
      setSaveState({ status: "saved", at: Date.now() });
    } catch (err) {
      console.error("Autosave failed:", err);
      setSaveState({ status: "error", at: Date.now() });
      scheduleAutosaveRetry();
    } finally {
      releasePageLock();
    }
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    doAutosaveRef.current = doAutosave;
  });

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      doAutosaveRef.current?.();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Write the live editor HTML into the current page slot.
  // Persists through the API for real pages; local-only pages update state.
  // Assumes the page lock is held. Returns the up-to-date page list.
  async function flushLiveContent() {
    const liveHtml = editorRef.current?.getHTML();
    if (liveHtml === undefined) return pagesRef.current;
    const list = pagesRef.current;
    const idx = pageIndexRef.current;
    const currentPage = list[idx];
    if (!currentPage) return list;
    if (liveHtml === currentPage.content) return list;
    let next;
    // NOTE: activeNoteId is read from a ref so this stays correct even when
    // called from a stale callback (e.g. navigation after autosave creates
    // the note). Writing state without persisting would lose data on refresh.
    if (isPersistedPage(currentPage) && activeNoteIdRef.current) {
      try {
        const updated = await updatePage(currentPage.id, liveHtml);
        next = list.map((p) => (p.id === currentPage.id ? updated : p));
      } catch (err) {
        console.error("Failed to save page:", err);
        return list;
      }
    } else {
      const snapshot = liveHtml;
      next = list.map((p, i) =>
        i === idx ? { ...p, content: snapshot } : p
      );
    }
    pagesRef.current = next;
    setPages(next);
    return next;
  }

  function setIndex(i) {
    pageIndexRef.current = i;
    setCurrentPageIndex(i);
  }

  // Switch to a different page
  const goToPage = useCallback(async (index) => {
    const list = pagesRef.current;
    if (index < 0 || index >= list.length || index === pageIndexRef.current) return;
    const acquired = await acquirePageLock();
    if (!acquired) return;
    setPageBusy(true);
    const editor = editorRef.current;
    try {
      if (editor) {
        try {
          editor.setEditable(false);
        } catch {
          // ignore
        }
      }
      const fresh = await flushLiveContent();
      const target = fresh[index];
      if (!target) return;
      setIndex(index);
      setPageContent(target.content || "");
      if (activeNoteIdRef.current) setEditorDirty(false);
      setCursorRequest(null);
    } finally {
      if (editor) {
        try {
          editor.setEditable(true);
        } catch {
          // ignore
        }
      }
      setPageBusy(false);
      releasePageLock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add a new page at the end
  const addPage = useCallback(async () => {
    const acquired = await acquirePageLock();
    if (!acquired) return;
    setPageBusy(true);
    const editor = editorRef.current;
    try {
      if (editor) {
        try {
          editor.setEditable(false);
        } catch {
          // ignore
        }
      }
      const fresh = await flushLiveContent();
      if (activeNoteIdRef.current) {
        const newPage = await createPage(activeNoteIdRef.current, "", nextPageNumber(fresh));
        const next = [...fresh, newPage];
        pagesRef.current = next;
        setPages(next);
        setIndex(next.length - 1);
        setPageContent("");
        setEditorDirty(false);
        setCursorRequest(null);
        if (editorRef.current) {
          editorRef.current.commands.setContent("", { emitUpdate: false });
          editorRef.current.commands.focus();
        }
      } else {
        const local = makeLocalPage("", nextPageNumber(fresh));
        const next = [...fresh, local];
        pagesRef.current = next;
        setPages(next);
        setIndex(next.length - 1);
        setPageContent("");
        setCursorRequest(null);
        if (editorRef.current) {
          editorRef.current.commands.setContent("", { emitUpdate: false });
          editorRef.current.commands.focus();
        }
      }
      markDirty();
    } catch (err) {
      console.error("Failed to create page:", err);
    } finally {
      if (editor) {
        try {
          editor.setEditable(true);
        } catch {
          // ignore
        }
      }
      setPageBusy(false);
      releasePageLock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNoteId]);

  // Handle automatic pagination when content overflows.
  // The overflowing tail is pushed forward into the NEXT page (created when
  // missing), so reading order is preserved on every page, not just the last.
  const handleOverflow = useCallback(async ({ moveHtml, keepHtml, cursorInMoved, cursorOffset }) => {
    const acquired = await acquirePageLock();
    if (!acquired) return;
    setPageBusy(true);
    const editor = editorRef.current;
    try {
      if (editor) {
        try {
          editor.setEditable(false);
        } catch {
          // ignore
        }
      }
      const list = pagesRef.current;
      const idx = pageIndexRef.current;
      const currentPage = list[idx];
      if (!currentPage) {
        if (activeNoteIdRef.current) {
          try {
            const created = await createPage(activeNoteIdRef.current, keepHtml, nextPageNumber(list));
            const next = [...list, created];
            pagesRef.current = next;
            setPages(next);
          } catch (err) {
            console.error("Failed to recover missing page:", err);
          }
        }
        return;
      }

      let working = list;
      if (isPersistedPage(currentPage) && activeNoteIdRef.current) {
        const updated = await updatePage(currentPage.id, keepHtml);
        working = working.map((p) => (p.id === currentPage.id ? updated : p));
      } else {
        working = working.map((p, i) =>
          i === idx ? { ...p, content: keepHtml } : p
        );
      }

      const nextIdx = idx + 1;
      let combined;
      if (nextIdx < working.length) {
        const target = working[nextIdx];
        combined = `${moveHtml}${target.content || ""}`;
        if (isPersistedPage(target) && activeNoteIdRef.current) {
          const saved = await updatePage(target.id, combined);
          working = working.map((p) => (p.id === target.id ? saved : p));
        } else {
          working = working.map((p, i) =>
            i === nextIdx ? { ...p, content: combined } : p
          );
        }
      } else if (activeNoteIdRef.current) {
        combined = moveHtml;
        const created = await createPage(activeNoteIdRef.current, combined, nextPageNumber(working));
        working = [...working, created];
      } else {
        combined = moveHtml;
        const local = makeLocalPage(combined, nextPageNumber(working));
        working = [...working, local];
      }

      pagesRef.current = working;
      setPages(working);
      if (activeNoteIdRef.current) setEditorDirty(false);

      if (cursorInMoved) {
        setIndex(nextIdx);
        setPageContent(combined);
        requestCursor(cursorOffset);
      } else {
        setPageContent(keepHtml);
        requestCursor(cursorOffset);
      }
      markDirty();
    } catch (err) {
      console.error("Failed to auto-paginate:", err);
    } finally {
      if (editor) {
        try {
          editor.setEditable(true);
        } catch {
          // ignore
        }
      }
      setPageBusy(false);
      releasePageLock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNoteId]);

  async function handleSave() {
    const editorContent = editorRef.current?.getHTML() || "";
    const plainText = editorRef.current?.getText() || "";
    if ((plainText.trim() === "" && title.trim() === "") || saving) return;
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    setSaving(true);
    try {
      if (activeNoteId && pages.length > 0) {
        // Save current page first (through the page lock so an
        // in-flight overflow distribution cannot interleave).
        const acquired = await acquirePageLock();
        if (acquired) {
          try {
            await flushLiveContent();
          } finally {
            releasePageLock();
          }
        }
        // Persist the whole note body so previews/search cover every page.
        const list = pagesRef.current;
        const idx = pageIndexRef.current;
        const joined = joinPages(list, idx, editorRef.current?.getHTML() || "");
        if (isEditing) {
          await onSave(title.trim() || null, joined, partitionId || null);
        } else {
          await onUpdateNote?.(
            activeNoteId,
            title.trim() || null,
            joined,
            partitionId || null,
            { silent: false }
          );
          onClose();
        }
      } else {
        // New note: join every local page (live editor HTML in the current
        // slot) so no content is lost. On reopen the page system distributes
        // it across real pages automatically.
        const joined =
          pages.length > 0
            ? pages
                .map((p, i) => (i === currentPageIndex ? editorContent : p.content || ""))
                .join("")
            : editorContent;
        await onSave(title.trim() || null, joined, partitionId || null);
      }
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
    markDirty();
  }

  function handleTitleChange(value) {
    setTitle(value);
    markDirty();
  }

  function handlePartitionChange(value) {
    setPartitionId(value);
    markDirty();
  }

  const hasUnsavedChanges =
    title !== cleanTitle ||
    partitionId !== cleanPartitionId ||
    editorDirty;

  function formatSaveTime(ts) {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "";
    }
  }

  const saveHint =
    saveState.status === "saving"
      ? "Saving…"
      : saveState.status === "saved"
      ? `Saved ${formatSaveTime(saveState.at)}`
      : saveState.status === "error"
      ? "Autosave failed — will retry"
      : "Ctrl+S to save";

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
            {saveHint}
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
                onChange={(e) => handlePartitionChange(e.target.value)}
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
              onChange={(e) => handleTitleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Title"
              className="mb-4 w-full border-0 bg-transparent text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300 sm:text-3xl dark:text-white dark:placeholder:text-gray-600"
            />

            {/* Divider */}
            <div className="mb-6 border-b border-gray-100 dark:border-gray-700"></div>

            {/* Page indicator - top */}
            {pagesLoaded && totalPages > 0 && (
              <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 px-2 py-2 sm:px-4 dark:bg-gray-800">
                <button
                  onClick={() => goToPage(currentPageIndex - 1)}
                  disabled={currentPageIndex === 0 || pageBusy}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Prev</span>
                </button>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Page {currentPageNumber} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={addPage}
                    disabled={pageBusy}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-primary-400 dark:hover:bg-primary-900/30"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden sm:inline">New Page</span>
                  </button>
                  <button
                    onClick={() => goToPage(currentPageIndex + 1)}
                    disabled={currentPageIndex >= totalPages - 1 || pageBusy}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Content editor */}
            {pagesLoaded && (
              <RichTextEditor
                content={pageContent}
                onChange={handleContentChange}
                editorRef={editorRef}
                onOverflow={handleOverflow}
                cursorRequest={cursorRequest}
              />
            )}

            {/* Page jump chips */}
            {pagesLoaded && totalPages > 1 && (
              <div className="mt-4 flex items-center gap-1.5 overflow-x-auto rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <span className="mr-1 flex-shrink-0 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Pages
                </span>
                {pages.map((p, i) => (
                  <button
                    key={p.id || i}
                    onClick={() => goToPage(i)}
                    disabled={pageBusy}
                    title={`Go to page ${i + 1}`}
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      i === currentPageIndex
                        ? "bg-primary-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Page indicator - bottom */}
            {pagesLoaded && totalPages > 0 && (
              <div className="mt-6 flex items-center justify-between rounded-lg bg-gray-50 px-2 py-2 sm:px-4 dark:bg-gray-800">
                <button
                  onClick={() => goToPage(currentPageIndex - 1)}
                  disabled={currentPageIndex === 0 || pageBusy}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Prev</span>
                </button>
                <button
                  onClick={addPage}
                  disabled={pageBusy}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-primary-400 dark:hover:bg-primary-900/30"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">New Page</span>
                </button>
                <button
                  onClick={() => goToPage(currentPageIndex + 1)}
                  disabled={currentPageIndex >= totalPages - 1 || pageBusy}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <span className="hidden sm:inline">Next</span>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sticky notes - mobile/tablet bottom panel, persisted notes only */}
        {activeNoteId && (isEditing || savedNoteId) && pages.length > 0 && (
          <div className="h-40 flex-shrink-0 border-t border-gray-100 sm:h-52 lg:hidden dark:border-gray-700">
            <StickyNotes key={pages[currentPageIndex]?.id} pageId={pages[currentPageIndex]?.id} />
          </div>
        )}

        {/* Sticky notes - desktop side panel, persisted notes only */}
        {activeNoteId && (isEditing || savedNoteId) && pages.length > 0 && (
          <div className="hidden w-72 flex-shrink-0 border-l border-gray-100 dark:border-gray-700 lg:flex lg:flex-col">
            <StickyNotes key={pages[currentPageIndex]?.id} pageId={pages[currentPageIndex]?.id} />
          </div>
        )}
      </div>
    </div>
  );
}
