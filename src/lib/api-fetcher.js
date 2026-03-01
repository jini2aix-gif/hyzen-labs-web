export const CACHE_DURATION = 60 * 1000; // 1 minute

const fetchWithCache = async (url, cacheKey, options = {}) => {
    const cachedItem = localStorage.getItem(cacheKey);
    if (cachedItem) {
        const { timestamp, data } = JSON.parse(cachedItem);
        if (Date.now() - timestamp < CACHE_DURATION) {
            return data;
        }
    }

    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}`);
    }
    const data = await response.json();

    localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data
    }));

    return data;
};

// 1. Price & Market Cap (CoinGecko)
export const fetchArbitrumMarketData = async () => {
    const url = 'https://api.coingecko.com/api/v3/coins/arbitrum?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false';
    const data = await fetchWithCache(url, 'arb_market_data');

    return {
        priceUSD: data.market_data.current_price.usd,
        marketCapUSD: data.market_data.market_cap.usd,
        priceChange24h: data.market_data.price_change_percentage_24h,
        volume24hUSD: data.market_data.total_volume.usd,
    };
};

// 2. TVL (DeFiLlama)
export const fetchArbitrumTVL = async () => {
    const url = 'https://api.llama.fi/v2/historicalChainTvl/Arbitrum';
    const data = await fetchWithCache(url, 'arb_tvl_data');

    // Convert to recharts format format: [{ date: '...', tvl: ... }]
    return data.map(item => {
        const date = new Date(item.date * 1000);
        return {
            timestamp: item.date * 1000,
            date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
            tvl: item.tvl
        };
    });
};

// 3. Whale Tracker Real Data (Dune Analytics API)
export const getWhaleTrackerData = async () => {
    // Vercel Serverless Function proxy call
    // This solves the CORS limits from browser to Dune, and hides the API keys
    const url = `/api/dune?t=${Date.now()}`;

    try {
        const data = await fetchWithCache(url, 'arb_whale_data_final_v1', { cache: 'no-store' });

        if (data && data.result && data.result.rows) {
            return data.result.rows.map(row => ({
                id: row.wallet_address || row.address || 'Unknown',
                currentBalance: row.balance_arb || row.balance || 0,
                increase24h: row.increase_24h_pct || row.increase24h || 0
            })).sort((a, b) => b.increase24h - a.increase24h);
        } else if (data && data.error) {
            console.error("Dune Backend API error:", data.error);
        }
        return [];
    } catch (e) {
        console.error("Failed to fetch from Dune proxy:", e);
        return [];
    }
};
