# YoutubeMCP

YouTube MCP (Model Context Protocol) server for searching personal YouTube data via Claude.

## Stack

- **Language**: TypeScript
- **MCP SDK**: `@modelcontextprotocol/sdk` (stdio transport)
- **YouTube API**: `googleapis` npm package (YouTube Data API v3, free tier — 10,000 quota units/day)
- **Database**: SQLite with FTS5 full-text search (`better-sqlite3`)
- **Auth**: OAuth2 via `google-auth-library` (auto-triggers on first API call if no token exists)

## Architecture

MCP server exposes tools that Claude can call:
1. `search_history` — keyword/FTS5 search over imported Google Takeout watch history
2. `search_liked_videos` — search liked videos via YouTube Data API
3. `search_playlists` — search playlists and their contents via YouTube Data API
4. `import_takeout` — import a Google Takeout JSON file into SQLite

## Data Sources

- **YouTube Data API v3** — for liked videos, playlists (live data, OAuth2 required)
- **Google Takeout export** — for full watch history (must be manually exported, no API available)

## Search Strategy

Using SQLite FTS5 for keyword/fuzzy search + Claude's natural language understanding to reformulate queries.
Vector search (sqlite-vec + embeddings) can be added later if keyword search proves insufficient.

## Key Decisions

- SQLite FTS5 over vector DB: simpler, no embedding model dependency, Claude handles semantic interpretation
- Google Takeout for history: YouTube API deprecated watch history access in 2016
- TypeScript chosen for best MCP SDK support and googleapis ecosystem
- Auto-auth on first use: no separate `npm run auth` step needed, OAuth flow triggers automatically
- Published as npm package: users install via `npx youtube-mcp`, no clone/build required
