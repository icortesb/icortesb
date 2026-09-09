// Spotify entrega tokens de acceso que duran una hora, así que el workflow
// canjea el refresh token en cada corrida. El refresh token no vence salvo que
// se revoque el permiso desde la cuenta — que es exactamente lo que le pasó al
// servicio de terceros que veníamos usando.
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const RECENT_URL =
  "https://api.spotify.com/v1/me/player/recently-played?limit=";

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
  return items.map(({ track }) => ({
    name: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
  }));
}
