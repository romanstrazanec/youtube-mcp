import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { importTakeout } from "../src/history/importer.js";
import { HistoryStore } from "../src/history/store.js";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

describe("importTakeout", () => {
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

  function writeTakeoutFile(data: unknown[]): string {
    const filePath = path.join(tempDir, "watch-history.json");
    writeFileSync(filePath, JSON.stringify(data));
    return filePath;
  }

  it("should import standard takeout entries", async () => {
    const filePath = writeTakeoutFile([
      {
        title: "Watched Funky Live in Paris",
        titleUrl: "https://www.youtube.com/watch?v=abc123def45",
        subtitles: [{ name: "Music Channel", url: "https://www.youtube.com/channel/123" }],
        time: "2024-03-15T14:30:00.000Z",
        products: ["YouTube"],
      },
      {
        title: "Watched TypeScript Deep Dive",
        titleUrl: "https://www.youtube.com/watch?v=xyz789ghi01",
        subtitles: [{ name: "Code TV" }],
        time: "2024-03-16T09:00:00.000Z",
      },
    ]);

    const count = await importTakeout(filePath, store);
    expect(count).toBe(2);
    expect(store.getCount()).toBe(2);

    const results = store.search("Funky");
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("Funky Live in Paris"); // "Watched " prefix stripped
    expect(results[0].channelTitle).toBe("Music Channel");
  });

  it("should skip entries without titleUrl", async () => {
    const filePath = writeTakeoutFile([
      {
        title: "Watched some ad",
        time: "2024-03-15T14:30:00.000Z",
      },
      {
        title: "Watched Valid Video",
        titleUrl: "https://www.youtube.com/watch?v=valid12345_",
        time: "2024-03-15T15:00:00.000Z",
      },
    ]);

    const count = await importTakeout(filePath, store);
    expect(count).toBe(1);
  });

  it("should skip entries with invalid video URLs", async () => {
    const filePath = writeTakeoutFile([
      {
        title: "Watched something",
        titleUrl: "https://www.google.com/not-a-video",
        time: "2024-03-15T14:30:00.000Z",
      },
    ]);

    const count = await importTakeout(filePath, store);
    expect(count).toBe(0);
  });

  it("should handle empty takeout file", async () => {
    const filePath = writeTakeoutFile([]);
    const count = await importTakeout(filePath, store);
    expect(count).toBe(0);
  });

  it("should handle entries without subtitles", async () => {
    const filePath = writeTakeoutFile([
      {
        title: "Watched Mystery Video",
        titleUrl: "https://www.youtube.com/watch?v=mystery12345",
        time: "2024-03-15T14:30:00.000Z",
      },
    ]);

    const count = await importTakeout(filePath, store);
    expect(count).toBe(1);

    const results = store.search("Mystery");
    expect(results[0].channelTitle).toBe("");
  });

  it("should not duplicate on re-import", async () => {
    const filePath = writeTakeoutFile([
      {
        title: "Watched Same Video",
        titleUrl: "https://www.youtube.com/watch?v=same12345678",
        time: "2024-03-15T14:30:00.000Z",
      },
    ]);

    await importTakeout(filePath, store);
    const secondCount = await importTakeout(filePath, store);
    expect(secondCount).toBe(0);
    expect(store.getCount()).toBe(1);
  });

  it("should handle large imports", async () => {
    const entries = Array.from({ length: 500 }, (_, i) => ({
      title: `Watched Video Number ${i}`,
      titleUrl: `https://www.youtube.com/watch?v=v${String(i).padStart(10, "0")}`,
      subtitles: [{ name: `Channel ${i}` }],
      time: `2024-01-${String((i % 28) + 1).padStart(2, "0")}T10:00:00.000Z`,
    }));

    const filePath = writeTakeoutFile(entries);
    const count = await importTakeout(filePath, store);
    expect(count).toBe(500);
    expect(store.getCount()).toBe(500);
  });
});
