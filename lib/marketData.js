const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "NVDA", "AMZN", "TSLA"];
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const CACHE_TTL_MS = 60_000;
const MAX_SYMBOLS = 8;

let cachedResponse = null;
let cachedKey = "";

const demoCompanies = {
  AAPL: {
    name: "Apple Inc.",
    exchange: "NASDAQ NMS - Global Market",
    industry: "Technology Hardware",
    logo: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AAPL.png",
    weburl: "https://www.apple.com"
  },
  MSFT: {
    name: "Microsoft Corp.",
    exchange: "NASDAQ NMS - Global Market",
    industry: "Software",
    logo: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/MSFT.png",
    weburl: "https://www.microsoft.com"
  },
  NVDA: {
    name: "NVIDIA Corp.",
    exchange: "NASDAQ NMS - Global Market",
    industry: "Semiconductors",
    logo: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/NVDA.png",
    weburl: "https://www.nvidia.com"
  },
  AMZN: {
    name: "Amazon.com Inc.",
    exchange: "NASDAQ NMS - Global Market",
    industry: "Retail",
    logo: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AMZN.png",
    weburl: "https://www.amazon.com"
  },
  TSLA: {
    name: "Tesla Inc.",
    exchange: "NASDAQ NMS - Global Market",
    industry: "Automobiles",
    logo: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/TSLA.png",
    weburl: "https://www.tesla.com"
  }
};

const demoQuotes = {
  AAPL: { c: 212.44, d: 1.83, dp: 0.87, h: 214.19, l: 209.22, o: 210.02, pc: 210.61, t: 1772148120 },
  MSFT: { c: 486.71, d: -2.19, dp: -0.45, h: 492.31, l: 483.4, o: 489.25, pc: 488.9, t: 1772148120 },
  NVDA: { c: 163.27, d: 3.94, dp: 2.47, h: 164.8, l: 158.73, o: 159.14, pc: 159.33, t: 1772148120 },
  AMZN: { c: 231.62, d: 0.76, dp: 0.33, h: 234.08, l: 228.59, o: 230.41, pc: 230.86, t: 1772148120 },
  TSLA: { c: 284.18, d: -5.66, dp: -1.95, h: 292.55, l: 281.31, o: 289.8, pc: 289.84, t: 1772148120 }
};

const demoTargets = {
  AAPL: { targetHigh: 260, targetLow: 185, targetMean: 232.5, targetMedian: 235, lastUpdated: "2026-06-26" },
  MSFT: { targetHigh: 620, targetLow: 430, targetMean: 534, targetMedian: 540, lastUpdated: "2026-06-26" },
  NVDA: { targetHigh: 210, targetLow: 130, targetMean: 181, targetMedian: 184, lastUpdated: "2026-06-26" },
  AMZN: { targetHigh: 295, targetLow: 200, targetMean: 258, targetMedian: 260, lastUpdated: "2026-06-26" },
  TSLA: { targetHigh: 390, targetLow: 145, targetMean: 279, targetMedian: 285, lastUpdated: "2026-06-26" }
};

const demoRecommendations = {
  AAPL: [{ period: "2026-06-01", strongBuy: 13, buy: 20, hold: 12, sell: 2, strongSell: 1 }],
  MSFT: [{ period: "2026-06-01", strongBuy: 19, buy: 27, hold: 4, sell: 1, strongSell: 0 }],
  NVDA: [{ period: "2026-06-01", strongBuy: 25, buy: 31, hold: 7, sell: 1, strongSell: 0 }],
  AMZN: [{ period: "2026-06-01", strongBuy: 22, buy: 28, hold: 8, sell: 0, strongSell: 0 }],
  TSLA: [{ period: "2026-06-01", strongBuy: 7, buy: 14, hold: 18, sell: 7, strongSell: 2 }]
};

const demoNews = {
  AAPL: [
    { headline: "Analysts watch services growth and hardware refresh timing", source: "Demo brief", datetime: 1772071200 },
    { headline: "Supply chain checks point to steady demand signals", source: "Demo brief", datetime: 1771984800 }
  ],
  MSFT: [
    { headline: "Cloud and AI spending remain the central earnings focus", source: "Demo brief", datetime: 1772071200 },
    { headline: "Enterprise software demand continues to anchor estimates", source: "Demo brief", datetime: 1771984800 }
  ],
  NVDA: [
    { headline: "Data center demand keeps analyst target ranges elevated", source: "Demo brief", datetime: 1772071200 },
    { headline: "Investors weigh margins against next-generation chip ramps", source: "Demo brief", datetime: 1771984800 }
  ],
  AMZN: [
    { headline: "Retail margin gains and cloud reacceleration stay in view", source: "Demo brief", datetime: 1772071200 },
    { headline: "Ad revenue growth remains a watch item for estimates", source: "Demo brief", datetime: 1771984800 }
  ],
  TSLA: [
    { headline: "Delivery trajectory and pricing pressure divide analysts", source: "Demo brief", datetime: 1772071200 },
    { headline: "Autonomy narrative remains a key swing factor", source: "Demo brief", datetime: 1771984800 }
  ]
};

