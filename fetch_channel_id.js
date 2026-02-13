import fetch from 'node-fetch';

const API_KEY = 'AIzaSyCmm_MS6dhbIv7zKzIOcjFexpLwInYKfts';
const HANDLE = '@Hyzen-Labs-AI';

async function getChannelId() {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(HANDLE)}&type=channel&key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            console.log('Channel ID:', data.items[0].snippet.channelId);
            console.log('Channel Title:', data.items[0].snippet.channelTitle);
        } else {
            console.log('Channel not found via search. Trying direct lookup...');
            // Fallback or manual check might be needed if search fails
            console.log('Raw Data:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('Error fetching channel ID:', error);
    }
}

getChannelId();
