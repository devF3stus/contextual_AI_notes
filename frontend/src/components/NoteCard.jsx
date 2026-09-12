function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: diffDay > 365 ? "numeric" : undefined,
  });
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

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

function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

export default function NoteCard({ note, onEdit, onDelete, onClick }) {
  const plainContent = stripHtml(note.content);
  const preview = plainContent.length > 150
    ? plainContent.substring(0, 150) + "..."
    : plainContent;

  const dateToUse = note.updated_at || note.created_at;
  const group = getDateGroup(dateToUse);
  const isRecent = group === "Today" || group === "Yesterday";
  const timestamp = isRecent
    ? formatTime(dateToUse)
    : note.updated_at !== note.created_at
    ? `Edited ${formatRelativeTime(note.updated_at)}`
    : formatRelativeTime(note.created_at);

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-600"
    >
      {note.title && (
        <h3 className="mb-2 text-base font-semibold text-gray-900 line-clamp-1 dark:text-white">
          {note.title}
        </h3>
      )}

      <p className="mb-4 text-sm leading-relaxed text-gray-500 line-clamp-3 dark:text-gray-400">
        {preview}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {note.partition_name && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {note.partition_name}
            </span>
          )}
          {timestamp && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{timestamp}</span>
          )}
        </div>

        <div
          className="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onEdit(note)}
            className="rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
