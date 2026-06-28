import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { getMarketData } from "./lib/marketData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 5173);

const app = express();

app.get("/api/market", async (req, res) => {
  try {
    const payload = await getMarketData({
      symbols: req.query.symbols,
      forceDemo: req.query.demo === "1"
    });
    res.setHeader("Cache-Control", "private, max-age=20");
    res.json(payload);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Market data request failed.",
      detail: process.env.NODE_ENV === "production" ? undefined : error.message
    });
  }
});

if (isProduction) {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);
}

app.listen(port, () => {
  console.log(`MarketSignal running at http://localhost:${port}`);
});
