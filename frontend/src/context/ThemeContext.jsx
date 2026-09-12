import { createContext, useContext, useState, useEffect } from "react";
import { generatePalette } from "../utils/colorPalette";

const ThemeContext = createContext();

const PRESET_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Green", value: "#22c55e" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Indigo", value: "#6366f1" },
];

function applyColorPalette(hex) {
  const palette = generatePalette(hex);
  const root = document.documentElement;
  Object.entries(palette).forEach(([key, value]) => {
    root.style.setProperty(`--color-primary-${key}`, value);
  });
}

function removeColorPalette() {
  const root = document.documentElement;
  for (let i = 50; i <= 950; i += 50) {
    root.style.removeProperty(`--color-primary-${i}`);
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const [primaryColor, setPrimaryColorState] = useState(() => {
    return localStorage.getItem("primaryColor") || null;
  });

  const [useCustomColor, setUseCustomColor] = useState(() => {
    return localStorage.getItem("useCustomColor") === "true";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (useCustomColor && primaryColor) {
      applyColorPalette(primaryColor);
    } else {
      removeColorPalette();
    }
    localStorage.setItem("useCustomColor", useCustomColor.toString());
  }, [useCustomColor, primaryColor]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function setPrimaryColor(color) {
    setPrimaryColorState(color);
    localStorage.setItem("primaryColor", color);
  }

  function enableCustomColor(color) {
    setPrimaryColorState(color);
    setUseCustomColor(true);
  }

  function disableCustomColor() {
    setUseCustomColor(false);
    removeColorPalette();
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        primaryColor,
        setPrimaryColor,
        useCustomColor,
        enableCustomColor,
        disableCustomColor,
        presetColors: PRESET_COLORS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
