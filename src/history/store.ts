import Database from "better-sqlite3";
import path from "path";
import { mkdirSync } from "fs";

export interface HistoryEntry {
  videoId: string;
  title: string;
  channelTitle: string;
  watchedAt: string;
  url: string;
}

export class HistoryStore {
  private db: Database.Database;

  constructor(dataDir?: string) {
    const dir = dataDir || process.env.YOUTUBE_MCP_DATA_DIR || path.join(process.env.HOME || "~", ".youtube-mcp");
    mkdirSync(dir, { recursive: true });

    const dbPath = path.join(dir, "history.db");
    this.db = new Database(dbPath);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS history (
        video_id TEXT,
        title TEXT NOT NULL,
        channel_title TEXT,
        watched_at TEXT,
        url TEXT,
        PRIMARY KEY (video_id, watched_at)
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS history_fts USING fts5(
        title,
        channel_title,
        content='history',
        content_rowid='rowid'
      );

      CREATE TRIGGER IF NOT EXISTS history_ai AFTER INSERT ON history BEGIN
        INSERT INTO history_fts(rowid, title, channel_title)
        VALUES (new.rowid, new.title, new.channel_title);
      END;

      CREATE TRIGGER IF NOT EXISTS history_ad AFTER DELETE ON history BEGIN
        INSERT INTO history_fts(history_fts, rowid, title, channel_title)
        VALUES ('delete', old.rowid, old.title, old.channel_title);
      END;
    `);
  }

  insert(entry: HistoryEntry): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO history (video_id, title, channel_title, watched_at, url)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(entry.videoId, entry.title, entry.channelTitle, entry.watchedAt, entry.url);
  }

  insertMany(entries: HistoryEntry[]): number {
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO history (video_id, title, channel_title, watched_at, url)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((items: HistoryEntry[]) => {
      let count = 0;
      for (const e of items) {
        const result = insert.run(e.videoId, e.title, e.channelTitle, e.watchedAt, e.url);
        if (result.changes > 0) count++;
      }
      return count;
    });

    return transaction(entries);
  }

  search(query: string, limit = 25): HistoryEntry[] {
    // Convert natural language to FTS5 query terms
    const terms = query
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((t) => t.length > 1)
      .map((t) => `"${t}"`)
      .join(" OR ");

    if (!terms) return [];

    const stmt = this.db.prepare(`
      SELECT h.video_id, h.title, h.channel_title, h.watched_at, h.url
      FROM history h
      JOIN history_fts fts ON h.rowid = fts.rowid
      WHERE history_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);

    return stmt.all(terms, limit) as HistoryEntry[];
  }

  getCount(): number {
    const row = this.db.prepare("SELECT COUNT(*) as count FROM history").get() as { count: number };
    return row.count;
  }

  close(): void {
    this.db.close();
  }
}
