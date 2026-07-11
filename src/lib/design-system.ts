/**
 * Design System Utilities for Leads Desk
 *
 * Pure color/math utilities for theme generation, manipulation,
 * and design-system constants. No React or DOM dependencies.
 */

// ============================================================
// EASING_CURVES
// ============================================================

export const EASING_CURVES = {
  easeOutExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeOutQuart: 'cubic-bezier(0.25, 1, 0.5, 1)',
  easeOutBack: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  easeInOutSmooth: 'cubic-bezier(0.65, 0, 0.35, 1)',
  easeApple: 'cubic-bezier(0.32, 0.72, 0, 1.02)',
} as const;

// ============================================================
// SPACING_SCALE
// ============================================================

export const SPACING_SCALE = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96] as const;

// ============================================================
// BORDER_RADIUS_SCALE
// ============================================================

export const BORDER_RADIUS_SCALE = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const;

// ============================================================
// Private Helpers
// ============================================================

/**
 * Parse a hex color string into its RGB components.
 * Returns {r:0, g:0, b:0} for invalid input.
 */
function parseHexRgb(hex: string): { r: number; g: number; b: number } {
  let sanitized = hex.replace('#', '');
  if (sanitized.length === 3) {
    sanitized = sanitized
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(sanitized)) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(sanitized.substring(0, 2), 16),
    g: parseInt(sanitized.substring(2, 4), 16),
    b: parseInt(sanitized.substring(4, 6), 16),
  };
}

function toLinearChannel(value: number) {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(hex: string) {
  const { r, g, b } = parseHexRgb(hex);
  return (
    0.2126 * toLinearChannel(r) +
    0.7152 * toLinearChannel(g) +
    0.0722 * toLinearChannel(b)
  );
}

export function getContrastRatio(firstColor: string, secondColor: string) {
  const first = getRelativeLuminance(firstColor);
  const second = getRelativeLuminance(secondColor);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Convert hex color to HSL object.
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = parseHexRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      case bn:
        h = ((rn - gn) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL values to a hex color string.
 */
function hslToHex(h: number, s: number, l: number): string {
  const hue = h / 360;
  const sat = s / 100;
  const light = l / 100;

  let r: number;
  let g: number;
  let b: number;

  if (sat === 0) {
    r = g = b = light;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
    const p = 2 * light - q;
    r = hue2rgb(p, q, hue + 1 / 3);
    g = hue2rgb(p, q, hue);
    b = hue2rgb(p, q, hue - 1 / 3);
  }

  const toHex = (x: number): string => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ============================================================
// Exported Utilities
// ============================================================

/**
 * Generate a harmonious color palette from a base color.
 *
 * @param baseColor - Hex color string (e.g. "#3b82f6")
 * @param type - Harmony type: monochromatic, analogous, complementary, triadic
 * @returns Array of hex color strings
 */
export function generateColorHarmony(
  baseColor: string,
  type: 'monochromatic' | 'analogous' | 'complementary' | 'triadic'
): string[] {
  const { h, s, l } = hexToHsl(baseColor);
  const colors: string[] = [];

  switch (type) {
    case 'monochromatic':
      colors.push(hslToHex(h, s, Math.max(0, l - 30)));
      colors.push(hslToHex(h, s, Math.max(0, l - 15)));
      colors.push(hslToHex(h, s, l));
      colors.push(hslToHex(h, Math.max(0, s - 20), Math.min(100, l + 15)));
      colors.push(hslToHex(h, Math.max(0, s - 40), Math.min(100, l + 30)));
      break;
    case 'analogous':
      colors.push(hslToHex((h - 30 + 360) % 360, s, l));
      colors.push(hslToHex((h - 15 + 360) % 360, s, l));
      colors.push(hslToHex(h, s, l));
      colors.push(hslToHex((h + 15) % 360, s, l));
      colors.push(hslToHex((h + 30) % 360, s, l));
      break;
    case 'complementary':
      colors.push(hslToHex(h, s, l));
      colors.push(hslToHex((h + 180) % 360, s, l));
      colors.push(hslToHex((h + 180) % 360, Math.max(0, s - 20), Math.min(100, l + 10)));
      colors.push(hslToHex(h, Math.max(0, s - 20), Math.min(100, l + 10)));
      break;
    case 'triadic':
      colors.push(hslToHex(h, s, l));
      colors.push(hslToHex((h + 120) % 360, s, l));
      colors.push(hslToHex((h + 240) % 360, s, l));
      break;
    default:
      colors.push(baseColor);
  }

  return colors;
}

/**
 * Adjust a color's lightness, saturation, or alpha.
 *
 * @param color - Hex color string
 * @param options - Adjustment options
 * @returns Hex color string, or rgba string if alpha is specified
 */
export function adjustColor(
  color: string,
  options: {
    lighten?: number;
    darken?: number;
    saturate?: number;
    desaturate?: number;
    alpha?: number;
  }
): string {
  const { h, s, l } = hexToHsl(color);

  let newL = l;
  if (options.lighten !== undefined) {
    newL = Math.min(100, l + options.lighten);
  }
  if (options.darken !== undefined) {
    newL = Math.max(0, l - options.darken);
  }

  let newS = s;
  if (options.saturate !== undefined) {
    newS = Math.min(100, s + options.saturate);
  }
  if (options.desaturate !== undefined) {
    newS = Math.max(0, s - options.desaturate);
  }

  const hex = hslToHex(h, newS, newL);

  if (options.alpha !== undefined && options.alpha < 1) {
    const { r, g, b } = parseHexRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${options.alpha})`;
  }

  return hex;
}

/**
 * Determine the best contrasting text color for a given background.
 *
 * @param backgroundColor - Hex color string
 * @returns "#000000" or "#ffffff"
 */
export function getContrastColor(backgroundColor: string): '#000000' | '#ffffff' {
  return getContrastRatio(backgroundColor, '#ffffff') >=
    getContrastRatio(backgroundColor, '#000000')
    ? '#ffffff'
    : '#000000';
}

/**
 * Generate glass-compatible rgba colors from a solid base color.
 *
 * @param baseColor - Hex color string
 * @returns Object with surface, surfaceStrong, card, and cardBorder rgba values
 */
export function generateGlassColors(
  baseColor: string
): {
  surface: string;
  surfaceStrong: string;
  card: string;
  cardBorder: string;
} {
  const { r, g, b } = parseHexRgb(baseColor);

  return {
    surface: `rgba(${r}, ${g}, ${b}, 0.05)`,
    surfaceStrong: `rgba(${r}, ${g}, ${b}, 0.08)`,
    card: `rgba(${r}, ${g}, ${b}, 0.04)`,
    cardBorder: `rgba(${r}, ${g}, ${b}, 0.08)`,
  };
}

/**
 * Generate a complete theme palette from primary and accent colors.
 *
 * @param primary - Primary hex color
 * @param accent - Accent hex color
 * @returns Full theme palette object
 */
export function createThemePalette(
  primary: string,
  accent: string
): {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  background: string;
  surface: string;
  text: string;
} {
  return {
    primary,
    primaryLight: adjustColor(primary, { lighten: 15 }),
    primaryDark: adjustColor(primary, { darken: 15 }),
    accent,
    accentLight: adjustColor(accent, { lighten: 15 }),
    accentDark: adjustColor(accent, { darken: 15 }),
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    background: '#0a0a0f',
    surface: '#12121a',
    text: getContrastColor(primary) === '#000000' ? '#0a0a0f' : '#ffffff',
  };
}
