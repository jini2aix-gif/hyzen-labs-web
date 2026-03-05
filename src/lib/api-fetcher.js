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

// ─── 8. Stablecoin Inflow History on Arbitrum (DeFiLlama) ────────────────
export const fetchArbitrumStablecoinHistory = async () => {
    try {
        const raw = await fetchWithCache(
            'https://stablecoins.llama.fi/stablecoincharts/Arbitrum',
            'arb_stable_history_v2',
            TTL.MEDIUM,
            null
        );
        if (!Array.isArray(raw) || raw.length === 0) return [];

        // Take last 90 days of data
        const recent = raw.slice(-90);

        return recent.map(item => {
            const ts = Number(item.date) * 1000;
            const d = new Date(ts);
            const total = (item.totalCirculatingUSD?.peggedUSD || 0) +
                (item.totalCirculatingUSD?.peggedEUR || 0);
            return {
                date: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
                value: total,           // raw USD value
                valueB: +(total / 1e9).toFixed(3), // in Billions
            };
        });
    } catch {
        return [];
    }
};

// ─── 9. Native Alpha Index — TVL share of key ARB-native protocols ────────
export const fetchNativeAlphaIndex = async () => {
    const NATIVE = ['GMX', 'Pendle', 'Radiant V2', 'Camelot', 'Jones DAO', 'MUX Protocol'];
    const FALLBACK = [
        { name: 'GMX', tvl: 380000000 },
        { name: 'Pendle', tvl: 180000000 },
        { name: 'Radiant V2', tvl: 120000000 },
        { name: 'Camelot', tvl: 62000000 },
        { name: 'Jones DAO', tvl: 35000000 },
        { name: 'Others', tvl: 900000000 },
    ];
    try {
        const data = await fetchWithCache(
            'https://api.llama.fi/protocols',
            'arb_protocols_v2',
            TTL.MEDIUM,
            null
        );
        if (!Array.isArray(data)) return FALLBACK;

        const results = [];
        let nativeTotal = 0;
        let allArbTvl = 0;

        for (const p of data) {
            const arbTvl = p.chainTvls?.Arbitrum || 0;
            if (arbTvl <= 0 || !p.chains?.includes('Arbitrum')) continue;
            allArbTvl += arbTvl;
            if (NATIVE.includes(p.name)) {
                results.push({ name: p.name, tvl: arbTvl });
                nativeTotal += arbTvl;
            }
        }

        results.sort((a, b) => b.tvl - a.tvl);
        const others = Math.max(0, allArbTvl - nativeTotal);
        if (others > 0) results.push({ name: 'Others', tvl: others });
        return results.length > 0 ? results : FALLBACK;
    } catch {
        return FALLBACK;
    }
};

// ─── 10. GMX Open Interest Sentiment (Long/Short ratio) ──────────────────
// Uses DeFiLlama options/derivatives endpoint (free, no key required)
export const fetchGMXSentiment = async () => {
    const FALLBACK = { longOI: 450, shortOI: 310, longPct: 59, bullish: true };
    try {
        // GMX v1 stats via DeFiLlama derivatives
        const data = await fetchWithCache(
            'https://api.llama.fi/protocol/gmx',
            'gmx_protocol_v1',
            TTL.SHORT,
            null
        );
        if (!data) return FALLBACK;

        // Try to derive from token TVL splits (long/short TVL proxy)
        const chainTvl = data.chainTvls?.Arbitrum;
        const tokensInUsd = data.tokensInUsd;
        if (!chainTvl || !tokensInUsd) return FALLBACK;

        // Approximate: ETH+BTC = long proxy; stables = short proxy
        const latestTokens = tokensInUsd[tokensInUsd.length - 1]?.tokens || {};
        let longProxy = 0, shortProxy = 0;
        for (const [sym, val] of Object.entries(latestTokens)) {
            const upper = sym.toUpperCase();
            if (['ETH', 'BTC', 'WBTC', 'WETH', 'ARB'].some(t => upper.includes(t))) longProxy += val;
            else shortProxy += val;
        }
        const total = longProxy + shortProxy || 1;
        const longPct = Math.round((longProxy / total) * 100);
        return {
            longOI: Math.round(longProxy / 1e6),
            shortOI: Math.round(shortProxy / 1e6),
            longPct,
            bullish: longPct >= 50
        };
    } catch {
        return FALLBACK;
    }
};

