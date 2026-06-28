const STATIC_QUOTES = {
  AAPL: { price: 212.44, change: 1.83, changePercent: 0.87, open: 210.02, high: 214.19, low: 209.22, previousClose: 210.61 },
  MSFT: { price: 486.71, change: -2.19, changePercent: -0.45, open: 489.25, high: 492.31, low: 483.4, previousClose: 488.9 },
  NVDA: { price: 163.27, change: 3.94, changePercent: 2.47, open: 159.14, high: 164.8, low: 158.73, previousClose: 159.33 },
  AMZN: { price: 231.62, change: 0.76, changePercent: 0.33, open: 230.41, high: 234.08, low: 228.59, previousClose: 230.86 },
  TSLA: { price: 284.18, change: -5.66, changePercent: -1.95, open: 289.8, high: 292.55, low: 281.31, previousClose: 289.84 }
};

const STATIC_COMPANIES = {
  AAPL: { name: "Apple Inc.", exchange: "NASDAQ NMS", industry: "Technology Hardware", logo: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AAPL.png" },
  MSFT: { name: "Microsoft Corp.", exchange: "NASDAQ NMS", industry: "Software", logo: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/MSFT.png" },
  NVDA: { name: "NVIDIA Corp.", exchange: "NASDAQ NMS", industry: "Semiconductors", logo: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/NVDA.png" },
  AMZN: { name: "Amazon.com Inc.", exchange: "NASDAQ NMS", industry: "Retail", logo: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AMZN.png" },
  TSLA: { name: "Tesla Inc.", exchange: "NASDAQ NMS", industry: "Automobiles", logo: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/TSLA.png" }
};

const STATIC_TARGETS = {
  AAPL: { high: 260, low: 185, mean: 232.5, median: 235 },
  MSFT: { high: 620, low: 430, mean: 534, median: 540 },
  NVDA: { high: 210, low: 130, mean: 181, median: 184 },
  AMZN: { high: 295, low: 200, mean: 258, median: 260 },
  TSLA: { high: 390, low: 145, mean: 279, median: 285 }
};

const STATIC_RECOMMENDATIONS = {
  AAPL: { period: "Latest sample", strongBuy: 13, buy: 20, hold: 12, sell: 2, strongSell: 1 },
  MSFT: { period: "Latest sample", strongBuy: 19, buy: 27, hold: 4, sell: 1, strongSell: 0 },
  NVDA: { period: "Latest sample", strongBuy: 25, buy: 31, hold: 7, sell: 1, strongSell: 0 },
  AMZN: { period: "Latest sample", strongBuy: 22, buy: 28, hold: 8, sell: 0, strongSell: 0 },
  TSLA: { period: "Latest sample", strongBuy: 7, buy: 14, hold: 18, sell: 7, strongSell: 2 }
};

export function getStaticMarketData(symbolInput) {
  const symbols = parseSymbols(symbolInput);
  const asOf = new Date().toISOString();

  return {
    asOf,
    mode: "demo",
    provider: "Static GitHub Pages preview",
    warning: "GitHub Pages cannot run the live market-data API. Deploy to Vercel, Render, Railway, or another Node host with FINNHUB_API_KEY for live data.",
    symbols: symbols.map((symbol) => buildStaticSymbol(symbol, asOf)),
    sourceDisclosure: {
      liveData: "Finnhub REST API when hosted with the Node/API backend",
      filings: "SEC EDGAR",
      crossChecks: ["Nasdaq", "Yahoo Finance", "MarketWatch"]
    },
    cache: { hit: false, ttlSeconds: 60 }
  };
}

function buildStaticSymbol(symbol, asOf) {
  const quote = STATIC_QUOTES[symbol] || makeQuote(symbol);
  const target = STATIC_TARGETS[symbol] || makeTarget(quote.price);
  const recommendation = STATIC_RECOMMENDATIONS[symbol] || {
    period: "Latest sample",
    strongBuy: 4,
    buy: 7,
    hold: 6,
    sell: 2,
    strongSell: 1
  };
  const expectation = buildExpectation({ quote, target, recommendation });

  return {
    symbol,
    company: STATIC_COMPANIES[symbol] || {
      name: `${symbol} Holdings`,
      exchange: "US listed",
      industry: "Market sample",
      logo: "",
      website: ""
    },
    quote: { ...quote, timestamp: asOf },
    expectation,
    priceTarget: { ...target, lastUpdated: formatDate(new Date()) },
    recommendation,
    news: [
      {
        headline: "Static preview is online. Connect a live API host for real-time headlines.",
        source: "GitHub Pages",
        url: "",
        datetime: asOf
      }
    ],
    sourceMode: "demo",
    links: buildSourceLinks(symbol)
  };
}

function parseSymbols(input) {
  const raw = typeof input === "string" && input.trim() ? input : "AAPL,MSFT,NVDA,AMZN,TSLA";
  return [...new Set(raw
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)))]
    .slice(0, 8);
}

function buildExpectation({ quote, target, recommendation }) {
  const upsidePercent = ((target.mean - quote.price) / quote.price) * 100;
  const totalVotes = recommendation.strongBuy + recommendation.buy + recommendation.hold + recommendation.sell + recommendation.strongSell;
  const analystScore = totalVotes
    ? ((recommendation.strongBuy * 2 + recommendation.buy - recommendation.sell - recommendation.strongSell * 2) / (totalVotes * 2)) * 100
    : 0;
  const combinedScore = clamp(Math.round(analystScore * 0.62 + clamp(upsidePercent * 2, -50, 50) * 0.38), -100, 100);

  if (combinedScore >= 45 && upsidePercent >= 8) {
    return makeExpectation("Expected to outperform", "positive", combinedScore, totalVotes, upsidePercent);
  }
  if (combinedScore >= 18) {
    return makeExpectation("Expected to rise", "positive", combinedScore, totalVotes, upsidePercent);
  }
  if (combinedScore <= -28 || upsidePercent <= -8) {
    return makeExpectation("Expected pressure", "negative", combinedScore, totalVotes, upsidePercent);
  }
  return makeExpectation("Watch / mixed", "neutral", combinedScore, totalVotes, upsidePercent);
}

function makeExpectation(label, tone, score, totalVotes, upsidePercent) {
  return {
    label,
    tone,
    score,
    confidence: totalVotes >= 30 ? "High" : totalVotes >= 12 ? "Medium" : "Early",
    upsidePercent: Number(upsidePercent.toFixed(2)),
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

function makeQuote(symbol) {
  const seed = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const price = 80 + (seed % 240);
  const change = ((seed % 17) - 8) / 2;
  return {
    price,
    change,
    changePercent: Number(((change / price) * 100).toFixed(2)),
    open: price - change / 2,
    high: price + 4.5,
    low: price - 5.2,
    previousClose: price - change
  };
}

function makeTarget(price) {
  return {
    high: Number((price * 1.28).toFixed(2)),
    low: Number((price * 0.82).toFixed(2)),
    mean: Number((price * 1.09).toFixed(2)),
    median: Number((price * 1.1).toFixed(2))
  };
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
