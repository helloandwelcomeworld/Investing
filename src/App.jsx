import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Gauge,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import { getStaticMarketData } from "./staticMarketData.js";

const DEFAULT_SYMBOLS = "AAPL, MSFT, NVDA, AMZN, TSLA";
const REFRESH_SECONDS = 60;

export default function App() {
  const [symbolInput, setSymbolInput] = useState(DEFAULT_SYMBOLS);
  const [activeSymbols, setActiveSymbols] = useState(DEFAULT_SYMBOLS);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_SECONDS);

  const endpoint = useMemo(() => `api/market?symbols=${encodeURIComponent(activeSymbols)}`, [activeSymbols]);

  async function loadMarketData({ quiet = false } = {}) {
    if (!quiet) {
      setStatus("loading");
    } else {
      setStatus("refreshing");
    }
    setError("");

    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }
      const payload = await response.json();
      setData(payload);
      setCountdown(REFRESH_SECONDS);
      setStatus("ready");
    } catch (requestError) {
      setData(getStaticMarketData(activeSymbols));
      setCountdown(REFRESH_SECONDS);
      setStatus("ready");
      setError("");
    }
  }

  useEffect(() => {
    loadMarketData();
  }, [endpoint]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          loadMarketData({ quiet: true });
          return REFRESH_SECONDS;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, endpoint]);

  const isDemo = data?.mode === "demo";
  const symbols = data?.symbols || [];
  const marketBreadth = getMarketBreadth(symbols);

  function submitSymbols(event) {
    event.preventDefault();
    const cleaned = symbolInput
      .split(",")
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean)
      .join(", ");

    if (cleaned) {
      setActiveSymbols(cleaned);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <CircleDollarSign size={25} />
          </div>
          <div>
            <p className="eyebrow">MarketSignal</p>
            <h1>Live investing expectations</h1>
          </div>
        </div>

        <form className="symbol-form" onSubmit={submitSymbols}>
          <Search size={18} />
          <input
            aria-label="Stock symbols"
            value={symbolInput}
            onChange={(event) => setSymbolInput(event.target.value)}
            placeholder="AAPL, MSFT, NVDA"
          />
          <button type="submit">
            <BarChart3 size={17} />
            Track
          </button>
        </form>
      </header>

      <main className="dashboard">
        <section className="status-strip" aria-label="Market status">
          <MetricTile
            icon={<Activity size={20} />}
            label="Feed"
            value={isDemo ? "Demo mode" : "Live API"}
            detail={isDemo ? "Add FINNHUB_API_KEY" : "Finnhub REST feed"}
            tone={isDemo ? "warning" : "positive"}
          />
          <MetricTile
            icon={<Gauge size={20} />}
            label="Expectation breadth"
            value={`${marketBreadth.positive}/${marketBreadth.total}`}
            detail="Stocks with positive consensus"
            tone={marketBreadth.positive >= Math.ceil(marketBreadth.total / 2) ? "positive" : "neutral"}
          />
          <MetricTile
            icon={<ShieldCheck size={20} />}
            label="Trusted references"
            value="5/site"
            detail="SEC, Nasdaq, Yahoo, MarketWatch, Finnhub"
            tone="neutral"
          />
          <MetricTile
            icon={<TimerReset size={20} />}
            label="Refresh"
            value={autoRefresh ? `${countdown}s` : "Paused"}
            detail={formatDateTime(data?.asOf)}
            tone="neutral"
          />
        </section>

        <section className="toolbar" aria-label="Dashboard controls">
          <div className="feed-note">
            {isDemo ? <Sparkles size={18} /> : <CheckCircle2 size={18} />}
            <span>{data?.warning || "Live quote, recommendation, target, and news data is flowing through the server proxy."}</span>
          </div>

          <div className="toolbar-actions">
            <label className="toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
              />
              <span>Auto</span>
            </label>
            <button className="icon-button" onClick={() => loadMarketData({ quiet: true })} aria-label="Refresh market data">
              <RefreshCw size={18} className={status === "refreshing" ? "spin" : ""} />
            </button>
          </div>
        </section>

        {status === "error" ? (
          <div className="error-panel" role="alert">
            <strong>Market feed unavailable</strong>
            <span>{error}</span>
          </div>
        ) : null}

        <section className="stock-grid" aria-label="Tracked stocks">
          {status === "loading" && !symbols.length
            ? Array.from({ length: 5 }).map((_, index) => <SkeletonCard key={index} />)
            : symbols.map((stock) => <StockCard stock={stock} key={stock.symbol} />)}
        </section>

        <section className="source-band" aria-label="Data disclosure">
          <div>
            <h2>Source policy</h2>
            <p>
              The app avoids browser-side scraping. It pulls live market expectations through a server API,
              caches briefly to respect provider limits, and links to trusted public pages for independent review.
            </p>
          </div>
          <p className="disclaimer">
            Educational information only. This dashboard is not financial advice, a recommendation, or a trading signal.
          </p>
        </section>
      </main>
    </div>
  );
}

