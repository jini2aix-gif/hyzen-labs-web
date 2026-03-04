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

    const findTVL = (name, fallback) => {
        const chain = ds.find(c => c.name.toLowerCase() === name.toLowerCase());
        return chain && chain.tvl > 0 ? chain.tvl : fallback;
    };

    return {
        arb: findTVL('Arbitrum', 2500000000),
        op: findTVL('Optimism', 750000000),
        base: findTVL('Base', 1200000000) // Base TVL as proxy benchmark
    };
};

// ─── 2b. USD/KRW Exchange Rate (ExchangeRate-API free tier) ──────────────────
export const fetchKRWRate = async () => {
    try {
        // CoinGecko already gives us arb.krw / arb.usd — derive rate from that
        const ds = await fetchWithCache(
            'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd,krw',
            'usd_krw_rate',
            TTL.SHORT,
            { tether: { usd: 1, krw: 1350 } }
        );
        const usd = ds?.tether?.usd || 1;
        const krw = ds?.tether?.krw || 1350;
        return krw / usd; // ~1350
    } catch {
        return 1350;
    }
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

export const fetchArbitrumMonthlyPriceHistory = async () => {
    // Generate mock if fails
    const mock = Array.from({ length: 24 }).map((_, i) => [
        Date.now() - (24 - i) * 30 * 86400 * 1000, 0, 0, 0, (0.5 + Math.random() * 0.5).toString()
    ]);

    const data = await fetchWithCache(
        'https://api.binance.com/api/v3/klines?symbol=ARBUSDT&interval=1M&limit=24',
        'arb_monthly_hist',
        TTL.LONG,
        mock
    );

    return data.map(item => {
        const d = new Date(item[0]);
        return {
            timestamp: item[0],
            date: `${d.getFullYear().toString().slice(-2)}.${String(d.getMonth() + 1).padStart(2, '0')}`,
            price: Number(item[4]),
        };
    });
};

// ─── 5. Whale Tracker Mock (Filtering logic simulated) ───────────────────────
export const getCleanWhaleData = async () => {
    // Fetch from Vercel Serverless Function proxy call (Dune Analytics API)
    const url = `/api/dune?t=${Date.now()}`;

    try {
        const data = await fetchWithCache(url, 'arb_whale_data_final_v1', { cache: 'no-store' });

        if (data && data.result && data.result.rows && data.result.rows.length > 0) {
            // Map the real Dune data to the new dashboard's UI format
            return data.result.rows
                .map(row => {
                    // Dune output column names can vary based on the specific query used
                    const balance = Number(row.balance_arb || row.balance || row.current_balance || 0);
                    const increase24hPct = Number(row.increase_24h_pct || row.increase24h || row.pct_change || 0);

                    if (isNaN(balance) || (balance === 0 && increase24hPct === 0)) return null;

                    let badge = 'Holding 🛡️';
                    if (increase24hPct > 10) badge = 'Aggressive Accumulator 🚀';
                    else if (increase24hPct > 2) badge = 'Steady Buyer 🟢';
                    else if (increase24hPct < -10) badge = 'Distributing ⚠️';
                    else if (increase24hPct < -2) badge = 'Slight Trim 🟡';

                    // Normalize huge percentage values
                    let displayPct = increase24hPct;
                    if (displayPct > 100) displayPct = 100;
                    if (displayPct < -100) displayPct = -100;

                    return {
                        id: row.wallet_address || row.address || 'Unknown',
                        type: "Active Wallet",
                        balance: balance,
                        lastActive: "24h window",
                        net24hPct: displayPct,
                        badge: badge
                    };
                })
                .filter(Boolean)
                .sort((a, b) => b.net24hPct - a.net24hPct);
        } else if (data && data.error) {
            console.error("Dune Backend API error:", data.error);
        }
    } catch (e) {
        console.error("Failed to fetch from Dune proxy:", e);
    }

    // Fallback if Dune API fails or is empty
    return [];
};
