// Cache TTL constants - tuned per data type
const PRICE_CACHE_TTL = 0; // 0 = always fresh, no cache for real-time price
const WHALE_CACHE_TTL = 5 * 60 * 1000;   // 5 minutes
const TVL_CACHE_TTL = 60 * 60 * 1000;  // 1 hour  (DeFiLlama only updates daily)
const CHART_CACHE_TTL = 60 * 60 * 1000;  // 1 hour  (monthly chart doesn't change)
const BLOCKSCOUT_TTL = 5 * 60 * 1000;   // 5 minutes

// ─── Generic fetch with optional localStorage cache ──────────────────────────
const fetchWithCache = async (url, cacheKey, ttl = 0, fetchOptions = {}) => {
    // ttl === 0  →  bypass cache entirely, always fetch fresh
    if (ttl > 0) {
        try {
            const raw = localStorage.getItem(cacheKey);
            if (raw) {
                const { timestamp, data } = JSON.parse(raw);
                if (Date.now() - timestamp < ttl) {
                    return data;
                }
            }
        } catch (_) { /* ignore parse errors */ }
    }

    const response = await fetch(url, { ...fetchOptions, cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    const data = await response.json();

    if (ttl > 0) {
        try {
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
        } catch (_) { /* quota errors ignored */ }
    }

    return data;
};

// ─── 1. ARB Price & Market – always live from Binance (no cache) ─────────────
export const fetchArbitrumMarketData = async () => {
    try {
        // Binance is lightweight and has no strict rate-limit for 24hr ticker
        const [binanceData, cgData] = await Promise.all([
            fetchWithCache(
                'https://api.binance.com/api/v3/ticker/24hr?symbol=ARBUSDT',
                'arb_binance_v3',
                PRICE_CACHE_TTL   // 0 → always fetch fresh
            ),
            fetchWithCache(
                'https://api.coingecko.com/api/v3/simple/price?ids=arbitrum&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true',
                'arb_cg_v3',
                60 * 1000   // CoinGecko free tier: 1 call/minute is fine for market cap only
            )
        ]);

        return {
            priceUSD: Number(binanceData?.lastPrice) || cgData?.arbitrum?.usd || 0,
            priceChange24h: Number(binanceData?.priceChangePercent) || cgData?.arbitrum?.usd_24h_change || 0,
            marketCapUSD: cgData?.arbitrum?.usd_market_cap || 0,
            volume24hUSD: Number(binanceData?.quoteVolume) || cgData?.arbitrum?.usd_24h_vol || 0,
        };
    } catch (e) {
        console.error('fetchArbitrumMarketData failed:', e);
        // last-resort: return whatever is in CG cache
        try {
            const raw = localStorage.getItem('arb_cg_v3');
            if (raw) {
                const { data } = JSON.parse(raw);
                return {
                    priceUSD: data?.arbitrum?.usd || 0,
                    priceChange24h: data?.arbitrum?.usd_24h_change || 0,
                    marketCapUSD: data?.arbitrum?.usd_market_cap || 0,
                    volume24hUSD: data?.arbitrum?.usd_24h_vol || 0,
                };
            }
        } catch (_) { }
        return { priceUSD: 0, priceChange24h: 0, marketCapUSD: 0, volume24hUSD: 0 };
    }
};

// ─── 2. TVL – DeFiLlama (daily updates, 1-hour client cache) ─────────────────
export const fetchArbitrumTVL = async () => {
    const url = 'https://api.llama.fi/v2/historicalChainTvl/Arbitrum';
    const data = await fetchWithCache(url, 'arb_tvl_v3', TVL_CACHE_TTL);
    return data.map(item => {
        const d = new Date(item.date * 1000);
        return {
            timestamp: item.date * 1000,
            date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
            tvl: item.tvl
        };
    });
};

// ─── 3. Whale Tracker (Dune + Blockscout enrichment) ─────────────────────────
export const getWhaleTrackerData = async () => {
    // Add timestamp to bust any server-side cache on the proxy
    const url = `/api/dune?t=${Date.now()}`;
    try {
        const data = await fetchWithCache(url, 'arb_whale_v3', WHALE_CACHE_TTL, { cache: 'no-store' });

        if (!data?.result?.rows) return [];

        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const baseWhales = data.result.rows
            .map(row => ({
                id: row.wallet_address || row.address || 'Unknown',
                currentBalance: row.balance_arb || row.balance || 0,
                increase24h: row.increase_24h_pct || row.increase24h || 0,
            }))
            .sort((a, b) => b.increase24h - a.increase24h)
            .slice(0, 10);

        const enriched = await Promise.all(baseWhales.map(async (whale) => {
            try {
                const txUrl = `https://arbitrum.blockscout.com/api/v2/addresses/${whale.id}/token-transfers?token=0x912CE59144191C1204E64559FE8253a0e49E6548`;
                const txData = await fetchWithCache(txUrl, `bs_tx_${whale.id}_v3`, BLOCKSCOUT_TTL);

                let bought7d = 0, sold7d = 0;
                if (txData?.items) {
                    for (const tx of txData.items) {
                        if (new Date(tx.timestamp).getTime() < sevenDaysAgo) continue;
                        const amount = Number(tx.total?.value || 0) / 1e18;
                        const toHash = tx.to?.hash?.toLowerCase();
                        const fromHash = tx.from?.hash?.toLowerCase();
                        const id = whale.id.toLowerCase();
                        if (toHash === id) bought7d += amount;
                        if (fromHash === id) sold7d += amount;
                    }
                }

                const net = bought7d - sold7d;
                let badge = 'Steady Accumulator';
                if (sold7d === 0 && bought7d > 0) badge = 'Diamond Hands 💎';
                else if (bought7d > 500000) badge = 'Aggressive 🚀';
                else if (sold7d > bought7d) badge = 'Distributing ⚠️';
                else if (bought7d === 0 && sold7d === 0) badge = 'Dormant 💤';

                return { ...whale, bought7d, sold7d, netAccumulation7d: net, badge };
            } catch (e) {
                return { ...whale, bought7d: 0, sold7d: 0, netAccumulation7d: 0, badge: 'Data Pending ⏳' };
            }
        }));

        return enriched;
    } catch (e) {
        console.error('getWhaleTrackerData failed:', e);
        return [];
    }
};

// ─── 4. ARB Price History (Binance monthly, 1-hour cache) ─────────────────────
export const fetchArbitrumPriceHistory = async () => {
    try {
        const url = 'https://api.binance.com/api/v3/klines?symbol=ARBUSDT&interval=1M&limit=48';
        const data = await fetchWithCache(url, 'arb_price_hist_v3', CHART_CACHE_TTL);
        return data.map(item => {
            const d = new Date(item[0]);
            return {
                timestamp: item[0],
                date: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`,
                price: Number(item[4]) // Close price
            };
        });
    } catch (e) {
        console.error('fetchArbitrumPriceHistory failed:', e);
        return [];
    }
};
