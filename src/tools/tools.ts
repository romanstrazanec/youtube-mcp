import { z } from "zod";

export const searchHistorySchema = z.object({
  query: z.string().describe("Search query to find videos in watch history (keywords, titles, channels)"),
  limit: z.number().optional().default(25).describe("Maximum number of results to return"),
});

export const searchLikedVideosSchema = z.object({
  query: z.string().describe("Search query to find videos in liked videos (keywords, titles, channels)"),
  limit: z.number().optional().default(25).describe("Maximum number of results to return"),
});

export const searchPlaylistsSchema = z.object({
  query: z.string().describe("Search query to find videos in playlists (keywords, titles, playlist names)"),
  limit: z.number().optional().default(25).describe("Maximum number of results to return"),
});

export const importTakeoutSchema = z.object({
  filePath: z.string().describe("Absolute path to the Google Takeout watch-history.json file"),
});

export const TOOL_DEFINITIONS = [
  {
    name: "search_history",
    description:
      "Search through imported YouTube watch history (from Google Takeout). " +
      "Uses full-text search over video titles and channel names. " +
      "History must be imported first using import_takeout.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query (keywords, titles, channels)" },
        limit: { type: "number", description: "Max results (default 25)" },
      },
      required: ["query"],
    },
  },
  {
    name: "search_liked_videos",
    description:
      "Search through the user's liked videos on YouTube using the YouTube Data API. " +
      "Requires OAuth2 authentication. Searches video titles, descriptions, and channel names.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query (keywords, titles, channels)" },
        limit: { type: "number", description: "Max results (default 25)" },
      },
      required: ["query"],
    },
  },
  {
    name: "search_playlists",
    description:
      "Search through the user's YouTube playlists and their videos. " +
      "Searches playlist names and video titles/descriptions within playlists. " +
      "Requires OAuth2 authentication.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query (keywords, titles, playlist names)" },
        limit: { type: "number", description: "Max results (default 25)" },
      },
      required: ["query"],
    },
  },
  {
    name: "import_takeout",
    description:
      "Import YouTube watch history from a Google Takeout JSON file into the local database. " +
      "The file should be the watch-history.json from a Google Takeout export. " +
      "Run this once after exporting your data from takeout.google.com.",
    inputSchema: {
      type: "object" as const,
      properties: {
        filePath: {
          type: "string",
          description: "Absolute path to the Google Takeout watch-history.json file",
        },
      },
      required: ["filePath"],
    },
  },
];
