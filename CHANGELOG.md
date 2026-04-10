# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.3] - 2026-04-10

### Fixed

- Update tests to match LL playlist-based liked videos fetching

## [1.0.2] - 2026-04-10

### Fixed

- OAuth redirect URI: use hardcoded `http://localhost:3000` instead of reading `redirect_uris` from credentials (web credentials only have `javascript_origins`)
- Liked videos: fetch from `LL` playlist instead of `videos.list` with `myRating: "like"` which returned incomplete results
- Support `*` query to list liked videos without filtering

## [1.0.1] - 2026-04-10

### Fixed

- Repository URL in package.json updated to renamed repo

### Changed

- Package published as `@romanstrazanec/youtube-mcp`
- Switched to npm Trusted Publishing (OIDC) for CI releases

## [1.0.0] - 2026-04-10

### Added

- MCP server with stdio transport using `@modelcontextprotocol/sdk`
- `search_liked_videos` tool — search liked videos via YouTube Data API v3
- `search_playlists` tool — search playlists and their video contents
- `search_history` tool — full-text search over imported watch history using SQLite FTS5
- `import_takeout` tool — import Google Takeout `watch-history.json` into local SQLite database
- OAuth2 authentication flow with auto-auth on first API call
- `bin` entry in package.json — installable via `npx youtube-mcp`
- CI pipeline with GitHub Actions (Node.js 18, 20, 22)
- Publish to npm workflow triggered on version tags
- MIT LICENSE file
- README with Quick Start section and Google Cloud setup guide
