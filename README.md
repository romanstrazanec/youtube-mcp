# YouTube MCP Server

A Model Context Protocol (MCP) server that lets you search through your YouTube data via Claude — liked videos, playlists, and imported watch history.

## Features

- **Search liked videos** — Search through your liked videos via YouTube Data API
- **Search playlists** — Search through your playlists and their contents
- **Search watch history** — Full-text search over imported Google Takeout watch history
- **Import Takeout** — Import your YouTube watch history from Google Takeout

## Prerequisites

- Node.js >= 18
- A Google Cloud project with YouTube Data API v3 enabled
- OAuth2 credentials (for liked videos and playlists)
- Google Takeout export (for watch history)

## Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name it (e.g., `youtube-mcp`) and click **Create**
4. Make sure the new project is selected

### 2. Enable YouTube Data API v3

1. Go to [APIs & Services → Library](https://console.cloud.google.com/apis/library)
2. Search for **YouTube Data API v3**
3. Click on it and click **Enable**

### 3. Configure OAuth Consent Screen

1. Go to [APIs & Services → OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Select **External** (or Internal if using Google Workspace) and click **Create**
3. Fill in the required fields:
   - **App name**: `YouTube MCP`
   - **User support email**: your email
   - **Developer contact**: your email
4. Click **Save and Continue**
5. On the **Scopes** page, click **Add or Remove Scopes**
6. Find and add `https://www.googleapis.com/auth/youtube.readonly`
7. Click **Save and Continue**
8. On the **Test users** page, click **Add Users** and add your Google email
9. Click **Save and Continue**

> **Note**: While the app is in "Testing" status, only test users can authenticate. This is fine for personal use.

### 4. Create OAuth2 Credentials

1. Go to [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `YouTube MCP`
5. Under **Authorized redirect URIs**, add: `http://localhost:3000/oauth2callback`
6. Click **Create**
7. Click **Download JSON** on the created credential
8. Save the file as `~/.youtube-mcp/credentials.json`

### 5. Install and Build

```bash
npm install
npm run build
```

### 6. Authenticate with YouTube

```bash
npm run auth
```

This opens a browser for Google OAuth. Sign in and grant YouTube read-only access. The token is saved to `~/.youtube-mcp/token.json`.

### 7. (Optional) Import Watch History from Google Takeout

YouTube API no longer provides access to watch history. To search through your full history:

1. Go to [Google Takeout](https://takeout.google.com/)
2. Click **Deselect all**, then scroll down and select only **YouTube and YouTube Music**
3. Click **All YouTube data included** and select only **History**
4. Choose **JSON** format (not HTML)
5. Click **Create export** and wait for the download
6. Extract the archive and find `Takeout/YouTube and YouTube Music/history/watch-history.json`

The file can be imported via the `import_takeout` MCP tool once the server is running.

## Configure in Claude

Add to your Claude Code MCP settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "youtube": {
      "command": "node",
      "args": ["/path/to/YoutubeMCP/dist/index.js"],
      "env": {
        "YOUTUBE_MCP_CREDENTIALS": "~/.youtube-mcp/credentials.json",
        "YOUTUBE_MCP_DATA_DIR": "~/.youtube-mcp"
      }
    }
  }
}
```

Or for development:

```json
{
  "mcpServers": {
    "youtube": {
      "command": "npx",
      "args": ["ts-node", "--esm", "/path/to/YoutubeMCP/src/index.ts"],
      "env": {
        "YOUTUBE_MCP_CREDENTIALS": "~/.youtube-mcp/credentials.json",
        "YOUTUBE_MCP_DATA_DIR": "~/.youtube-mcp"
      }
    }
  }
}
```

## Usage Examples

Once configured, you can ask Claude things like:

- *"Search my liked videos for funk concerts"*
- *"Find that cooking video I watched last month"*
- *"Search my playlists for workout music"*
- *"Import my YouTube takeout from ~/Downloads/Takeout/.../watch-history.json"*

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `YOUTUBE_MCP_CREDENTIALS` | Path to OAuth2 credentials.json | `~/.youtube-mcp/credentials.json` |
| `YOUTUBE_MCP_DATA_DIR` | Directory for token and SQLite database | `~/.youtube-mcp` |

## YouTube API Quotas

The YouTube Data API v3 is **free** with a default quota of **10,000 units per day**.

| Operation | Cost |
|-----------|------|
| List liked videos | 1 unit per page |
| List playlists | 1 unit per page |
| List playlist items | 1 unit per page |

For personal use, you'll likely never hit the limit.

## License

MIT
