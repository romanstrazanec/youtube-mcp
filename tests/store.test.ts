import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { HistoryStore } from "../src/history/store.js";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";

describe("HistoryStore", () => {
  let store: HistoryStore;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "youtube-mcp-test-"));
    store = new HistoryStore(tempDir);
  });

  afterEach(() => {
    store.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should start empty", () => {
    expect(store.getCount()).toBe(0);
  });

  it("should insert a single entry", () => {
    store.insert({
      videoId: "abc123",
      title: "Funky Concert in Paris",
      channelTitle: "Music Channel",
      watchedAt: "2024-01-15T10:00:00Z",
      url: "https://www.youtube.com/watch?v=abc123",
    });

    expect(store.getCount()).toBe(1);
  });

  it("should insert many entries", () => {
    const entries = Array.from({ length: 100 }, (_, i) => ({
      videoId: `vid${i}`,
      title: `Video ${i}`,
      channelTitle: `Channel ${i}`,
      watchedAt: `2024-01-${String(i % 28 + 1).padStart(2, "0")}T10:00:00Z`,
      url: `https://www.youtube.com/watch?v=vid${i}`,
    }));

    const count = store.insertMany(entries);
    expect(count).toBe(100);
    expect(store.getCount()).toBe(100);
  });

  it("should ignore duplicate entries", () => {
    const entry = {
      videoId: "abc123",
      title: "Test Video",
      channelTitle: "Test Channel",
      watchedAt: "2024-01-15T10:00:00Z",
      url: "https://www.youtube.com/watch?v=abc123",
    };

    store.insert(entry);
    store.insert(entry);
    expect(store.getCount()).toBe(1);
  });

  it("should allow same video with different watch times", () => {
    store.insert({
      videoId: "abc123",
      title: "Test Video",
      channelTitle: "Test Channel",
      watchedAt: "2024-01-15T10:00:00Z",
      url: "https://www.youtube.com/watch?v=abc123",
    });
    store.insert({
      videoId: "abc123",
      title: "Test Video",
      channelTitle: "Test Channel",
      watchedAt: "2024-02-20T10:00:00Z",
      url: "https://www.youtube.com/watch?v=abc123",
    });

    expect(store.getCount()).toBe(2);
  });

  describe("search", () => {
    beforeEach(() => {
      store.insertMany([
        {
          videoId: "v1",
          title: "Funky Concert in Paris Live",
          channelTitle: "Jazz FM",
          watchedAt: "2024-01-10T10:00:00Z",
          url: "https://www.youtube.com/watch?v=v1",
        },
        {
          videoId: "v2",
          title: "TypeScript Tutorial for Beginners",
          channelTitle: "Code Academy",
          watchedAt: "2024-01-11T10:00:00Z",
          url: "https://www.youtube.com/watch?v=v2",
        },
        {
          videoId: "v3",
          title: "Best Restaurants in Paris",
          channelTitle: "Travel Guide",
          watchedAt: "2024-01-12T10:00:00Z",
          url: "https://www.youtube.com/watch?v=v3",
        },
        {
          videoId: "v4",
          title: "Jazz Piano Masterclass",
          channelTitle: "Music Lessons",
          watchedAt: "2024-01-13T10:00:00Z",
          url: "https://www.youtube.com/watch?v=v4",
        },
        {
          videoId: "v5",
          title: "Cooking Italian Pasta at Home",
          channelTitle: "Chef Mario",
          watchedAt: "2024-01-14T10:00:00Z",
          url: "https://www.youtube.com/watch?v=v5",
        },
      ]);
    });

    it("should find videos by title keyword", () => {
      const results = store.search("Paris");
      expect(results.length).toBe(2);
      expect(results.map((r) => r.videoId)).toContain("v1");
      expect(results.map((r) => r.videoId)).toContain("v3");
    });

    it("should find videos by channel name", () => {
      const results = store.search("Jazz");
      expect(results.length).toBe(2);
    });

    it("should return empty for no matches", () => {
      const results = store.search("basketball");
      expect(results.length).toBe(0);
    });

    it("should return empty for empty query", () => {
      const results = store.search("");
      expect(results.length).toBe(0);
    });

    it("should respect limit", () => {
      const results = store.search("Paris", 1);
      expect(results.length).toBe(1);
    });

    it("should match multi-word queries with OR logic", () => {
      const results = store.search("funk concert Paris");
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.map((r) => r.videoId)).toContain("v1");
    });
  });
});
