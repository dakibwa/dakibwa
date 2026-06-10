// One-off retheme: rotate the Vitals dashboard's teal-green hue family to the
// madder red-ochre of William Blake's Albion Rose, preserving each colour's
// saturation and lightness so the existing tonal hierarchy survives intact.
// Only declarations inside .vitals-* selectors are touched.
import { readFile, writeFile } from "node:fs/promises";
import postcss from "postcss";

const CSS_PATH = new URL("../app/globals.css", import.meta.url).pathname;
const GREEN_HUE_MIN = 100;
const GREEN_HUE_MAX = 185;
const TARGET_HUE = 14;

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
  h /= 360;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)].map((v) =>
    Math.round(v * 255)
  );
}

function remap(r, g, b) {
  const [h, s, l] = rgbToHsl(r, g, b);
  if (s < 0.05 || h < GREEN_HUE_MIN || h > GREEN_HUE_MAX) return null;
  return hslToRgb(TARGET_HUE, s, l);
}

let replaced = 0;

function transformValue(value) {
  return value
    .replace(/#([0-9a-fA-F]{6})\b/g, (match, hex) => {
      const next = remap(parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16));
      if (!next) return match;
      replaced += 1;
      return `#${next.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    })
    .replace(/rgba?\((\s*\d+)\s*,(\s*\d+)\s*,(\s*\d+)\s*(,[^)]*)?\)/g, (match, r, g, b, alpha) => {
      const next = remap(Number(r), Number(g), Number(b));
      if (!next) return match;
      replaced += 1;
      return alpha
        ? `rgba(${next[0]}, ${next[1]}, ${next[2]}${alpha.trim().startsWith(",") ? alpha : `, ${alpha}`})`
        : `rgb(${next[0]}, ${next[1]}, ${next[2]})`;
    });
}

const css = await readFile(CSS_PATH, "utf8");
const root = postcss.parse(css);

root.walkRules((rule) => {
  if (!/\.vitals|is-vitals/.test(rule.selector)) return;
  rule.walkDecls((decl) => {
    const next = transformValue(decl.value);
    if (next !== decl.value) decl.value = next;
  });
});

await writeFile(CSS_PATH, root.toString());
console.log(`Remapped ${replaced} colour values.`);
