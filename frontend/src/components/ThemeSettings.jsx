import { useState } from "react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeSettings({ onClose }) {
  const {
    theme,
    toggleTheme,
    primaryColor,
    useCustomColor,
    enableCustomColor,
    disableCustomColor,
    presetColors,
  } = useTheme();

  const [customColor, setCustomColor] = useState(primaryColor || "#3b82f6");

  function handlePresetSelect(color) {
    setCustomColor(color);
    enableCustomColor(color);
  }

  function handleCustomColorChange(e) {
    const color = e.target.value;
    setCustomColor(color);
    enableCustomColor(color);
  }

  function handleDisable() {
    disableCustomColor();
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
            Theme Settings
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
          {/* Theme Mode */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Appearance
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => theme !== "light" && toggleTheme()}
                className={`flex-1 rounded-lg border-2 p-4 text-center transition-all ${
                  theme === "light"
                    ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/30"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500"
                }`}
              >
                <svg className="mx-auto mb-2 h-8 w-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Light</span>
              </button>
              <button
                onClick={() => theme !== "dark" && toggleTheme()}
                className={`flex-1 rounded-lg border-2 p-4 text-center transition-all ${
                  theme === "dark"
                    ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/30"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500"
                }`}
              >
                <svg className="mx-auto mb-2 h-8 w-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Dark</span>
              </button>
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Primary Color
              </h3>
              {useCustomColor && (
                <button
                  onClick={handleDisable}
                  className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  Reset to default
                </button>
              )}
            </div>

            {/* Preset Colors */}
            <div className="mb-4 grid grid-cols-5 gap-3">
              {presetColors.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetSelect(preset.value)}
                  className={`group flex flex-col items-center gap-1.5`}
                  title={preset.name}
                >
                  <div
                    className={`h-10 w-10 rounded-full transition-transform hover:scale-110 ${
                      customColor === preset.value && useCustomColor
                        ? "ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-gray-800"
                        : ""
                    }`}
                    style={{ backgroundColor: preset.value }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Color Picker */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 dark:text-gray-400">
                Custom:
              </label>
              <div className="relative">
                <input
                  type="color"
                  value={customColor}
                  onChange={handleCustomColorChange}
                  className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                />
              </div>
              <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                {customColor.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Preview */}
          {useCustomColor && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                Preview
              </h3>
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-600">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg"
                    style={{ backgroundColor: customColor }}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Sample Note Card
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      This is how your primary color will look
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: customColor }}
                  >
                    Primary Button
                  </button>
                  <button
                    className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                    style={{ borderColor: customColor, color: customColor }}
                  >
                    Outline Button
                  </button>
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
