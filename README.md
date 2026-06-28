# MarketSignal

A publishable investing dashboard for live market expectations. The frontend shows quote movement, analyst recommendation mix, target-price upside/downside, recent headlines, and trusted reference links for each ticker.

## Data sources

- Live data mode uses the Finnhub REST API for quotes, recommendation trends, price targets, company profiles, and company news.
- Source links point users to Finnhub, SEC EDGAR, Nasdaq, Yahoo Finance, and MarketWatch for independent review.
- Without `FINNHUB_API_KEY`, the dashboard runs in clearly labeled demo mode so the site can still be designed, tested, and deployed safely.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Add your Finnhub key to `.env`:

```bash
FINNHUB_API_KEY=your_key_here
```

Then open `http://localhost:5173`.

## Publish Permanently

For a public site that works for anyone on Chrome, Safari, Firefox, Edge, iOS, Android, Windows, and macOS, deploy it to a real hosting provider instead of relying on a temporary tunnel.

### Vercel

1. Import this folder as a Vercel project.
2. Set `FINNHUB_API_KEY` in Project Settings > Environment Variables.
3. Deploy. The included `/api/market.js` serverless route keeps the key out of the browser.

CLI option after logging in:

```bash
npx vercel --prod
```

### Render, Railway, or any Node host

1. Build command: `npm install && npm run build`
2. Start command: `npm start`
3. Set `FINNHUB_API_KEY` in the host environment.

## Temporary Public Preview

Cloudflare quick tunnels are useful for short-lived previews:

```bash
cloudflared tunnel --protocol http2 --url http://localhost:5173
```

They are not permanent hosting. The link changes when the tunnel restarts and stops working if the computer sleeps, shuts down, or loses internet.

## Notes

- The server caches responses for 60 seconds to avoid excessive provider calls.
- The UI refreshes once per minute by default.
- This is educational information only and is not financial advice.
