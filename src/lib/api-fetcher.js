export const CACHE_DURATION = 15 * 1000; // 15 seconds

const fetchWithCache = async (url, cacheKey, options = {}) => {
    try {
        const cachedItem = localStorage.getItem(cacheKey);
        if (cachedItem) {
            const { timestamp, data } = JSON.parse(cachedItem);
            if (Date.now() - timestamp < CACHE_DURATION) {
                return data;
            }
        }
    } catch (e) {
        console.warn('Cache read error', e);
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data
            }));
        } catch (e) {
            console.warn('Cache write error', e);
        }

        return data;
    } catch (error) {
        console.error('Fetch failed for', url, error);
        // Try to return stale data if available
        try {
            const cachedItem = localStorage.getItem(cacheKey);
            if (cachedItem) {
                const { data } = JSON.parse(cachedItem);
                return data;
            }
        } catch (e) { }
        throw error;
    }
};

// 1. Price & Market Cap (Real-time Binance + CoinGecko)
export const fetchArbitrumMarketData = async () => {
    try {
        const [binanceData, cgData] = await Promise.all([
            fetchWithCache('https://api.binance.com/api/v3/ticker/24hr?symbol=ARBUSDT', 'arb_binance_data_v2'),
            fetchWithCache('https://api.coingecko.com/api/v3/simple/price?ids=arbitrum&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true', 'arb_cg_data_v2')
        ]);

        return {
            priceUSD: Number(binanceData?.lastPrice) || cgData?.arbitrum?.usd || 0,
            priceChange24h: Number(binanceData?.priceChangePercent) || cgData?.arbitrum?.usd_24h_change || 0,
            marketCapUSD: cgData?.arbitrum?.usd_market_cap || 0,
            volume24hUSD: cgData?.arbitrum?.usd_24h_vol || Number(binanceData?.quoteVolume) || 0,
        };
    } catch (e) {
        console.warn("Falling back to old coingecko method:", e);
        const data = await fetchWithCache('https://api.coingecko.com/api/v3/coins/arbitrum?localization=false&sparkline=false', 'arb_market_legacy');
        return {
            priceUSD: data.market_data.current_price.usd,
            marketCapUSD: data.market_data.market_cap.usd,
            priceChange24h: data.market_data.price_change_percentage_24h,
            volume24hUSD: data.market_data.total_volume.usd,
        };
    }
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

// 3. Whale Tracker Real Data (Dune Analytics API + Blockscout Enrichment)
export const getWhaleTrackerData = async () => {
    // Vercel Serverless Function proxy call
    const url = `/api/dune?t=${Date.now()}`;

    try {
        const data = await fetchWithCache(url, 'arb_whale_data_final_v1', { cache: 'no-store' });

        if (data && data.result && data.result.rows) {
            let baseWhales = data.result.rows.map(row => ({
                id: row.wallet_address || row.address || 'Unknown',
                currentBalance: row.balance_arb || row.balance || 0,
                increase24h: row.increase_24h_pct || row.increase24h || 0
            })).sort((a, b) => b.increase24h - a.increase24h).slice(0, 10);

            // 🌟 Enrichment: Fetch 7D On-Chain Data from Blockscout for Top 10
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

            // Execute in parallel chunks if needed, but 10 requests is usually fine.
            const enrichedWhales = await Promise.all(baseWhales.map(async (whale) => {
                try {
                    const txUrl = `https://arbitrum.blockscout.com/api/v2/addresses/${whale.id}/token-transfers?token=0x912CE59144191C1204E64559FE8253a0e49E6548`;
                    const txData = await fetchWithCache(txUrl, `arb_tx_${whale.id}_v2`); // Cache to avoid Blockscout rate-limits

                    let bought7d = 0;
                    let sold7d = 0;

                    if (txData && txData.items) {
                        txData.items.forEach(tx => {
                            const txTime = new Date(tx.timestamp).getTime();
                            if (txTime >= sevenDaysAgo && tx.total && tx.total.value) {
                                const amount = Number(tx.total.value) / 1e18; // ARB has 18 decimals
                                const isReceiver = tx.to && tx.to.hash && tx.to.hash.toLowerCase() === whale.id.toLowerCase();
                                const isSender = tx.from && tx.from.hash && tx.from.hash.toLowerCase() === whale.id.toLowerCase();

                                if (isReceiver) bought7d += amount;
                                if (isSender) sold7d += amount;
                            }
                        });
                    }

                    const netAccumulation7d = bought7d - sold7d;
                    let badge = "Steady Accumulator";
                    if (sold7d === 0 && bought7d > 0) badge = "Diamond Hands 💎";
                    else if (bought7d > 500000) badge = "Aggressive 🚀";
                    else if (sold7d > bought7d) badge = "Distributing ⚠️";
                    else if (bought7d === 0 && sold7d === 0) badge = "Dormant 💤";

                    return { ...whale, bought7d, sold7d, netAccumulation7d, badge };
                } catch (e) {
                    console.error("Blockscout Enrichment Error for", whale.id, e);
                    return { ...whale, bought7d: 0, sold7d: 0, netAccumulation7d: Number(whale.currentBalance) * (whale.increase24h / 100), badge: "Data Pending ⏳" };
                }
            }));

            return enrichedWhales;
        } else if (data && data.error) {
            console.error("Dune Backend API error:", data.error);
        }
        return [];
    } catch (e) {
        console.error("Failed to fetch from Dune/Blockscout proxy:", e);
        return [];
    }
};

// 4. Price History (Binance, Monthly)
export const fetchArbitrumPriceHistory = async () => {
    try {
        const url = 'https://api.binance.com/api/v3/klines?symbol=ARBUSDT&interval=1M&limit=48';
        const data = await fetchWithCache(url, 'arb_price_history_monthly_v1');

        return data.map(item => {
            const date = new Date(item[0]);
            return {
                timestamp: item[0],
                date: `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`,
                price: Number(item[4]) // Close price
            };
        });
    } catch (e) {
        console.error("Failed to fetch price history:", e);
        return [];
    }
};
