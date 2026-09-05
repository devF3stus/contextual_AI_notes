export default function NoteCard({ note, onEdit, onDelete, onClick }) {
  const preview = note.content.length > 150
    ? note.content.substring(0, 150) + "..."
    : note.content;

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      {note.title && (
        <h3 className="mb-2 text-base font-semibold text-gray-900 line-clamp-1">
          {note.title}
        </h3>
      )}

      <p className="mb-4 text-sm leading-relaxed text-gray-500 line-clamp-3">
        {preview}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Note #{note.id}</span>

        <div
          className="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onEdit(note)}
            className="rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
