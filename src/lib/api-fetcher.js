/**
 * API Fetcher – cache TTL tuned to each provider's actual update frequency
 *
 * Provider limits (as of 2025):
 *   Binance      – /ticker/24hr   : near real-time, no strict rate-limit for public endpoints
 *   CoinGecko    – free tier      : ~30 calls/min, price updates every ~60 s
 *   DeFiLlama    – /historicalChainTvl : daily snapshot only (updates ~once per day)
 *   Blockscout   – public API     : best-effort, no hard limit but be polite (~1 req/5 min per address)
 *   Binance klines (monthly)      : candle data only changes at month boundary
 */

// ─── Cache TTL constants (milliseconds) ─────────────────────────────────────
const TTL = {
    PRICE: 0,                    // 0 = bypass cache entirely → always fresh from Binance
    MARKET_CAP: 60 * 1000,            // 1 min  (CoinGecko free tier)
    TVL: 24 * 60 * 60 * 1000,  // 24 h   (DeFiLlama updates once per day)
    WHALE: 5 * 60 * 1000,       // 5 min  (Dune query, reasonable polling)
    BLOCKSCOUT: 5 * 60 * 1000,       // 5 min  (per-address Blockscout)
    PRICE_HIST: 24 * 60 * 60 * 1000,  // 24 h   (monthly candles → only change at month close)
};

// ─── Refresh intervals in the dashboard ─────────────────────────────────────
export const REFRESH = {
    PRICE: 20 * 1000,              // 20 s  → ARB Price + 24h change (Binance, no cache)
    SLOW: 24 * 60 * 60 * 1000,   // 24 h  → TVL chart, price-history chart (DeFiLlama / Binance monthly)
    WHALE: 5 * 60 * 1000,        // 5 min → Whale tracker
};

// ─── Core fetch helper ───────────────────────────────────────────────────────
const fetchWithCache = async (url, cacheKey, ttl = 0, fetchOptions = {}) => {
    if (ttl > 0) {
        try {
            const raw = localStorage.getItem(cacheKey);
            if (raw) {
                const { timestamp, data } = JSON.parse(raw);
                if (Date.now() - timestamp < ttl) return data;
            }
        } catch (_) { /* ignore */ }
    }

    const res = await fetch(url, { ...fetchOptions, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const data = await res.json();

    if (ttl > 0) {
        try {
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
        } catch (_) { /* quota errors ignored */ }
    }

    return data;
};

// ─── 1. ARB Price & Market Data ──────────────────────────────────────────────
//   • priceUSD / priceChange24h → Binance (no cache, always live)
//   • marketCapUSD / volume24h  → CoinGecko (1-min cache)
export const fetchArbitrumMarketData = async () => {
    try {
        const [binance, cg] = await Promise.all([
            fetchWithCache(
                'https://api.binance.com/api/v3/ticker/24hr?symbol=ARBUSDT',
                'arb_binance_v4',
                TTL.PRICE           // 0 → bypass cache
            ),
            fetchWithCache(
                'https://api.coingecko.com/api/v3/simple/price?ids=arbitrum&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true',
                'arb_cg_v4',
                TTL.MARKET_CAP      // 1-min cache
            ),
        ]);

        return {
            priceUSD: Number(binance?.lastPrice) || cg?.arbitrum?.usd || 0,
            priceChange24h: Number(binance?.priceChangePercent) || cg?.arbitrum?.usd_24h_change || 0,
            marketCapUSD: cg?.arbitrum?.usd_market_cap || 0,
            volume24hUSD: Number(binance?.quoteVolume) || cg?.arbitrum?.usd_24h_vol || 0,
        };
    } catch (e) {
        console.error('fetchArbitrumMarketData failed:', e);
        // fallback: stale CG cache
        try {
            const raw = localStorage.getItem('arb_cg_v4');
            if (raw) {
                const { data: cg } = JSON.parse(raw);
                return {
                    priceUSD: cg?.arbitrum?.usd || 0,
                    priceChange24h: cg?.arbitrum?.usd_24h_change || 0,
                    marketCapUSD: cg?.arbitrum?.usd_market_cap || 0,
                    volume24hUSD: cg?.arbitrum?.usd_24h_vol || 0,
                };
            }
        } catch (_) { }
        return { priceUSD: 0, priceChange24h: 0, marketCapUSD: 0, volume24hUSD: 0 };
    }
};

// ─── 2. TVL – DeFiLlama (24-h cache, data updates once per day) ──────────────
export const fetchArbitrumTVL = async () => {
    const data = await fetchWithCache(
        'https://api.llama.fi/v2/historicalChainTvl/Arbitrum',
        'arb_tvl_v4',
        TTL.TVL
    );
    return data.map(item => {
        const d = new Date(item.date * 1000);
        return {
            timestamp: item.date * 1000,
            date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
            tvl: item.tvl,
        };
    });
};

// ─── 3. Whale Tracker (Dune + Blockscout, 5-min cache) ───────────────────────
export const getWhaleTrackerData = async () => {
    try {
        const data = await fetchWithCache(
            `/api/dune?t=${Date.now()}`,
            'arb_whale_v4',
            TTL.WHALE,
            { cache: 'no-store' }
        );

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
                const txData = await fetchWithCache(txUrl, `bs_tx_${whale.id}_v4`, TTL.BLOCKSCOUT);

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
            } catch (_) {
                return { ...whale, bought7d: 0, sold7d: 0, netAccumulation7d: 0, badge: 'Data Pending ⏳' };
            }
        }));

        return enriched;
    } catch (e) {
        console.error('getWhaleTrackerData failed:', e);
        return [];
    }
};

// ─── 4. ARB Price History – Binance monthly klines (24-h cache) ───────────────
export const fetchArbitrumPriceHistory = async () => {
    try {
        const data = await fetchWithCache(
            'https://api.binance.com/api/v3/klines?symbol=ARBUSDT&interval=1M&limit=48',
            'arb_price_hist_v4',
            TTL.PRICE_HIST
        );
        return data.map(item => {
            const d = new Date(item[0]);
            return {
                timestamp: item[0],
                date: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`,
                price: Number(item[4]),   // close price
            };
        });
    } catch (e) {
        console.error('fetchArbitrumPriceHistory failed:', e);
        return [];
    }
};
