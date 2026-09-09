const API = "https://api.github.com";

const token = process.env.CARDS_TOKEN || process.env.GITHUB_TOKEN;
if (!token) throw new Error("Falta CARDS_TOKEN o GITHUB_TOKEN");

const headers = {
  Authorization: `bearer ${token}`,
  "User-Agent": "icortesb-profile-cards",
  Accept: "application/vnd.github+json",
};

async function graphql(query, variables) {
  const res = await fetch(`${API}/graphql`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL: ${JSON.stringify(json.errors)}`);
  return json.data;
}

const USER_QUERY = `
query($login: String!, $after: String) {
  user(login: $login) {
    name
    login
    followers { totalCount }
    contributionsCollection {
      totalCommitContributions
      restrictedContributionsCount
    }
    pullRequests { totalCount }
    issues { totalCount }
    repositoriesContributedTo(
      contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]
    ) { totalCount }
    contributed: repositoriesContributedTo(
      first: 100
      contributionTypes: [COMMIT, PULL_REQUEST, REPOSITORY]
      includeUserRepositories: false
    ) {
      nodes {
        isFork
        languages(first: 12, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
    repositories(
      first: 100
      after: $after
      ownerAffiliations: OWNER
      isFork: false
    ) {
      pageInfo { hasNextPage endCursor }
      nodes {
        name
        stargazerCount
        languages(first: 12, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

// Commits across every year, not just the trailing twelve months — this is
// what `include_all_commits=true` bought on the old card. The search index
// only covers public commits, so a failure here falls back to the yearly
// contribution count rather than reporting zero.
async function allTimeCommits(login) {
  try {
    const res = await fetch(
      `${API}/search/commits?q=author:${login}&per_page=1`,
      { headers },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return typeof json.total_count === "number" ? json.total_count : null;
  } catch {
    return null;
  }
}

export async function fetchStats(login) {
  let after = null;
  let user = null;
  const repos = [];

  do {
    const data = await graphql(USER_QUERY, { login, after });
    user = data.user;
    repos.push(...user.repositories.nodes);
    after = user.repositories.pageInfo.hasNextPage
      ? user.repositories.pageInfo.endCursor
      : null;
  } while (after);

  const c = user.contributionsCollection;
  const yearCommits = c.totalCommitContributions + c.restrictedContributionsCount;
  const searched = await allTimeCommits(login);

  // Los lenguajes salen de todo lo que efectivamente tocó: los repos propios
  // más aquellos donde contribuyó sin ser dueño. Sin esto el laburo en la
  // organización —que es la mayor parte del PHP— quedaba invisible. Los forks
  // se descartan: el lenguaje es de quien lo escribió, no de quien clonó.
  const languages = new Map();
  const counted = [...repos, ...user.contributed.nodes.filter((r) => !r.isFork)];

  for (const repo of counted) {
    for (const { size, node } of repo.languages.edges) {
      const prev = languages.get(node.name);
      languages.set(node.name, {
        name: node.name,
        color: node.color || "#858585",
        size: (prev?.size ?? 0) + size,
      });
    }
  }

  return {
    name: user.name || user.login,
    login: user.login,
    followers: user.followers.totalCount,
    commits: Math.max(searched ?? 0, yearCommits),
    prs: user.pullRequests.totalCount,
    issues: user.issues.totalCount,
    contributedTo: user.repositoriesContributedTo.totalCount,
    // Solo repos propios: las estrellas de un repo ajeno no son tuyas.
    stars: repos.reduce((n, r) => n + r.stargazerCount, 0),
    languages: [...languages.values()].sort((a, b) => b.size - a.size),
  };
}

// github-readme-stats' own ranking, kept so the badge means the same thing it
// did before. Weighted CDFs over the medians of an average active account.
export function rank({ commits, prs, issues, stars, followers }) {
  const expCdf = (x) => 1 - 2 ** -x;
  const logCdf = (x) => x / (1 + x);

  const W = { commits: 2, prs: 3, issues: 1, stars: 4, followers: 1 };
  const total = Object.values(W).reduce((a, b) => a + b, 0);

  const score =
    1 -
    (W.commits * expCdf(commits / 250) +
      W.prs * expCdf(prs / 50) +
      W.issues * expCdf(issues / 25) +
      W.stars * logCdf(stars / 50) +
      W.followers * logCdf(followers / 10)) /
      total;

  const levels = ["S", "A+", "A", "A-", "B+", "B", "B-", "C+", "C"];
  const thresholds = [1, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
  const pct = score * 100;
  return {
    level: levels[thresholds.findIndex((t) => pct <= t)] ?? "C",
    percentile: pct,
  };
}
