import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "path";
import { getAuthenticatedClient } from "./youtube/auth.js";
import { YouTubeClient } from "./youtube/client.js";
import { HistoryStore } from "./history/store.js";
import { importTakeout } from "./history/importer.js";

const CREDENTIALS_PATH =
  process.env.YOUTUBE_MCP_CREDENTIALS ||
  path.join(process.env.HOME || "~", ".youtube-mcp", "credentials.json");

const server = new McpServer({
  name: "youtube-mcp",
  version: "1.0.0",
});

const store = new HistoryStore();

let youtubeClient: YouTubeClient | null = null;

async function getYouTubeClient(): Promise<YouTubeClient> {
  if (!youtubeClient) {
    const auth = await getAuthenticatedClient(CREDENTIALS_PATH);
    youtubeClient = new YouTubeClient(auth);
  }
  return youtubeClient;
}

// Tool: search_history
server.tool(
  "search_history",
  "Search through imported YouTube watch history (from Google Takeout). Uses full-text search over video titles and channel names.",
  {
    query: z.string().describe("Search query (keywords, titles, channels)"),
    limit: z.number().optional().default(25).describe("Max results"),
  },
  async ({ query, limit }) => {
    const results = store.search(query, limit);
    const count = store.getCount();

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: count === 0
              ? "No watch history imported yet. Use the import_takeout tool to import your Google Takeout data first."
              : `No results found for "${query}" in ${count} watch history entries.`,
          },
        ],
      };
    }

    const text = results
      .map(
        (r, i) =>
          `${i + 1}. **${r.title}** by ${r.channelTitle}\n   ${r.url}\n   Watched: ${r.watchedAt}`
      )
      .join("\n\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${results.length} results in watch history (${count} total entries):\n\n${text}`,
        },
      ],
    };
  }
);

// Tool: search_liked_videos
server.tool(
  "search_liked_videos",
  "Search through liked videos on YouTube via the YouTube Data API. Searches titles, descriptions, and channel names.",
  {
    query: z.string().describe("Search query (keywords, titles, channels)"),
    limit: z.number().optional().default(25).describe("Max results"),
  },
  async ({ query, limit }) => {
    try {
      const client = await getYouTubeClient();
      const results = await client.searchLikedVideos(query, limit);

      if (results.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No liked videos found matching "${query}".` }],
        };
      }

      const text = results
        .map(
          (r, i) =>
            `${i + 1}. **${r.title}** by ${r.channelTitle}\n   ${r.url}\n   Published: ${r.publishedAt}`
        )
        .join("\n\n");

      return {
        content: [
          { type: "text" as const, text: `Found ${results.length} liked videos matching "${query}":\n\n${text}` },
        ],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error searching liked videos: ${message}` }],
        isError: true,
      };
    }
  }
);

// Tool: search_playlists
server.tool(
  "search_playlists",
  "Search through YouTube playlists and their videos. Searches playlist names and video contents.",
  {
    query: z.string().describe("Search query (keywords, titles, playlist names)"),
    limit: z.number().optional().default(25).describe("Max results"),
  },
  async ({ query, limit }) => {
    try {
      const client = await getYouTubeClient();
      const results = await client.searchPlaylists(query, limit);

      if (results.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No playlist videos found matching "${query}".` }],
        };
      }

      const text = results
        .map(
          (r, i) =>
            `${i + 1}. **${r.title}** by ${r.channelTitle}\n   ${r.url}\n   Published: ${r.publishedAt}`
        )
        .join("\n\n");

      return {
        content: [
          { type: "text" as const, text: `Found ${results.length} playlist videos matching "${query}":\n\n${text}` },
        ],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error searching playlists: ${message}` }],
        isError: true,
      };
    }
  }
);

// Tool: import_takeout
server.tool(
  "import_takeout",
  "Import YouTube watch history from a Google Takeout JSON file into the local database.",
  {
    filePath: z.string().describe("Absolute path to the Google Takeout watch-history.json file"),
  },
  async ({ filePath }) => {
    try {
      const imported = await importTakeout(filePath, store);
      const total = store.getCount();

      return {
        content: [
          {
            type: "text" as const,
            text: `Successfully imported ${imported} new entries. Total watch history entries: ${total}.`,
          },
        ],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error importing takeout data: ${message}` }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("YouTube MCP server running on stdio");
}

main().catch(console.error);
