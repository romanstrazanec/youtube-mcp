---
name: youtube-search
description: Search through YouTube liked videos, playlists, and watch history using the YouTube MCP server
allowed-tools: ["mcp__youtube__search_liked_videos", "mcp__youtube__search_playlists", "mcp__youtube__search_history", "mcp__youtube__import_takeout"]
---

Search YouTube for: $ARGUMENTS

Use all available YouTube MCP tools to find matching videos:

1. **search_liked_videos** — search liked videos by title, description, channel
2. **search_playlists** — search playlists and their video contents
3. **search_history** — search imported watch history (Google Takeout)

Run all three searches in parallel when possible. Combine and deduplicate results, ranking by relevance. Present results with title, channel, URL, and date.

If history search returns no results and suggests importing, let the user know they can import their Google Takeout data.
