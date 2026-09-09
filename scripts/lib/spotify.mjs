// Spotify entrega tokens de acceso que duran una hora, así que el workflow
// canjea el refresh token en cada corrida. El refresh token no vence salvo que
// se revoque el permiso desde la cuenta — que es exactamente lo que le pasó al
// servicio de terceros que veníamos usando.
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const RECENT_URL =
  "https://api.spotify.com/v1/me/player/recently-played?limit=";
const USER_URL = "https://api.spotify.com/v1/users/";

export function spotifyConfigured() {
  return Boolean(
    process.env.SPOTIFY_CLIENT_ID &&
      process.env.SPOTIFY_CLIENT_SECRET &&
      process.env.SPOTIFY_REFRESH_TOKEN,
  );
}

async function accessToken() {
  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
    }),
  });

  if (!res.ok) {
    throw new Error(`Spotify token ${res.status}: ${await res.text()}`);
  }
  return (await res.json()).access_token;
}

export async function recentlyPlayed(limit = 5) {
  const token = await accessToken();
  const res = await fetch(RECENT_URL + limit, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Spotify recently-played ${res.status}: ${await res.text()}`);
  }

  const { items = [] } = await res.json();
  const tracks = items.map(({ track, played_at }) => ({
    name: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    explicit: Boolean(track.explicit),
    playedAt: played_at,
    // Las imágenes vienen de mayor a menor; la más chica alcanza y de sobra
    // para un thumbnail de 36px, y pesa una fracción.
    artUrl: track.album?.images?.at(-1)?.url ?? null,
  }));

  return Promise.all(tracks.map(withArt));
}

// La tapa se embebe como data URI: el SVG vive en raw.githubusercontent y ahí
// no hay quien sirva las imágenes, así que tienen que viajar adentro.
async function withArt(track) {
  if (!track.artUrl) return track;
  try {
    const res = await fetch(track.artUrl);
    if (!res.ok) return track;
    const type = res.headers.get("content-type") || "image/jpeg";
    const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    return { ...track, art: `data:${type};base64,${b64}` };
  } catch {
    return track;
  }
}

// El header del card lleva avatar y nombre. El perfil publico alcanza, asi que
// no hace falta pedir scopes de cuenta ademas del de reproducciones.
export async function fetchProfile(userId) {
  try {
    const token = await accessToken();
    const res = await fetch(USER_URL + encodeURIComponent(userId), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = await res.json();
    const url = user.images?.at(-1)?.url ?? null;
    return {
      name: user.display_name || null,
      avatar: url ? await dataUri(url) : null,
    };
  } catch {
    return null;
  }
}

async function dataUri(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/jpeg";
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}
