import { theme, FONT, esc, clip, card } from "./theme.mjs";

const ICONS = {
  star: "M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z",
  commit: "M10.5 7.75a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm1.43.75a4.002 4.002 0 01-7.86 0H.75a.75.75 0 110-1.5h3.32a4.001 4.001 0 017.86 0h3.32a.75.75 0 110 1.5h-3.32z",
  pr: "M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z",
  issue: "M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z",
  repo: "M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8z",
  people: "M5.5 3.5a2 2 0 100 4 2 2 0 000-4zM2 5.5a3.5 3.5 0 115.898 2.549 5.508 5.508 0 013.034 4.084.75.75 0 11-1.482.235 4.001 4.001 0 00-7.9 0 .75.75 0 01-1.482-.236A5.507 5.507 0 013.102 8.05 3.49 3.49 0 012 5.5z",
};

const nf = new Intl.NumberFormat("en-US");

// Stats y lenguajes comparten alto para alinear en la misma fila del README.
export const CARD_HEIGHT = 220;

export function statsCard(stats, ranking) {
  const rows = [
    ["star", "Total Stars Earned", stats.stars],
    ["commit", "Total Commits", stats.commits],
    ["pr", "Total PRs", stats.prs],
    ["issue", "Total Issues", stats.issues],
    ["repo", "Contributed to", stats.contributedTo],
    ["people", "Followers", stats.followers],
  ];

  const lines = rows
    .map(([icon, label, value], i) => {
      const y = 62 + i * 25;
      return `  <g transform="translate(25 ${y})">
    <svg x="0" y="-12" width="16" height="16" viewBox="0 0 16 16" fill="${theme.icon}"><path d="${ICONS[icon]}"/></svg>
    <text x="27" y="0" font-family="${FONT}" font-size="14" fill="${theme.text}">${label}:</text>
    <text x="220" y="0" font-family="${FONT}" font-size="14" font-weight="700" fill="${theme.text}">${nf.format(value)}</text>
  </g>`;
    })
    .join("\n");

  // The ring fills counter-clockwise from the top: a better rank leaves less
  // of the circle empty. `percentile` runs 0 (best) to 100 (worst).
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const filled = circumference * (1 - ranking.percentile / 100);

  const badge = `  <g transform="translate(370 110)">
    <circle r="${r}" fill="none" stroke="${theme.border}" stroke-width="6"/>
    <circle r="${r}" fill="none" stroke="${theme.title}" stroke-width="6"
      stroke-linecap="round" transform="rotate(-90)"
      stroke-dasharray="${circumference.toFixed(2)}"
      stroke-dashoffset="${(circumference - filled).toFixed(2)}"/>
    <text y="7" text-anchor="middle" font-family="${FONT}" font-size="24" font-weight="700" fill="${theme.title}">${ranking.level}</text>
  </g>`;

  return card({
    width: 467,
    height: CARD_HEIGHT,
    title: `${stats.name}'s GitHub Stats`,
    body: `${lines}\n${badge}`,
  });
}

export function langsCard(languages, count = 6) {
  const top = languages.slice(0, count);
  const total = top.reduce((n, l) => n + l.size, 0) || 1;

  const width = 340;
  const barX = 25;
  const barW = width - 50;

  let offset = 0;
  const bar = top
    .map((l) => {
      const w = (l.size / total) * barW;
      const seg = `    <rect x="${(barX + offset).toFixed(2)}" y="0" width="${w.toFixed(2)}" height="8" fill="${l.color}"/>`;
      offset += w;
      return seg;
    })
    .join("\n");

  // Dos columnas, así seis lenguajes entran en tres filas en vez de seis.
  const legend = top
    .map((l, i) => {
      const col = i % 2;
      const row = (i / 2) | 0;
      const x = barX + col * (barW / 2);
      const y = 98 + row * 30;
      const pct = ((l.size / total) * 100).toFixed(1);
      return `  <g transform="translate(${x.toFixed(2)} ${y})">
    <circle cx="5" cy="-4" r="5" fill="${l.color}"/>
    <text x="17" y="0" font-family="${FONT}" font-size="12.5" fill="${theme.text}">${esc(clip(l.name, 12))} ${pct}%</text>
  </g>`;
    })
    .join("\n");

  return card({
    width,
    // Misma altura que la card de stats: puestas una al lado de la otra en el
    // README, el navegador las escala igual y quedan alineadas.
    height: CARD_HEIGHT,
    title: "Most Used Languages",
    body: `  <g transform="translate(0 62)">
    <clipPath id="barclip"><rect x="${barX}" y="0" width="${barW}" height="8" rx="4"/></clipPath>
    <g clip-path="url(#barclip)">
${bar}
    </g>
  </g>
${legend}`,
  });
}

export function spotifyCard(tracks) {
  const rowH = 26;

  // Un solo <text> con dos <tspan>: el artista fluye después del track en vez
  // de posicionarse por separado, que es lo que hacía que se pisaran.
  const rows = tracks
    .map((t, i) => {
      const y = 62 + i * rowH;
      return `  <g transform="translate(25 ${y})">
    <rect x="0" y="-10" width="3" height="13" rx="1.5" fill="${theme.green}"/>
    <text x="15" y="0" font-family="${FONT}" font-size="12.5">
      <tspan fill="${theme.text}">${esc(clip(t.name, 32))}</tspan><tspan fill="${theme.muted}"> · ${esc(clip(t.artist, 24))}</tspan>
    </text>
  </g>`;
    })
    .join("\n");

  return card({
    width: 400,
    height: 62 + tracks.length * rowH + 12,
    title: "Recently played",
    body: rows,
  });
}
