// Nord — la misma paleta que corre en el desktop (kitty/color.ini y
// hyprpanel/config.base.json). Las cards del perfil y la máquina se ven igual.
export const theme = {
  bg: "#2e3440",      // nord0  Polar Night
  border: "#3b4252",  // nord1
  surface: "#434c5e", // nord2
  muted: "#616e88",   // nord3 aclarado: nord3 puro queda en 1.9:1 sobre nord0
  text: "#d8dee9",    // nord4  Snow Storm
  title: "#88c0d0",   // nord8  el acento Frost dominante en la config
  icon: "#8fbcbb",    // nord7
  blue: "#81a1c1",    // nord9
  green: "#a3be8c",   // nord14
};

export const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Ubuntu, Sans-Serif";

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[c]);

// Cut a label to fit its column. SVG has no ellipsis, so we add our own.
export const clip = (s, max) =>
  s.length <= max ? s : s.slice(0, Math.max(0, max - 1)).trimEnd() + "…";

export const card = ({ width, height, title, body }) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-label="${esc(title)}">
  <title>${esc(title)}</title>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="${theme.bg}" stroke="${theme.border}"/>
  <text x="25" y="33" font-family="${FONT}" font-size="18" font-weight="600" fill="${theme.title}">${esc(title)}</text>
${body}
</svg>
`;