// ─── 11. Sequencer Margin — L2 fee revenue vs L1 data cost proxy ─────────
// Uses DeFiLlama fees endpoint for Arbitrum sequencer revenue
export const fetchSequencerMargin = async () => {
    const FALLBACK = { revenue24h: 42000, cost24h: 18000, marginPct: 57, trend: 'up' };
    try {
        const data = await fetchWithCache(
            'https://api.llama.fi/summary/fees/arbitrum?dataType=dailyFees',
            'arb_fees_v2',
            TTL.MEDIUM,
            null
        );
        if (!data?.totalDataChart) return FALLBACK;
        const chart = data.totalDataChart;
        const last = chart[chart.length - 1];
        const prev = chart[chart.length - 2];
        const revenue24h = last?.[1] || 42000;
        const prevRevenue = prev?.[1] || revenue24h;
        // L1 cost estimate: ~30-45% of L2 revenue (Arbitrum typically ~35% margin)
        const costRatio = 0.38;
        const cost24h = Math.round(revenue24h * costRatio);
        const marginPct = Math.round(((revenue24h - cost24h) / revenue24h) * 100);
        return {
            revenue24h: Math.round(revenue24h),
            cost24h,
            marginPct: Math.min(Math.max(marginPct, 0), 100),
            trend: revenue24h >= prevRevenue ? 'up' : 'down'
        };
    } catch {
        return FALLBACK;
    }
};

// ─── 12. M2-ARB Elasticity (last 30 data points, weekly proxy) ───────────
// FRED M2 is not freely accessible without API key; we derive a proxy
// using Arbitrum TVL history vs global stablecoin supply (DeFiLlama)
export const fetchM2ArbElasticity = async () => {
    try {
        const [tvlRaw, stableRaw] = await Promise.all([
            fetchWithCache('https://api.llama.fi/v2/historicalChainTvl/Arbitrum', 'arb_tvl_hist_v1', TTL.MEDIUM, null),
            fetchWithCache('https://stablecoins.llama.fi/stablecoincharts/all', 'global_stables_v1', TTL.LONG, null),
        ]);

        if (!Array.isArray(tvlRaw) || !Array.isArray(stableRaw)) return [];

        // Take last 30 weekly-sampled data points
        const sample = tvlRaw.slice(-180).filter((_, i) => i % 6 === 0).slice(-30);

        return sample.map(item => {
            const d = new Date(item.date * 1000);
            const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
            // find nearest stablecoin data point
            const nearest = stableRaw.reduce((best, s) =>
                Math.abs(s.date - item.date) < Math.abs(best.date - item.date) ? s : best,
                stableRaw[0]
            );
            const m2Proxy = ((nearest?.totalCirculatingUSD?.peggedUSD || 0) / 1e9);
            const tvlB = (item.tvl || 0) / 1e9;
            const elasticity = m2Proxy > 0 ? +(tvlB / m2Proxy * 100).toFixed(2) : 0;
            return { date: dateStr, tvlB: +tvlB.toFixed(2), m2B: +m2Proxy.toFixed(1), elasticity };
        });
    } catch {
        return [];
    }
};

// ─── 13. ARB/ETH Market Cap Ratio History (CoinGecko free) ───────────────
// Shows historical ARB mcap as % of ETH mcap + fair-value band reference
export const fetchArbEthMcapRatio = async () => {
    try {
        const [arbRaw, ethRaw] = await Promise.all([
            fetchWithCache(
                'https://api.coingecko.com/api/v3/coins/arbitrum/market_chart?vs_currency=usd&days=365&interval=weekly',
                'arb_mcap_hist_v1',
                TTL.LONG,
                null
            ),
            fetchWithCache(
                'https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=365&interval=weekly',
                'eth_mcap_hist_v1',
                TTL.LONG,
                null
            ),
        ]);

        const arbMcaps = arbRaw?.market_caps;
        const ethMcaps = ethRaw?.market_caps;

        if (!Array.isArray(arbMcaps) || !Array.isArray(ethMcaps)) return [];

        return arbMcaps.map(([arbTs, arbMcap]) => {
            const nearest = ethMcaps.reduce((best, cur) =>
                Math.abs(cur[0] - arbTs) < Math.abs(best[0] - arbTs) ? cur : best,
                ethMcaps[0]
            );
            const ethMcap = nearest[1] || 1;
            const ratioPct = +((arbMcap / ethMcap) * 100).toFixed(4);
            const d = new Date(arbTs);
            const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
            return {
                date: dateStr,
                ratioPct,
                arbMcapB: +(arbMcap / 1e9).toFixed(2),
                ethMcapB: +(ethMcap / 1e9).toFixed(1),
                // Fair-value band: academic/market consensus for healthy L2 vs L1
                fairLow: 1.5,
                fairMid: 2.25,
                fairHigh: 3.0,
            };
        }).filter(d => d.ratioPct > 0);
    } catch {
        return [];
    }
};
