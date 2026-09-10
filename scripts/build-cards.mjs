import { mkdir, writeFile } from "node:fs/promises";
import { fetchStats, rank } from "./lib/github.mjs";
import { statsCard, langsCard } from "./lib/cards.mjs";

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
