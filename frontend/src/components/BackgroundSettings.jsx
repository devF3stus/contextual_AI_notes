import { useRef } from "react";
import { useTheme } from "../context/ThemeContext";

const PRESET_BACKGROUNDS = [
  { name: "None", value: null },
  { name: "Gradient Blue", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { name: "Gradient Sunset", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { name: "Gradient Ocean", value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { name: "Gradient Forest", value: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
  { name: "Gradient Night", value: "linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d1b69 100%)" },
];

export default function BackgroundSettings({ onClose }) {
  const { backgroundImage, setBackground, removeBackground } = useTheme();
  const fileInputRef = useRef(null);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setBackground(event.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handlePresetSelect(value) {
    if (value === null) {
      removeBackground();
    } else {
      setBackground(value);
    }
  }

  function isCurrentBackground(value) {
    if (value === null && backgroundImage === null) return true;
    if (value === backgroundImage) return true;
    return false;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-scale-in dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Background Settings
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Upload Section */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Custom Image
            </h3>
            <div className="flex gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm font-medium text-gray-600 transition-colors hover:border-primary-400 hover:bg-primary-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:border-primary-500 dark:hover:bg-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upload Image
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              JPG, PNG, or GIF. Max 5MB.
            </p>
          </div>

          {/* Gradient Presets */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Gradient Presets
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {PRESET_BACKGROUNDS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetSelect(preset.value)}
                  className={`group flex flex-col items-center gap-2`}
                >
                  <div
                    className={`h-16 w-full rounded-lg transition-all ${
                      isCurrentBackground(preset.value)
                        ? "ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-gray-800"
                        : "hover:scale-105"
                    }`}
                    style={{
                      background: preset.value || "#e5e7eb",
                    }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Current Background Preview */}
          {backgroundImage && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Background
                </h3>
                <button
                  onClick={removeBackground}
                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Remove
                </button>
              </div>
              <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
                <div
                  className="h-24 w-full"
                  style={{ background: backgroundImage }}
                />
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-medium text-white drop-shadow-lg">
                    Preview
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
