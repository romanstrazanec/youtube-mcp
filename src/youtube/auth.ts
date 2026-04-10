import { OAuth2Client } from "google-auth-library";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { createServer } from "http";
import { URL } from "url";
import { randomBytes } from "crypto";
import path from "path";

const TOKEN_PATH = path.join(
  process.env.YOUTUBE_MCP_DATA_DIR || path.join(process.env.HOME || "~", ".youtube-mcp"),
  "token.json"
);

const SCOPES = ["https://www.googleapis.com/auth/youtube.readonly"];

interface Credentials {
  installed?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
  web?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

interface TokenPayload {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export async function getAuthenticatedClient(credentialsPath: string): Promise<OAuth2Client> {
  const content = await readFile(credentialsPath, "utf-8");
  const credentials: Credentials = JSON.parse(content);
  const { client_id, client_secret, redirect_uris } =
    credentials.installed || credentials.web || (() => { throw new Error("Invalid credentials.json format"); })();

  const oauth2Client = new OAuth2Client(client_id, client_secret, redirect_uris[0]);

  if (existsSync(TOKEN_PATH)) {
    const token = JSON.parse(await readFile(TOKEN_PATH, "utf-8")) as TokenPayload;
    oauth2Client.setCredentials(token);
    return oauth2Client;
  }

  throw new Error(
    "Not authenticated. Run `npm run auth` to authenticate with YouTube first."
  );
}

export async function authenticate(credentialsPath: string): Promise<void> {
  const content = await readFile(credentialsPath, "utf-8");
  const credentials: Credentials = JSON.parse(content);
  const { client_id, client_secret } =
    credentials.installed || credentials.web || (() => { throw new Error("Invalid credentials.json format"); })();

  const REDIRECT_URI = "http://localhost:3000/oauth2callback";
  const oauth2Client = new OAuth2Client(client_id, client_secret, REDIRECT_URI);

  const state = randomBytes(16).toString("hex");

  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state,
  });

  console.log("Open this URL in your browser to authorize:\n");
  console.log(authorizeUrl);
  console.log("\nWaiting for authorization...");

  const code = await new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:3000`);
      const returnedState = url.searchParams.get("state");
      const authCode = url.searchParams.get("code");

      if (returnedState !== state) {
        res.writeHead(403);
        res.end("Invalid state parameter");
        server.close();
        reject(new Error("OAuth state mismatch — possible CSRF attack"));
        return;
      }

      if (authCode) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h1>Authentication successful!</h1><p>You can close this window.</p>");
        server.close();
        resolve(authCode);
      } else {
        res.writeHead(400);
        res.end("No code found");
        server.close();
        reject(new Error("No authorization code received"));
      }
    });
    server.listen(3000, "127.0.0.1");
  });

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const dir = path.dirname(TOKEN_PATH);
  const { mkdirSync } = await import("fs");
  mkdirSync(dir, { recursive: true, mode: 0o700 });

  await writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  console.log(`\nToken saved to ${TOKEN_PATH}`);
}

// Run standalone for initial auth
if (process.argv[1]?.endsWith("auth.ts") || process.argv[1]?.endsWith("auth.js")) {
  const credPath = process.env.YOUTUBE_MCP_CREDENTIALS || path.join(process.env.HOME || "~", ".youtube-mcp", "credentials.json");
  authenticate(credPath).catch(console.error);
}
