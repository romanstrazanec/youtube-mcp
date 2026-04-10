import { readFile } from "fs/promises";
import { HistoryEntry, HistoryStore } from "./store.js";

interface TakeoutEntry {
  header?: string;
  title?: string;
  titleUrl?: string;
  subtitles?: Array<{ name?: string; url?: string }>;
  time?: string;
  products?: string[];
  activityControls?: string[];
}

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:v=|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? null;
}

export async function importTakeout(filePath: string, store: HistoryStore): Promise<number> {
  const content = await readFile(filePath, "utf-8");
  const data: TakeoutEntry[] = JSON.parse(content);

  const entries: HistoryEntry[] = [];

  for (const item of data) {
    // Skip non-video entries (ads, etc.)
    if (!item.titleUrl) continue;

    const videoId = extractVideoId(item.titleUrl);
    if (!videoId) continue;

    // Title often starts with "Watched " in Takeout
    const title = (item.title || "").replace(/^Watched\s+/, "");
    const channelTitle = item.subtitles?.[0]?.name || "";
    const watchedAt = item.time || "";

    entries.push({
      videoId,
      title,
      channelTitle,
      watchedAt,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    });
  }

  return store.insertMany(entries);
}
