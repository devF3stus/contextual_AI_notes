import { useState, useEffect, useRef } from "react";
import RichTextEditor from "./RichTextEditor";

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
  const [content, setContent] = useState(initialContent || "");
  const [partitionId, setPartitionId] = useState(initialPartitionId || "");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);
  const editorRef = useRef(null);

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

  async function handleSave() {
    const editorContent = editorRef.current?.getHTML() || "";
    const plainText = editorRef.current?.getText() || "";
    if ((plainText.trim() === "" && title.trim() === "") || saving) return;
    setSaving(true);
    try {
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

  const hasUnsavedChanges =
    title !== (initialTitle || "") ||
    content !== (initialContent || "") ||
    partitionId !== (initialPartitionId || "");

  const isEditing = !!initialCreatedAt;

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
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Note"}
          </button>
        </div>
      </div>

      {/* Writing area */}
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
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-blue-500 dark:focus:ring-blue-900/50"
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

          {/* Content */}
          <RichTextEditor
            content={content}
            onChange={setContent}
            editorRef={editorRef}
          />
        </div>
      </div>
    </div>
  );
}
