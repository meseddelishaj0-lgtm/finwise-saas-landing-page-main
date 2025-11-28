import { IBenefit } from "@/types";

const benefits: IBenefit[] = [
  {
    title: "Smart Analysis",
    description:
      "Take the guesswork out of managing your money. Our AI-powered analysis tool adapts to your lifestyle and helps you stay on track.",
    bullets: [
      {
        title: "Intelligent Categorization",
        description:
          "Automatically sorts your transactions for crystal-clear insights.",
        icon: undefined
      },
      {
        title: "Customizable Goals",
        description:
          "Set and track financial objectives that matter to you with AI support.",
        icon: undefined
      },
      {
        title: "Predictive Analysis",
        description:
          "Get ahead of your finances with machine learning forecasts and alerts.",
        icon: undefined
      },
    ],
    widget: String.raw`
<!-- TradingView Widget BEGIN -->
<div class="tradingview-widget-container">
  <div class="tradingview-widget-container__widget"></div>
  <div class="tradingview-widget-copyright"><a href="https://www.tradingview.com/markets/stocks-usa/" rel="noopener nofollow" target="_blank"><span class="blue-text">Stocks today</span></a><span class="trademark"> by TradingView</span></div>
  <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-hotlists.js" async>
  {
  "exchange": "US",
  "colorTheme": "dark",
  "dateRange": "12M",
  "showChart": true,
  "locale": "en",
  "largeChartUrl": "",
  "isTransparent": false,
  "showSymbolLogo": true,
  "showFloatingTooltip": false,
  "plotLineColorGrowing": "rgba(41, 98, 255, 1)",
  "plotLineColorFalling": "rgba(41, 98, 255, 1)",
  "gridLineColor": "rgba(240, 243, 250, 0)",
  "scaleFontColor": "#DBDBDB",
  "belowLineFillColorGrowing": "rgba(41, 98, 255, 0.12)",
  "belowLineFillColorFalling": "rgba(41, 98, 255, 0.12)",
  "belowLineFillColorGrowingBottom": "rgba(41, 98, 255, 0)",
  "belowLineFillColorFallingBottom": "rgba(41, 98, 255, 0)",
  "symbolActiveColor": "rgba(41, 98, 255, 0.12)",
  "width": "400",
  "height": "550"
}
  </script>
</div>
<!-- TradingView Widget END -->
`,
  },
  {
    title: "AI Stock Research",
    description:
      "Start building wealth today—no financial degree required. WallStreetStocks makes AI-driven investing simple, visual, and powerful.",
    bullets: [
      {
        title: "AI Micro-Investing",
        description:
          "Invest small amounts automatically, making it easy to grow your portfolio.",
        icon: undefined
      },
      {
        title: "Expert Portfolios",
        description:
          "Access machine-curated strategies that align with your goals and risk tolerance.",
        icon: undefined
      },
      {
        title: "Real-Time Performance",
        description:
          "Track your investments with interactive metrics and visual analytics.",
        icon: undefined
      },
    ],
    widget: String.raw`
<!-- TradingView Widget BEGIN -->
<div class="tradingview-widget-container" style="height:100%;width:100%">
  <div class="tradingview-widget-container__widget"></div>
  <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js" async>
  {
    "colorTheme": "dark",
    "backgroundColor": "#0b0b0b",
    "showSymbolLogo": true,
    "width": "100%",
    "height": "100%",
    "isTransparent": false,
    "locale": "en",
    "tabs": [
      {
        "title": "Indices",
        "symbols": [
          { "s": "FOREXCOM:SPXUSD", "d": "S&P 500" },
          { "s": "FOREXCOM:NSXUSD", "d": "NASDAQ 100" },
          { "s": "FOREXCOM:DJI", "d": "Dow Jones" },
          { "s": "INDEX:NKY", "d": "Nikkei 225" },
          { "s": "INDEX:DEU40", "d": "DAX 40" }
        ]
      },
      {
        "title": "Commodities",
        "symbols": [
          { "s": "TVC:GOLD", "d": "Gold" },
          { "s": "TVC:USOIL", "d": "WTI Crude Oil" }
        ]
      },
      {
        "title": "Forex",
        "symbols": [
          { "s": "FX:EURUSD", "d": "EUR/USD" },
          { "s": "FX:GBPUSD", "d": "GBP/USD" },
          { "s": "FX:USDJPY", "d": "USD/JPY" }
        ]
      }
    ]
  }
  </script>
</div>
<!-- TradingView Widget END -->
`,
  },
  {
    title: "Market Data",
    description:
      "Stay ahead with real-time global market coverage. WallStreetStocks brings together equities, ETFs, indices, commodities, and forex — all in one dynamic platform.",
    bullets: [
    {
      title: "Live Price Feeds",
      description:
        "Track every tick in real time across global exchanges with accurate, low-latency updates.",
    },
    {
      title: "Comprehensive Coverage",
      description:
        "Access data from equities, ETFs, commodities, futures, crypto, and currencies — all unified in one view.",
    },
    {
      title: "Actionable Insights",
      description:
        "Analyze volume, performance, and trends instantly through AI-powered analytics and visual charts.",
    },
    ],
    widget: String.raw`
<!-- TradingView Widget BEGIN -->
<div class="tradingview-widget-container" style="height:100%;width:100%">
  <div class="tradingview-widget-container__widget"></div>
  <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js" async>
  {
    "colorTheme": "dark",
    "backgroundColor": "#0b0b0b",
    "showSymbolLogo": true,
    "width": "100%",
    "height": "100%",
    "isTransparent": false,
    "locale": "en",
    "symbolsGroups": [
      {
        "name": "Indices",
        "symbols": [
          { "name": "FOREXCOM:SPXUSD", "displayName": "S&P 500" },
          { "name": "FOREXCOM:NSXUSD", "displayName": "NASDAQ 100" },
          { "name": "FOREXCOM:DJI", "displayName": "Dow Jones" }
        ]
      },
      {
        "name": "Futures",
        "symbols": [
          { "name": "TVC:GOLD", "displayName": "Gold" },
          { "name": "TVC:USOIL", "displayName": "Crude Oil" }
        ]
      },
      {
        "name": "Forex",
        "symbols": [
          { "name": "FX:EURUSD", "displayName": "EUR/USD" },
          { "name": "FX:USDJPY", "displayName": "USD/JPY" }
        ]
      }
    ]
  }
  </script>
</div>
<!-- TradingView Widget END -->
`,
  },
];

export default benefits;
