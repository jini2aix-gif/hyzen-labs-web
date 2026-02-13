import { useState, useEffect } from 'react';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const CHANNEL_ID = 'UCVSSJSyjLuvRv-0r0kNTUkw'; // Hyzen Labs Channel ID

export const useYouTube = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchVideos = async () => {
            // 1. Check Session Storage Cache
            const cachedData = sessionStorage.getItem('hs_youtube_cache');
            const cachedTime = sessionStorage.getItem('hs_youtube_timestamp');
            const now = new Date().getTime();

            if (cachedData && cachedTime && (now - cachedTime < 1000 * 60 * 60)) { // 1 hour cache
                setVideos(JSON.parse(cachedData));
                setLoading(false);
                return;
            }

            if (!API_KEY) {
                console.warn("YouTube API Key is missing. Using mock data.");
                setVideos(MOCK_DATA);
                setLoading(false);
                return;
            }

            try {
                // 1. Search for videos to get IDs
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                const searchResponse = await fetch(
                    `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=id&order=date&maxResults=50&type=video`,
                    { signal: controller.signal }
                );
                clearTimeout(timeoutId);

                if (!searchResponse.ok) throw new Error('Failed to fetch video IDs');
                const searchData = await searchResponse.json();
                const videoIds = searchData.items.map(item => item.id.videoId).join(',');

                if (!videoIds) {
                    setVideos([]);
                    setLoading(false);
                    return;
                }

                // 2. Fetch video details (contentDetails, statistics) using IDs
                const videosResponse = await fetch(
                    `https://www.googleapis.com/youtube/v3/videos?key=${API_KEY}&part=snippet,statistics&id=${videoIds}`
                );

                if (!videosResponse.ok) throw new Error('Failed to fetch video details');
                const videosData = await videosResponse.json();

                const formattedVideos = videosData.items.map(item => ({
                    id: item.id,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    thumbnail: item.snippet.thumbnails.high.url,
                    publishedAt: item.snippet.publishedAt,
                    views: item.statistics.viewCount,
                    likes: item.statistics.likeCount,
                    type: 'youtube'
                }));

                setVideos(formattedVideos);
                sessionStorage.setItem('hs_youtube_cache', JSON.stringify(formattedVideos));
                sessionStorage.setItem('hs_youtube_timestamp', now.toString());
            } catch (err) {
                console.error(err);
                setError(err);
                // Fallback to mock data on error (optional, but good for stability)
                setVideos(MOCK_DATA);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, []);

    return { videos, loading, error };
};

const MOCK_DATA = [
    {
        id: 'mock1',
        title: 'Hyzen Labs Vision 2026',
        description: 'The future of digital matrix ecosystems.',
        thumbnail: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1000&auto=format&fit=crop',
        publishedAt: new Date().toISOString(),
        type: 'youtube'
    },
    {
        id: 'mock2',
        title: 'AI Synthesis Protocol',
        description: 'Exploring the depths of neural networks.',
        thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1000&auto=format&fit=crop',
        publishedAt: new Date().toISOString(),
        type: 'youtube'
    }
];