export async function getMarketData({ symbols, forceDemo = false } = {}) {
  const normalizedSymbols = parseSymbols(symbols);
  const apiKey = process.env.FINNHUB_API_KEY;
  const cacheKey = `${forceDemo ? "demo" : apiKey ? "live" : "demo"}:${normalizedSymbols.join(",")}`;

  if (cachedResponse && cachedKey === cacheKey && Date.now() - cachedResponse.cachedAt < CACHE_TTL_MS) {
    return {
      ...cachedResponse.payload,
      cache: { hit: true, ttlSeconds: Math.ceil((CACHE_TTL_MS - (Date.now() - cachedResponse.cachedAt)) / 1000) }
    };
  }

  const mode = forceDemo || !apiKey ? "demo" : "live";
  const symbolsData = mode === "live"
    ? await Promise.all(normalizedSymbols.map((symbol) => getLiveSymbolData(symbol, apiKey)))
    : normalizedSymbols.map(getDemoSymbolData);

  const payload = {
    asOf: new Date().toISOString(),
    mode,
    provider: mode === "live" ? "Finnhub" : "Demo data",
    warning: mode === "demo"
      ? "Set FINNHUB_API_KEY on the server to enable live quotes, analyst recommendations, price targets, and company news."
      : null,
    symbols: symbolsData,
    sourceDisclosure: {
      liveData: "Finnhub REST API",
      filings: "SEC EDGAR",
      crossChecks: ["Nasdaq", "Yahoo Finance", "MarketWatch"]
    }
  };

  cachedKey = cacheKey;
  cachedResponse = { payload, cachedAt: Date.now() };
  return { ...payload, cache: { hit: false, ttlSeconds: CACHE_TTL_MS / 1000 } };
}

function parseSymbols(input) {
  const raw = typeof input === "string" && input.trim() ? input : DEFAULT_SYMBOLS.join(",");
  const unique = [...new Set(raw
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(item)))];

  return (unique.length ? unique : DEFAULT_SYMBOLS).slice(0, MAX_SYMBOLS);
}

async function getLiveSymbolData(symbol, apiKey) {
  const to = formatDate(new Date());
  const from = formatDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 10));
  const [quoteResult, recommendationResult, targetResult, profileResult, newsResult] = await Promise.allSettled([
    finnhubFetch("/quote", { symbol }, apiKey),
    finnhubFetch("/stock/recommendation", { symbol }, apiKey),
    finnhubFetch("/stock/price-target", { symbol }, apiKey),
    finnhubFetch("/stock/profile2", { symbol }, apiKey),
    finnhubFetch("/company-news", { symbol, from, to }, apiKey)
  ]);

  const quote = unwrap(quoteResult, {});
  const recommendations = unwrap(recommendationResult, []);
  const target = unwrap(targetResult, {});
  const profile = unwrap(profileResult, {});
  const news = unwrap(newsResult, []);

  return buildSymbolPayload({
    symbol,
    quote,
    recommendations,
    target,
    profile,
    news: Array.isArray(news) ? news.slice(0, 3) : [],
    sourceMode: "live"
  });
}

function getDemoSymbolData(symbol) {
  const demoQuote = { ...(demoQuotes[symbol] || makeDemoQuote(symbol)), t: Math.floor(Date.now() / 1000) };
  const demoTarget = { ...(demoTargets[symbol] || makeDemoTarget(symbol)), lastUpdated: formatDate(new Date()) };
  const demoHeadlines = demoNews[symbol] || [];

  return buildSymbolPayload({
    symbol,
    quote: demoQuote,
    recommendations: demoRecommendations[symbol] || [{ period: "2026-06-01", strongBuy: 4, buy: 7, hold: 6, sell: 2, strongSell: 1 }],
    target: demoTarget,
    profile: demoCompanies[symbol] || {
      name: `${symbol} Holdings`,
      exchange: "Demo Exchange",
      industry: "Demo Sector",
      logo: "",
      weburl: ""
    },
    news: demoHeadlines.map((item, index) => ({
      ...item,
      datetime: Math.floor((Date.now() - index * 1000 * 60 * 60 * 24) / 1000)
    })),
    sourceMode: "demo"
  });
}

