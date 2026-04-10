import { google, youtube_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export interface VideoResult {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl?: string;
  url: string;
}

export class YouTubeClient {
  private youtube: youtube_v3.Youtube;

  constructor(auth: OAuth2Client) {
    this.youtube = google.youtube({ version: "v3", auth });
  }

  async searchLikedVideos(query: string, maxResults = 25): Promise<VideoResult[]> {
    const isListAll = query === "*" || query.trim() === "";
    const fetchCount = isListAll ? maxResults : Math.min(maxResults * 4, 200);
    const allLiked = await this.getLikedVideos(fetchCount);

    if (isListAll) return allLiked.slice(0, maxResults);

    const queryTerms = query.toLowerCase().split(/\s+/);
    const scored = allLiked.map((video) => {
      const text = `${video.title} ${video.description} ${video.channelTitle}`.toLowerCase();
      const score = queryTerms.reduce((acc, term) => acc + (text.includes(term) ? 1 : 0), 0);
      return { video, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((s) => s.video);
  }

  async getLikedVideos(maxResults = 50): Promise<VideoResult[]> {
    // Use the hidden "LL" (Liked List) playlist — much more reliable
    // than videos.list with myRating: "like" which returns incomplete results
    return this.getPlaylistItems("LL", maxResults);
  }

  async searchPlaylists(query: string, maxResults = 25): Promise<VideoResult[]> {
    const playlists = await this.youtube.playlists.list({
      part: ["snippet"],
      mine: true,
      maxResults: 50,
    });

    const queryTerms = query.toLowerCase().split(/\s+/);
    const matchingPlaylists = (playlists.data.items || []).filter((p) => {
      const text = `${p.snippet?.title} ${p.snippet?.description}`.toLowerCase();
      return queryTerms.some((term) => text.includes(term));
    });

    const results: VideoResult[] = [];

    for (const playlist of matchingPlaylists.slice(0, 5)) {
      const items = await this.getPlaylistItems(playlist.id!, maxResults);
      const playlistVideos = items.map((v) => ({
        ...v,
        title: `[${playlist.snippet?.title}] ${v.title}`,
      }));
      results.push(...playlistVideos);
    }

    // Also search within all playlist items
    if (results.length < maxResults) {
      const allPlaylists = playlists.data.items || [];
      for (const playlist of allPlaylists) {
        const items = await this.getPlaylistItems(playlist.id!, 50);
        const matching = items.filter((v) => {
          const text = `${v.title} ${v.description} ${v.channelTitle}`.toLowerCase();
          return queryTerms.some((term) => text.includes(term));
        });
        for (const m of matching) {
          if (!results.find((r) => r.videoId === m.videoId)) {
            results.push(m);
          }
        }
        if (results.length >= maxResults) break;
      }
    }

    return results.slice(0, maxResults);
  }

  private async getPlaylistItems(playlistId: string, maxResults = 50): Promise<VideoResult[]> {
    const videos: VideoResult[] = [];
    let pageToken: string | undefined;

    while (videos.length < maxResults) {
      const res = await this.youtube.playlistItems.list({
        part: ["snippet"],
        playlistId,
        maxResults: Math.min(50, maxResults - videos.length),
        pageToken,
      });

      for (const item of res.data.items || []) {
        if (item.snippet?.resourceId?.videoId) {
          videos.push({
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title || "",
            description: item.snippet.description || "",
            channelTitle: item.snippet.videoOwnerChannelTitle || "",
            publishedAt: item.snippet.publishedAt || "",
            thumbnailUrl: item.snippet.thumbnails?.default?.url ?? undefined,
            url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
          });
        }
      }

      pageToken = res.data.nextPageToken ?? undefined;
      if (!pageToken) break;
    }

    return videos;
  }

  private mapVideo(item: youtube_v3.Schema$Video): VideoResult {
    return {
      videoId: item.id || "",
      title: item.snippet?.title || "",
      description: item.snippet?.description || "",
      channelTitle: item.snippet?.channelTitle || "",
      publishedAt: item.snippet?.publishedAt || "",
      thumbnailUrl: item.snippet?.thumbnails?.default?.url ?? undefined,
      url: `https://www.youtube.com/watch?v=${item.id}`,
    };
  }
}
