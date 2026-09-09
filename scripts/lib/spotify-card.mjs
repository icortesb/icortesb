// Reconstrucción del card de JeffreyCA/spotify-recently-played-readme (MIT),
// tema `legacy` — el que su propio código describe como "the neutral charcoal
// the Vercel card used", que es el que servía la URL vieja del README.
// Métricas y ritmo tomados de src/render/card.ts del original.

const T = {
  bg: "#212121",
  border: "#2f2f2f",
  title: "#f0f0f0",
  artist: "#b0b0b0",
  meta: "#8a8a8a",
  accent: "#1db954",
  placeholder: "#2b2b2b",
  placeholderInk: "#585858",
  divider: "#2e2e2e",
};

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// Del original: fracciones de la altura de fuente para el stack de sistema.
const CAP_RATIO = 0.7031;
const DESC_RATIO = 0.2344;

const PAD_X = 16;
const SECTION_PAD = 12;
const TITLE_SIZE = 14;
const ARTIST_SIZE = 13;
const META_SIZE = 11.5;
const LINE_GAP = 19;
const ART_SIZE = Math.round(CAP_RATIO * TITLE_SIZE + LINE_GAP + DESC_RATIO * ARTIST_SIZE);
const ART_GAP = 12;
const ROW_H = ART_SIZE;
const TITLE_BASELINE_IN_ROW = ART_SIZE / 2 - (LINE_GAP - CAP_RATIO * TITLE_SIZE) / 2;
const HEADER_TITLE_SIZE = 16;
const USER_SIZE = 12.5;
const AVATAR_SIZE = 24;
const LOGO_GAP = 7;
const AVATAR_GAP = 5;
const WIDTH = 400;
const RADIUS = 10;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[c]);

// Anchos por carácter como fracción del tamaño de fuente. El original los mide
// con Canvas; acá alcanza una tabla para truncar y alinear a la derecha.
const NARROW = "iljtfrI.,:;'|!()[]{} ";
const WIDE = "MWmw@%";
function estimateWidth(text, size) {
  let units = 0;
  for (const ch of String(text)) {
    if (NARROW.includes(ch)) units += 0.31;
    else if (WIDE.includes(ch)) units += 0.87;
    else if (ch >= "A" && ch <= "Z") units += 0.68;
    else if (ch >= "0" && ch <= "9") units += 0.56;
    else units += 0.53;
  }
  return units * size;
}

