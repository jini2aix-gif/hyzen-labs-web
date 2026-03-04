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

// ─── 5. Top Protocols on Arbitrum (DeFiLlama) ─────────────────────────────────
const PROTOCOL_FALLBACK = [
    { name: 'GMX', tvl: 380000000, change1d: 0.5 },
    { name: 'AAVE V3', tvl: 290000000, change1d: -0.3 },
    { name: 'Pendle', tvl: 180000000, change1d: 1.2 },
    { name: 'Radiant V2', tvl: 120000000, change1d: 0.0 },
    { name: 'Uniswap V3', tvl: 95000000, change1d: 0.8 },
    { name: 'Camelot', tvl: 60000000, change1d: -1.1 },
];

export const fetchArbitrumProtocols = async () => {
    try {
        const data = await fetchWithCache(
            'https://api.llama.fi/protocols',
            'arb_protocols_v2',
            TTL.MEDIUM,
            null
        );
        if (!data || !Array.isArray(data)) return PROTOCOL_FALLBACK;

        return data
            .filter(p => p.chains && p.chains.includes('Arbitrum') && p.tvl > 0)
            .sort((a, b) => (b.chainTvls?.Arbitrum || 0) - (a.chainTvls?.Arbitrum || 0))
            .slice(0, 6)
            .map(p => ({
                name: p.name,
                slug: p.slug,
                tvl: p.chainTvls?.Arbitrum || p.tvl || 0,
                change1d: p.change_1d || 0,
                category: p.category || 'DeFi',
            }));
    } catch {
        return PROTOCOL_FALLBACK;
    }
};

// ─── 6. Stablecoin Supply on Arbitrum (DeFiLlama) ────────────────────────
export const fetchArbitrumStablecoins = async () => {
    try {
        const data = await fetchWithCache(
            'https://stablecoins.llama.fi/stablecoins?includePrices=true',
            'arb_stablecoins_v1',
            TTL.MEDIUM,
            null
        );
        if (!data?.peggedAssets) return { total: 3200000000, top: [] };

        // Each asset has circulating amounts per chain
        let total = 0;
        const breakdown = [];

        for (const asset of data.peggedAssets) {
            const chainData = asset.chainCirculating?.Arbitrum;
            if (!chainData) continue;
            const amount = chainData.current?.peggedUSD || 0;
            if (amount > 0) {
                total += amount;
                breakdown.push({ name: asset.name, symbol: asset.symbol, amount });
            }
        }

        return {
            total,
            top: breakdown.sort((a, b) => b.amount - a.amount).slice(0, 4)
        };
    } catch {
        return {
            total: 3200000000,
            top: [
                { name: 'USDC', symbol: 'USDC', amount: 1600000000 },
                { name: 'Bridged USDT', symbol: 'USDT', amount: 900000000 },
                { name: 'DAI', symbol: 'DAI', amount: 300000000 },
                { name: 'FRAX', symbol: 'FRAX', amount: 180000000 },
            ]
        };
    }
};

// ─── 7. Top Yield Pools on Arbitrum (DeFiLlama) ──────────────────────────
export const fetchArbitrumYields = async () => {
    try {
        const data = await fetchWithCache(
            'https://yields.llama.fi/pools',
            'arb_yields_v1',
            TTL.MEDIUM,
            null
        );
        if (!data?.data) return [];

        return data.data
            .filter(p =>
                p.chain === 'Arbitrum' &&
                p.apy > 0 && p.apy < 300 && // exclude unrealistic APY
                p.tvlUsd > 1_000_000           // min $1M TVL
            )
            .sort((a, b) => b.apy - a.apy)
            .slice(0, 5)
            .map(p => ({
                project: p.project,
                symbol: p.symbol,
                apy: p.apy,
                tvlUsd: p.tvlUsd,
            }));
    } catch {
        return [];
    }
};
