import { mkdir, writeFile } from "node:fs/promises";
import { fetchStats, rank } from "./lib/github.mjs";
import { statsCard, langsCard } from "./lib/cards.mjs";
import { spotifyCard } from "./lib/spotify-card.mjs";
import {
  spotifyConfigured,
  recentlyPlayed,
  fetchProfile,
} from "./lib/spotify.mjs";

const LOGIN = process.env.CARDS_LOGIN || "icortesb";
const OUT = new URL("../dist/", import.meta.url);

const write = async (name, svg) => {
  await writeFile(new URL(name, OUT), svg);
  console.log(`  ✓ ${name} (${svg.length} bytes)`);
};

await mkdir(OUT, { recursive: true });

console.log(`GitHub (${LOGIN}):`);
const stats = await fetchStats(LOGIN);
const ranking = rank(stats);
console.log(
  `  ${stats.commits} commits · ${stats.prs} PRs · ${stats.issues} issues · ` +
    `${stats.stars} stars · rank ${ranking.level}`,
);
await write("stats.svg", statsCard(stats, ranking));
await write("top-langs.svg", langsCard(stats.languages));

// Spotify es opcional: sin credenciales el resto de las cards igual se
// publican, en vez de tumbar la corrida entera por una card.
if (!spotifyConfigured()) {
  console.log("Spotify: sin credenciales, se omite la card");
} else {
  console.log("Spotify:");
  try {
    const [tracks, profile] = await Promise.all([
      recentlyPlayed(5),
      fetchProfile(process.env.SPOTIFY_USER_ID || "11155934945"),
    ]);
    if (tracks.length === 0) {
      console.log("  sin reproducciones recientes, se omite la card");
    } else {
      console.log(`  ${tracks.length} tracks · perfil: ${profile?.name ?? "n/d"}`);
      await write("spotify.svg", spotifyCard(tracks, profile));
    }
  } catch (err) {
    console.error(`  ✗ ${err.message}`);
    process.exitCode = 1;
  }
}