function buildSymbolPayload({ symbol, quote, recommendations, target, profile, news, sourceMode }) {
  const latestRecommendation = Array.isArray(recommendations) && recommendations.length
    ? recommendations[0]
    : { strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0, period: null };

  const expectation = buildExpectation({ quote, target, latestRecommendation });

  return {
    symbol,
    company: {
      name: profile.name || symbol,
      exchange: profile.exchange || "",
      industry: profile.finnhubIndustry || profile.industry || "",
      logo: profile.logo || "",
      website: profile.weburl || ""
    },
    quote: {
      price: numberOrNull(quote.c),
      change: numberOrNull(quote.d),
      changePercent: numberOrNull(quote.dp),
      open: numberOrNull(quote.o),
      high: numberOrNull(quote.h),
      low: numberOrNull(quote.l),
      previousClose: numberOrNull(quote.pc),
      timestamp: quote.t ? new Date(quote.t * 1000).toISOString() : null
    },
    expectation,
    priceTarget: {
      high: numberOrNull(target.targetHigh),
      low: numberOrNull(target.targetLow),
      mean: numberOrNull(target.targetMean),
      median: numberOrNull(target.targetMedian),
      lastUpdated: target.lastUpdated || null
    },
    recommendation: {
      period: latestRecommendation.period || null,
      strongBuy: latestRecommendation.strongBuy || 0,
      buy: latestRecommendation.buy || 0,
      hold: latestRecommendation.hold || 0,
      sell: latestRecommendation.sell || 0,
      strongSell: latestRecommendation.strongSell || 0
    },
    news: Array.isArray(news)
      ? news.slice(0, 3).map((item) => ({
        headline: item.headline || item.summary || "Market update",
        source: item.source || "News",
        url: item.url || "",
        datetime: item.datetime ? new Date(item.datetime * 1000).toISOString() : null
      }))
      : [],
    sourceMode,
    links: buildSourceLinks(symbol)
  };
}

function buildExpectation({ quote, target, latestRecommendation }) {
  const price = numberOrNull(quote.c);
  const meanTarget = numberOrNull(target.targetMean);
  const upsidePercent = price && meanTarget ? ((meanTarget - price) / price) * 100 : null;
  const strongBuy = latestRecommendation.strongBuy || 0;
  const buy = latestRecommendation.buy || 0;
  const hold = latestRecommendation.hold || 0;
  const sell = latestRecommendation.sell || 0;
  const strongSell = latestRecommendation.strongSell || 0;
  const totalVotes = strongBuy + buy + hold + sell + strongSell;
  const analystScore = totalVotes
    ? ((strongBuy * 2 + buy - sell - strongSell * 2) / (totalVotes * 2)) * 100
    : 0;
  const targetScore = upsidePercent == null ? 0 : clamp(upsidePercent * 2, -50, 50);
  const combinedScore = clamp(Math.round(analystScore * 0.62 + targetScore * 0.38), -100, 100);

  let label = "Mixed expectations";
  let tone = "neutral";

  if (combinedScore >= 45 && (upsidePercent == null || upsidePercent >= 8)) {
    label = "Expected to outperform";
    tone = "positive";
  } else if (combinedScore >= 18) {
    label = "Expected to rise";
    tone = "positive";
  } else if (combinedScore <= -28 || (upsidePercent != null && upsidePercent <= -8)) {
    label = "Expected pressure";
    tone = "negative";
  } else if (Math.abs(combinedScore) < 18) {
    label = "Watch / mixed";
    tone = "neutral";
  }

  const confidence = totalVotes >= 30 ? "High" : totalVotes >= 12 ? "Medium" : "Early";

  return {
    label,
    tone,
    score: combinedScore,
    confidence,
    upsidePercent: upsidePercent == null ? null : Number(upsidePercent.toFixed(2)),
    analystVoteTotal: totalVotes
  };
}

function buildSourceLinks(symbol) {
  const encodedSymbol = encodeURIComponent(symbol);
  return [
    { label: "Finnhub", url: `https://finnhub.io/stock/${encodedSymbol}` },
    { label: "SEC", url: `https://www.sec.gov/edgar/browse/?CIK=${encodedSymbol}&owner=exclude` },
    { label: "Nasdaq", url: `https://www.nasdaq.com/market-activity/stocks/${encodedSymbol.toLowerCase()}` },
    { label: "Yahoo Finance", url: `https://finance.yahoo.com/quote/${encodedSymbol}` },
    { label: "MarketWatch", url: `https://www.marketwatch.com/investing/stock/${encodedSymbol.toLowerCase()}` }
  ];
}

async function finnhubFetch(endpoint, params, apiKey) {
  const url = new URL(`${FINNHUB_BASE_URL}${endpoint}`);
  Object.entries({ ...params, token: apiKey }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": process.env.SEC_USER_AGENT || "MarketSignal contact@example.com"
    }
  });

  if (!response.ok) {
    throw new Error(`Finnhub ${endpoint} failed with status ${response.status}`);
  }

  return response.json();
}

function unwrap(result, fallback) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function numberOrNull(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function makeDemoQuote(symbol) {
  const seed = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const price = 80 + (seed % 240);
  const change = ((seed % 17) - 8) / 2;
  return {
    c: price,
    d: change,
    dp: Number(((change / price) * 100).toFixed(2)),
    h: price + 4.5,
    l: price - 5.2,
    o: price - change / 2,
    pc: price - change,
    t: Math.floor(Date.now() / 1000)
  };
}

function makeDemoTarget(symbol) {
  const quote = makeDemoQuote(symbol);
  return {
    targetHigh: Number((quote.c * 1.28).toFixed(2)),
    targetLow: Number((quote.c * 0.82).toFixed(2)),
    targetMean: Number((quote.c * 1.09).toFixed(2)),
    targetMedian: Number((quote.c * 1.1).toFixed(2)),
    lastUpdated: formatDate(new Date())
  };
}
