import { describe, it, expect, vi, beforeEach } from "vitest";
import { YouTubeClient } from "../src/youtube/client.js";
import type { OAuth2Client } from "google-auth-library";

// Mock googleapis
vi.mock("googleapis", () => {
  const mockYoutube = {
    videos: { list: vi.fn() },
    playlists: { list: vi.fn() },
    playlistItems: { list: vi.fn() },
  };
  return {
    google: {
      youtube: () => mockYoutube,
    },
    __mockYoutube: mockYoutube,
  };
});

async function getMockYoutube() {
  const mod = await import("googleapis");
  return (mod as unknown as { __mockYoutube: MockYoutube }).__mockYoutube;
}

interface MockYoutube {
  videos: { list: ReturnType<typeof vi.fn> };
  playlists: { list: ReturnType<typeof vi.fn> };
  playlistItems: { list: ReturnType<typeof vi.fn> };
}

describe("YouTubeClient", () => {
  let client: YouTubeClient;
  let mockApi: MockYoutube;

  beforeEach(async () => {
    mockApi = await getMockYoutube();
    client = new YouTubeClient({} as OAuth2Client);

    // Reset mocks
    mockApi.videos.list.mockReset();
    mockApi.playlists.list.mockReset();
    mockApi.playlistItems.list.mockReset();
  });

  describe("searchLikedVideos", () => {
    it("should return matching liked videos", async () => {
      mockApi.playlistItems.list.mockResolvedValueOnce({
        data: {
          items: [
            {
              snippet: {
                resourceId: { videoId: "v1" },
                title: "Funk Concert Paris 2024",
                description: "Amazing live funk show",
                videoOwnerChannelTitle: "Music Live",
                publishedAt: "2024-01-10T00:00:00Z",
                thumbnails: { default: { url: "https://img.youtube.com/v1.jpg" } },
              },
            },
            {
              snippet: {
                resourceId: { videoId: "v2" },
                title: "TypeScript Tutorial",
                description: "Learn TS basics",
                videoOwnerChannelTitle: "Code TV",
                publishedAt: "2024-02-10T00:00:00Z",
                thumbnails: { default: { url: "https://img.youtube.com/v2.jpg" } },
              },
            },
            {
              snippet: {
                resourceId: { videoId: "v3" },
                title: "Paris Travel Guide",
                description: "Best places in Paris",
                videoOwnerChannelTitle: "Travel Channel",
                publishedAt: "2024-03-10T00:00:00Z",
                thumbnails: { default: { url: "https://img.youtube.com/v3.jpg" } },
              },
            },
          ],
          nextPageToken: null,
        },
      });

      const results = await client.searchLikedVideos("funk Paris");

      expect(results.length).toBe(2);
      // v1 matches both "funk" and "paris" → should be first
      expect(results[0].videoId).toBe("v1");
      expect(results[0].title).toBe("Funk Concert Paris 2024");
      expect(results[0].url).toBe("https://www.youtube.com/watch?v=v1");
      // v3 matches "paris" only
      expect(results[1].videoId).toBe("v3");
    });

    it("should return empty when no matches", async () => {
      mockApi.playlistItems.list.mockResolvedValueOnce({
        data: { items: [], nextPageToken: null },
      });

      const results = await client.searchLikedVideos("nonexistent");
      expect(results).toEqual([]);
    });

    it("should paginate through liked videos", async () => {
      mockApi.playlistItems.list
        .mockResolvedValueOnce({
          data: {
            items: [
              { snippet: { resourceId: { videoId: "v1" }, title: "Page 1 Video", description: "", videoOwnerChannelTitle: "Ch", publishedAt: "", thumbnails: {} } },
            ],
            nextPageToken: "page2token",
          },
        })
        .mockResolvedValueOnce({
          data: {
            items: [
              { snippet: { resourceId: { videoId: "v2" }, title: "Page 2 Video matching query", description: "", videoOwnerChannelTitle: "Ch", publishedAt: "", thumbnails: {} } },
            ],
            nextPageToken: null,
          },
        });

      const results = await client.searchLikedVideos("query", 25);
      expect(mockApi.playlistItems.list).toHaveBeenCalledTimes(2);
      expect(results.length).toBe(1); // Only "Page 2 Video matching query" matches
    });
  });

  describe("searchPlaylists", () => {
    it("should search within matching playlists", async () => {
      mockApi.playlists.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: "pl1", snippet: { title: "My Music Collection", description: "Favorite songs" } },
            { id: "pl2", snippet: { title: "Coding Tutorials", description: "Programming stuff" } },
          ],
        },
      });

      // First call: for the matching playlist "My Music Collection"
      mockApi.playlistItems.list.mockResolvedValueOnce({
        data: {
          items: [
            {
              snippet: {
                resourceId: { videoId: "pv1" },
                title: "Great Song",
                description: "",
                videoOwnerChannelTitle: "Artist",
                publishedAt: "2024-01-01T00:00:00Z",
                thumbnails: { default: { url: "https://img.youtube.com/pv1.jpg" } },
              },
            },
          ],
          nextPageToken: null,
        },
      });
      // Second call: search within "My Music Collection" items (all-playlists loop)
      mockApi.playlistItems.list.mockResolvedValueOnce({
        data: {
          items: [],
          nextPageToken: null,
        },
      });
      // Third call: search within "Coding Tutorials" items (all-playlists loop)
      mockApi.playlistItems.list.mockResolvedValueOnce({
        data: {
          items: [],
          nextPageToken: null,
        },
      });

      const results = await client.searchPlaylists("music");
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].title).toContain("My Music Collection");
    });
  });
});
