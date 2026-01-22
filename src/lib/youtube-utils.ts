import ytpl from "ytpl";
import axios from "axios";
import { exec } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";

const execPromise = util.promisify(exec);

export interface YouTubePlaylistItem {
    videoId: string;
    title: string;
    duration: string;
    embedUrl: string;
    index: number;
}

export interface YouTubePlaylistMetadata {
    id: string;
    title: string;
    url: string;
    author: string;
    totalVideos: number;
    items: YouTubePlaylistItem[];
}

export function isValidYouTubePlaylistUrl(url: string): boolean {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(playlist\?|watch\?)|youtu\.be\/)/;
    return youtubeRegex.test(url);
}

export function parseISODurationToStr(iso: string): string {
    try {
        const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '');
        if (!match) return '00:00';
        const h = parseInt(match[1] || '0', 10);
        const m = parseInt(match[2] || '0', 10);
        const s = parseInt(match[3] || '0', 10);
        const total = h * 3600 + m * 60 + s;
        const mm = Math.floor(total / 60);
        const ss = total % 60;
        return `${mm}:${ss.toString().padStart(2, '0')}`;
    } catch {
        return '00:00';
    }
}

export async function fetchYouTubePlaylistMetadata(playlistUrl: string): Promise<YouTubePlaylistMetadata | null> {
    try {
        // Try ytpl first
        try {
            const playlist = await ytpl(playlistUrl, { limit: 100 });
            return {
                id: playlist.id,
                title: playlist.title,
                url: playlist.url,
                author: playlist.author?.name || 'Unknown Channel',
                totalVideos: playlist.estimatedItemCount || playlist.items.length,
                items: playlist.items.map((item, index) => ({
                    videoId: item.id,
                    title: item.title,
                    duration: item.duration || '00:00',
                    embedUrl: `https://www.youtube.com/embed/${item.id}`,
                    index: index + 1
                }))
            };
        } catch (ytplError) {
            console.warn('ytpl failed, trying YouTube API fallback:', ytplError);
        }

        // Fallback to official YouTube API if key is available
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) return null;

        const urlObj = new URL(playlistUrl);
        const listId = urlObj.searchParams.get('list') || playlistUrl;

        const listResp = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
            params: {
                part: 'snippet,contentDetails',
                maxResults: 50,
                playlistId: listId,
                key: apiKey
            }
        });

        const items = listResp.data.items || [];
        const videoIds = items.map((it: any) => it.contentDetails.videoId);

        // Fetch durations
        const videoResp = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
            params: {
                part: 'contentDetails',
                id: videoIds.join(','),
                key: apiKey
            }
        });

        const durations: Record<string, string> = {};
        videoResp.data.items.forEach((v: any) => {
            durations[v.id] = parseISODurationToStr(v.contentDetails.duration);
        });

        return {
            id: listId,
            title: 'YouTube Playlist',
            url: playlistUrl,
            author: items.length > 0 ? items[0].snippet.videoOwnerChannelTitle : 'Unknown Channel',
            totalVideos: items.length,
            items: items.map((it: any, index: number) => ({
                videoId: it.contentDetails.videoId,
                title: it.snippet.title,
                duration: durations[it.contentDetails.videoId] || '00:00',
                embedUrl: `https://www.youtube.com/embed/${it.contentDetails.videoId}`,
                index: index + 1
            }))
        };
    } catch (error) {
        console.error('Error fetching YouTube metadata:', error);
        return null;
    }
}

export async function extractAudio(videoUrl: string, videoId: string): Promise<string> {
    const audioPath = process.env.AUDIO_PATH || './shared';
    const outputPath = path.join(audioPath, `${videoId}.mp3`);

    console.log(`🎥 Starting audio extraction for ${videoId}...`);

    try {
        if (!fs.existsSync(audioPath)) {
            fs.mkdirSync(audioPath, { recursive: true });
        }

        // Use yt-dlp
        const command = `yt-dlp -x --audio-format mp3 --audio-quality 128K --no-playlist -o "${outputPath}" "${videoUrl}"`;

        const { stdout, stderr } = await execPromise(command, {
            maxBuffer: 50 * 1024 * 1024, // 50MB buffer
            timeout: 300000 // 5 minutes timeout
        });

        if (fs.existsSync(outputPath)) {
            console.log(`✅ Audio extraction completed for ${videoId}`);
            return outputPath;
        } else {
            throw new Error('Output file not created');
        }
    } catch (error: any) {
        console.error(`❌ yt-dlp error for ${videoId}:`, error.message);
        throw error;
    }
}