function MetricTile({ icon, label, value, detail, tone }) {
  return (
    <article className={`metric-tile ${tone}`}>
      <div className="metric-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  );
}

function StockCard({ stock }) {
  const changePositive = (stock.quote.changePercent || 0) >= 0;
  const ToneIcon = stock.expectation.tone === "negative" ? TrendingDown : TrendingUp;
  const ChangeIcon = changePositive ? ArrowUpRight : ArrowDownRight;

  return (
    <article className={`stock-card ${stock.expectation.tone}`}>
      <div className="stock-header">
        <div className="stock-title">
          <Logo stock={stock} />
          <div>
            <div className="symbol-line">
              <h2>{stock.symbol}</h2>
              <span>{stock.company.exchange || "US listed"}</span>
            </div>
            <p>{stock.company.name}</p>
          </div>
        </div>
        <div className={`signal-pill ${stock.expectation.tone}`}>
          <ToneIcon size={16} />
          <span>{stock.expectation.label}</span>
        </div>
      </div>

      <div className="price-row">
        <div>
          <span className="field-label">Last price</span>
          <strong>{formatMoney(stock.quote.price)}</strong>
        </div>
        <div className={`change ${changePositive ? "up" : "down"}`}>
          <ChangeIcon size={18} />
          <span>{formatSigned(stock.quote.change)} ({formatSigned(stock.quote.changePercent)}%)</span>
        </div>
      </div>

      <DayRange quote={stock.quote} />

      <div className="analysis-grid">
        <div>
          <span className="field-label">Expected upside</span>
          <strong>{formatPercent(stock.expectation.upsidePercent)}</strong>
        </div>
        <div>
          <span className="field-label">Confidence</span>
          <strong>{stock.expectation.confidence}</strong>
        </div>
        <div>
          <span className="field-label">Analyst votes</span>
          <strong>{stock.expectation.analystVoteTotal}</strong>
        </div>
      </div>

      <RecommendationBar recommendation={stock.recommendation} />
      <TargetRange target={stock.priceTarget} price={stock.quote.price} />

      <div className="news-list">
        {stock.news.length ? stock.news.map((item, index) => (
          <a href={item.url || stock.links[0].url} target="_blank" rel="noreferrer" key={`${stock.symbol}-${index}`}>
            <span>{item.source}</span>
            <strong>{item.headline}</strong>
          </a>
        )) : (
          <p>No recent headlines returned for this symbol.</p>
        )}
      </div>

      <div className="link-row">
        {stock.links.map((link) => (
          <a href={link.url} target="_blank" rel="noreferrer" key={link.label}>
            {link.label}
            <ExternalLink size={13} />
          </a>
        ))}
      </div>
    </article>
  );
}

function RecommendationBar({ recommendation }) {
  const segments = [
    { key: "strongBuy", label: "Strong buy", className: "strong-buy" },
    { key: "buy", label: "Buy", className: "buy" },
    { key: "hold", label: "Hold", className: "hold" },
    { key: "sell", label: "Sell", className: "sell" },
    { key: "strongSell", label: "Strong sell", className: "strong-sell" }
  ];
  const total = segments.reduce((sum, segment) => sum + (recommendation[segment.key] || 0), 0);

  return (
    <div className="recommendation">
      <div className="section-label">
        <span>Analyst consensus</span>
        <span>{recommendation.period || "Latest"}</span>
      </div>
      <div className="stacked-bar" aria-label="Analyst recommendation mix">
        {segments.map((segment) => {
          const value = recommendation[segment.key] || 0;
          const width = total ? Math.max((value / total) * 100, value ? 4 : 0) : 0;
          return (
            <span
              key={segment.key}
              className={segment.className}
              style={{ width: `${width}%` }}
              title={`${segment.label}: ${value}`}
            />
          );
        })}
      </div>
      <div className="legend">
        {segments.map((segment) => (
          <span key={segment.key}>
            <i className={segment.className} />
            {recommendation[segment.key] || 0}
          </span>
        ))}
      </div>
    </div>
  );
}

function TargetRange({ target, price }) {
  const values = [target.low, target.high, target.mean, price].filter((value) => value != null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const currentLeft = ((price - min) / spread) * 100;
  const meanLeft = ((target.mean - min) / spread) * 100;

  return (
    <div className="target-range">
      <div className="section-label">
        <span>Price target range</span>
        <span>{target.lastUpdated || "Latest"}</span>
      </div>
      <div className="range-track">
        <span className="range-fill" />
        {price != null ? <span className="range-marker current" style={{ left: `${clamp(currentLeft, 0, 100)}%` }} title="Current price" /> : null}
        {target.mean != null ? <span className="range-marker mean" style={{ left: `${clamp(meanLeft, 0, 100)}%` }} title="Mean target" /> : null}
      </div>
      <div className="range-values">
        <span>{formatMoney(target.low)}</span>
        <strong>{formatMoney(target.mean)}</strong>
        <span>{formatMoney(target.high)}</span>
      </div>
    </div>
  );
}

function DayRange({ quote }) {
  const low = quote.low;
  const high = quote.high;
  const price = quote.price;
  const position = low != null && high != null && price != null ? ((price - low) / (high - low || 1)) * 100 : 50;

  return (
    <div className="day-range">
      <div className="section-label">
        <span>Day range</span>
        <span>{formatDateTime(quote.timestamp)}</span>
      </div>
      <div className="range-track compact">
        <span className="range-fill day" />
        <span className="range-marker current" style={{ left: `${clamp(position, 0, 100)}%` }} />
      </div>
      <div className="range-values">
        <span>{formatMoney(low)}</span>
        <strong>{formatMoney(price)}</strong>
        <span>{formatMoney(high)}</span>
      </div>
    </div>
  );
}

function Logo({ stock }) {
  if (stock.company.logo) {
    return <img src={stock.company.logo} alt="" className="stock-logo" />;
  }

  return <div className="stock-logo fallback">{stock.symbol.slice(0, 2)}</div>;
}

function SkeletonCard() {
  return (
    <article className="stock-card skeleton">
      <span />
      <span />
      <span />
      <span />
    </article>
  );
}

function getMarketBreadth(symbols) {
  const total = symbols.length || 0;
  const positive = symbols.filter((stock) => stock.expectation.tone === "positive").length;
  return { total, positive };
}

function formatMoney(value) {
  if (value == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value > 100 ? 2 : 3
  }).format(value);
}

function formatSigned(value) {
  if (value == null) return "N/A";
  return `${value >= 0 ? "+" : ""}${Number(value).toFixed(2)}`;
}

function formatPercent(value) {
  if (value == null) return "N/A";
  return `${value >= 0 ? "+" : ""}${Number(value).toFixed(1)}%`;
}

function formatDateTime(value) {
  if (!value) return "Waiting";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
