// Se corre UNA vez, a mano, para sacar el refresh token que después vive como
// secret del repo:
//
//   1. https://developer.spotify.com/dashboard → Create app
//      Redirect URI: http://127.0.0.1:8888/callback   (Spotify ya no acepta
//      "localhost" en apps nuevas, tiene que ser la IP)
//   2. SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... node scripts/spotify-auth.mjs
//   3. Se abre el navegador, aceptás, y la terminal imprime el refresh token.
//
// El refresh token no vence: solo se corta si revocás el permiso desde
// https://spotify.com/account/apps — que es lo que pasó con el servicio de
// terceros que usaba el README antes.
import { createServer } from "node:http";
import { spawn } from "node:child_process";

const PORT = 8888;
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;
const SCOPE = "user-read-recently-played";

const id = process.env.SPOTIFY_CLIENT_ID;
const secret = process.env.SPOTIFY_CLIENT_SECRET;

if (!id || !secret) {
  console.error("Faltan SPOTIFY_CLIENT_ID y/o SPOTIFY_CLIENT_SECRET.");
  process.exit(1);
}

const state = Math.random().toString(36).slice(2);
const authUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({
    response_type: "code",
    client_id: id,
    scope: SCOPE,
    redirect_uri: REDIRECT,
    state,
  });

async function exchange(code) {
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT,
    }),
  });
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`);
  return res.json();
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }

  const err = url.searchParams.get("error");
  if (err || url.searchParams.get("state") !== state) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(err ? `Spotify devolvió: ${err}` : "state no coincide");
    console.error(err ? `\n✗ ${err}` : "\n✗ state no coincide");
    server.close();
    process.exitCode = 1;
    return;
  }

  try {
    const tokens = await exchange(url.searchParams.get("code"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h2>Listo. Volvé a la terminal.</h2>");

    console.log("\n✓ Refresh token:\n");
    console.log(tokens.refresh_token);
    console.log("\nCargalo como secret del repo:\n");
    console.log(`  gh secret set SPOTIFY_CLIENT_ID     --body '${id}'`);
    console.log(`  gh secret set SPOTIFY_CLIENT_SECRET --body '${secret}'`);
    console.log(`  gh secret set SPOTIFY_REFRESH_TOKEN --body '${tokens.refresh_token}'\n`);
  } catch (e) {
    res.writeHead(500).end(String(e.message));
    console.error(`\n✗ ${e.message}`);
    process.exitCode = 1;
  }
  server.close();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Abriendo el navegador para autorizar…\n${authUrl}\n`);
  spawn("xdg-open", [authUrl], { stdio: "ignore", detached: true }).unref();
});
