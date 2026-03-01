export default async function handler(req, res) {
    // Vercel serverless function receives env vars from Vercel's Environment Variables
    const duneApiKey = process.env.VITE_DUNE_API_KEY?.trim();
    const queryId = process.env.VITE_DUNE_QUERY_ID?.trim();

    if (!duneApiKey || !queryId) {
        return res.status(500).json({ error: "Missing Dune API Keys in Vercel." });
    }

    const url = `https://api.dune.com/api/v1/query/${queryId}/results`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                "x-dune-api-key": duneApiKey
            }
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("Dune Fetch Error:", err);
            return res.status(response.status).json({ error: "Failed to fetch Dune API result" });
        }

        const data = await response.json();
        // CORS header so the frontend can read it if needed
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

        return res.status(200).json(data);
    } catch (e) {
        console.error("Dune Backend Proxy Error:", e);
        return res.status(500).json({ error: "Internal server error." });
    }
}
