# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-04-10

### Added

- MCP server with stdio transport using `@modelcontextprotocol/sdk`
- `search_liked_videos` tool — search liked videos via YouTube Data API v3
- `search_playlists` tool — search playlists and their video contents
- `search_history` tool — full-text search over imported watch history using SQLite FTS5
- `import_takeout` tool — import Google Takeout `watch-history.json` into local SQLite database
- OAuth2 authentication flow for YouTube API with token persistence
- CI pipeline with GitHub Actions (Node.js 18, 20, 22)
- README with full YouTube API credential setup guide
