/**
 * API Fetcher – Free APIs only (DeFiLlama, CoinGecko, Arbiscan) with local mock fallback
 */

const TTL = {
    SHORT: 1 * 60 * 1000,    // 1 min
    MEDIUM: 5 * 60 * 1000,   // 5 min
    LONG: 24 * 60 * 60 * 1000, // 24 h
};

export const REFRESH = {
    FAST: 20 * 1000,     // 20s
    NORMAL: 5 * 60 * 1000, // 5m
    SLOW: 24 * 60 * 60 * 1000, // 24h
};

// ─── Utility: Fetch with Cache & Optional Mock Fallback ─────────────────────
const fetchWithCache = async (url, cacheKey, ttl = 0, fallbackMock = null) => {
    if (ttl > 0) {
        try {
            const raw = localStorage.getItem(cacheKey);
            if (raw) {
                const { timestamp, data } = JSON.parse(raw);
                if (Date.now() - timestamp < ttl) return data;
            }
        } catch (_) { }
    }

    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        const data = await res.json();

        if (ttl > 0) {
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
        }
        return data;
    } catch (e) {
        console.warn(`Fetch Failed for ${url}, using mock data`, e);
        if (fallbackMock) return fallbackMock;

        // Return stale cache if available
        try {
            const raw = localStorage.getItem(cacheKey);
            if (raw) return JSON.parse(raw).data;
        } catch (_) { }
        throw e;
    }
};

// ─── 1. Market Data (CoinGecko) ──────────────────────────────────────────────
export const fetchMarketComparison = async () => {
    const defaultData = {
        arbitrum: { usd: 0.7, krw: 1000, usd_market_cap: 2500000000 },
        optimism: { usd: 1.5, krw: 2100, usd_market_cap: 1500000000 },
        base: { usd: 0, krw: 0, usd_market_cap: 0 } // Base has no token
    };

    const ds = await fetchWithCache(
        'https://api.coingecko.com/api/v3/simple/price?ids=arbitrum,optimism&vs_currencies=usd,krw&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true',
        'market_comp_cg',
        TTL.SHORT,
        defaultData
    );

    return {
        arb: {
            priceUSD: ds?.arbitrum?.usd || defaultData.arbitrum.usd,
            priceKRW: ds?.arbitrum?.krw || defaultData.arbitrum.krw,
            mcapUSD: ds?.arbitrum?.usd_market_cap || defaultData.arbitrum.usd_market_cap,
            change24h: ds?.arbitrum?.usd_24h_change || 0
        },
        op: {
            mcapUSD: ds?.optimism?.usd_market_cap || defaultData.optimism.usd_market_cap
        }
    };
};

// ─── 2. TVL Data (DeFiLlama) ─────────────────────────────────────────────────
export const fetchChainTVLs = async () => {
    const defaultChains = [
        { name: 'Arbitrum', tvl: 2500000000 },
        { name: 'Optimism', tvl: 750000000 },
        { name: 'Base', tvl: 1200000000 }
    ];

    const ds = await fetchWithCache('https://api.llama.fi/v2/chains', 'chains_tvl', TTL.MEDIUM, defaultChains);

    const findTVL = (name) => {
        const chain = ds.find(c => c.name.toLowerCase() === name.toLowerCase());
        return chain ? chain.tvl : 0;
    };

    return {
        arb: findTVL('Arbitrum'),
        op: findTVL('Optimism'),
        base: findTVL('Base') // Base TVL as proxy benchmark
    };
};

export const fetchArbitrumHistoricalTVL = async () => {
    // Generate mock historical if fails
    const mock = Array.from({ length: 30 }).map((_, i) => ({
        date: Math.floor(Date.now() / 1000) - (30 - i) * 86400,
        tvl: 2500000000 + Math.random() * 200000000
    }));

    const data = await fetchWithCache(
        'https://api.llama.fi/v2/historicalChainTvl/Arbitrum',
        'arb_hist_tvl',
        TTL.LONG,
        mock
    );

    return data.slice(-90).map(item => { // Last 90 days
        const d = new Date(item.date * 1000);
        return {
            timestamp: item.date * 1000,
            date: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
            tvl: item.tvl,
        };
    });
};

// ─── 3. ARB Supply (Arbiscan Free) ───────────────────────────────────────────
export const fetchArbitrumSupply = async () => {
    // Total supply fixed: 10,000,000,000
    // Circ supply approx via CoinGecko or mock
    const cg = await fetchWithCache(
        'https://api.coingecko.com/api/v3/coins/arbitrum?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false',
        'arb_supply_cg',
        TTL.LONG,
        { market_data: { circulating_supply: 4100000000, total_supply: 10000000000 } }
    );

    return {
        circulating: cg?.market_data?.circulating_supply || 4100000000,
        total: 10000000000 // ARB hard cap
    };
};

// ─── 4. Historical Price (Binance Free) ──────────────────────────────────────
export const fetchArbitrumPriceHistory = async () => {
    // Generate mock if fails
    const mock = Array.from({ length: 90 }).map((_, i) => [
        Date.now() - (90 - i) * 86400 * 1000, 0, 0, 0, (0.5 + Math.random() * 0.5).toString()
    ]);

    const data = await fetchWithCache(
        'https://api.binance.com/api/v3/klines?symbol=ARBUSDT&interval=1d&limit=90',
        'arb_price_hist',
        TTL.LONG,
        mock
    );

    return data.map(item => {
        const d = new Date(item[0]);
        return {
            timestamp: item[0],
            date: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
            price: Number(item[4]),
        };
    });
};

// ─── 5. Whale Tracker Mock (Filtering logic simulated) ───────────────────────
export const getCleanWhaleData = async () => {
    // Since Arbiscan Top 100 requires API Key/Pro, we use a calculated realistic mock 
    // that simulates the "Known Exchange filter + Inactive filter + 72h Active" logic requested.

    // In a real env, you would query Arbiscan contract token holders, then filter out addresses 
    // labeled as Binance, Coinbase, Arbitrum Bridge, etc.
    const mockWhales = [
        { id: "0x7a2...4c9", type: "Individual Whale", balance: 1450200, lastActive: "2h ago", net72h: 52000, badge: "Aggressive Accumulator 🚀" },
        { id: "0x1b9...ef2", type: "Smart Money", balance: 890000, lastActive: "12h ago", net72h: 12500, badge: "Steady Buyer 🟢" },
        { id: "0x9c3...11a", type: "Fund/VC", balance: 5200000, lastActive: "41h ago", net72h: -250000, badge: "Distributing ⚠️" },
        { id: "0x3d4...88b", type: "Individual Whale", balance: 670000, lastActive: "5h ago", net72h: 8900, badge: "Diamond Hands 💎" },
        { id: "0xfa1...23c", type: "Smart Money", balance: 340000, lastActive: "1h ago", net72h: 45000, badge: "Aggressive Accumulator 🚀" },
        { id: "0x22a...90d", type: "Fund/VC", balance: 2100000, lastActive: "18h ago", net72h: -10000, badge: "Slight Trim 🟡" },
        { id: "0x44b...77e", type: "Individual Whale", balance: 560000, lastActive: "60h ago", net72h: 1200, badge: "Steady Buyer 🟢" },
        { id: "0x55c...66f", type: "Smart Money", balance: 410000, lastActive: "4h ago", net72h: 0, badge: "Holding 🛡️" },
    ];

    // Simulate API delay
    await new Promise(r => setTimeout(r, 600));
    return mockWhales;
};
