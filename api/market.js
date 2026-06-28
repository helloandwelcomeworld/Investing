import { getMarketData } from "../lib/marketData.js";

export default async function handler(req, res) {
  try {
    const payload = await getMarketData({
      symbols: req.query?.symbols,
      forceDemo: req.query?.demo === "1"
    });
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=90");
    res.status(200).json(payload);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Market data request failed.",
      detail: process.env.NODE_ENV === "production" ? undefined : error.message
    });
  }
}
