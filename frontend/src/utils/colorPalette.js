function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function generatePalette(hex) {
  const { h, s } = hexToHsl(hex);

  return {
    50: hslToHex(h, Math.min(s + 10, 100), 97),
    100: hslToHex(h, Math.min(s + 10, 100), 93),
    200: hslToHex(h, Math.min(s + 5, 100), 86),
    300: hslToHex(h, s, 74),
    400: hslToHex(h, s, 60),
    500: hslToHex(h, s, 50),
    600: hslToHex(h, s, 42),
    700: hslToHex(h, Math.max(s - 5, 0), 35),
    800: hslToHex(h, Math.max(s - 5, 0), 27),
    900: hslToHex(h, Math.max(s - 10, 0), 20),
    950: hslToHex(h, Math.max(s - 10, 0), 13),
  };
}

export function getContrastColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}