function truncate(text, size, maxWidth) {
  if (estimateWidth(text, size) <= maxWidth) return text;
  let out = String(text);
  while (out.length > 1 && estimateWidth(out + "…", size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return out.trimEnd() + "…";
}

const round = (n) => Math.round(n * 100) / 100;

function text(content, x, baseline, { size, fill, anchor = "start", weight }) {
  return (
    `<text x="${round(x)}" y="${round(baseline)}" font-family="${FONT}" font-size="${size}"` +
    (weight ? ` font-weight="${weight}"` : "") +
    (anchor === "end" ? ` text-anchor="end"` : "") +
    ` fill="${fill}">${esc(content)}</text>`
  );
}

const rule = (y) =>
  `<rect x="0" y="${round(y)}" width="${WIDTH}" height="1" fill="${T.divider}"/>`;

// Centra una línea de una sola fila sobre su punto medio.
const centredBaseline = (midY, size) =>
  midY + (CAP_RATIO * size) / 2 - (DESC_RATIO * size) / 2;

const SPOTIFY_LOGO =
  "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z";

function artTile(dataUri, x, y, index) {
  if (!dataUri) {
    return (
      `<rect x="${x}" y="${round(y)}" width="${ART_SIZE}" height="${ART_SIZE}" rx="4" fill="${T.placeholder}"/>` +
      `<circle cx="${x + ART_SIZE / 2}" cy="${round(y + ART_SIZE / 2)}" r="4.5" fill="none" stroke="${T.placeholderInk}" stroke-width="1.5"/>`
    );
  }
  const id = `art${index}`;
  return (
    `<clipPath id="${id}"><rect x="${x}" y="${round(y)}" width="${ART_SIZE}" height="${ART_SIZE}" rx="4"/></clipPath>` +
    `<image x="${x}" y="${round(y)}" width="${ART_SIZE}" height="${ART_SIZE}" href="${dataUri}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>`
  );
}

const MINUTE = 60, HOUR = 60 * MINUTE, DAY = 24 * HOUR, WEEK = 7 * DAY;
const MONTH = 2629800, YEAR = 12 * MONTH;

function relativeTime(playedAt, now) {
  const secs = Math.max(0, (now - new Date(playedAt).getTime()) / 1000);
  const pick = (n, unit) => `${Math.floor(n)} ${unit}${Math.floor(n) === 1 ? "" : "s"} ago`;
  if (secs < MINUTE) return "Just now";
  if (secs < HOUR) return pick(secs / MINUTE, "minute");
  if (secs < DAY) return pick(secs / HOUR, "hour");
  if (secs < WEEK) return pick(secs / DAY, "day");
  if (secs < MONTH) return pick(secs / WEEK, "week");
  if (secs < YEAR) return pick(secs / MONTH, "month");
  return pick(secs / YEAR, "year");
}

export function spotifyCard(tracks, profile = null, now = Date.now()) {
  const body = [];
  let y = SECTION_PAD;

  // ── Header: logo + título a la izquierda, avatar + nombre a la derecha ──
  const headerH = AVATAR_SIZE;
  const headerMid = y + headerH / 2;
  const titleBaseline = centredBaseline(headerMid, HEADER_TITLE_SIZE);
  const logoH = CAP_RATIO * HEADER_TITLE_SIZE;

  body.push(
    `<g transform="translate(${PAD_X} ${round(titleBaseline - logoH)}) scale(${round(logoH / 24)})">` +
      `<path d="${SPOTIFY_LOGO}" fill="${T.accent}"/></g>`,
    text("Recently played", PAD_X + logoH + LOGO_GAP, titleBaseline, {
      size: HEADER_TITLE_SIZE,
      fill: T.title,
      weight: "600",
    }),
  );

  if (profile?.name) {
    const nameBaseline = centredBaseline(headerMid, USER_SIZE);
    body.push(
      text(profile.name, WIDTH - PAD_X, nameBaseline, {
        size: USER_SIZE,
        fill: T.meta,
        anchor: "end",
      }),
    );
    if (profile.avatar) {
      const nameW = estimateWidth(profile.name, USER_SIZE);
      const ax = WIDTH - PAD_X - nameW - AVATAR_GAP - AVATAR_SIZE;
      body.push(
        `<clipPath id="av"><circle cx="${round(ax + AVATAR_SIZE / 2)}" cy="${round(headerMid)}" r="${AVATAR_SIZE / 2}"/></clipPath>` +
          `<image x="${round(ax)}" y="${round(y)}" width="${AVATAR_SIZE}" height="${AVATAR_SIZE}" href="${profile.avatar}" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/>`,
      );
    }
  }

  y += headerH + SECTION_PAD;
  if (tracks.length > 0) body.push(rule(y));
  y += SECTION_PAD;

  // ── Filas ──────────────────────────────────────────────────────────────
  const textX = PAD_X + ART_SIZE + ART_GAP;

  tracks.forEach((track, i) => {
    const top = y;
    const midY = top + ROW_H / 2;
    const tBaseline = top + TITLE_BASELINE_IN_ROW;
    const aBaseline = tBaseline + LINE_GAP;

    body.push(artTile(track.art ?? null, PAD_X, top, i));

    const when = track.playedAt ? relativeTime(track.playedAt, now) : "";
    const metaW = when ? estimateWidth(when, META_SIZE) : 0;
    if (when) {
      body.push(
        text(when, WIDTH - PAD_X, centredBaseline(midY, META_SIZE), {
          size: META_SIZE,
          fill: T.meta,
          anchor: "end",
        }),
      );
    }

    const avail = WIDTH - PAD_X - textX - (metaW ? metaW + 12 : 0);
    body.push(
      text(truncate(track.name, TITLE_SIZE, avail), textX, tBaseline, {
        size: TITLE_SIZE,
        fill: T.title,
      }),
      text(truncate(track.artist, ARTIST_SIZE, avail), textX, aBaseline, {
        size: ARTIST_SIZE,
        fill: T.artist,
      }),
    );

    y += ROW_H;
    if (i < tracks.length - 1) {
      y += SECTION_PAD;
      body.push(rule(y));
      y += SECTION_PAD;
    }
  });

  y += SECTION_PAD;
  const height = round(y);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="Recently played on Spotify">
  <title>Recently played on Spotify</title>
  <rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${height - 1}" rx="${RADIUS}" fill="${T.bg}" stroke="${T.border}"/>
${body.join("\n")}
</svg>
`;
}
