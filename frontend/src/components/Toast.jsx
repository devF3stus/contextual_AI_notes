import { useEffect } from "react";

export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "success" ? "bg-emerald-500" : "bg-red-500";
  const icon = type === "success" ? "\u2713" : "\u2717";

  return (
    <div
      className={`fixed top-4 left-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg sm:left-auto sm:right-5 sm:top-5 sm:w-auto ${bgColor} animate-slide-down`}
    >
      <span className="text-base">{icon}</span>
      {message}
    </div>
  );
}
