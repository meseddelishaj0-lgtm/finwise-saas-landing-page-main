// services/websocketService.ts
// Real-time price streaming via Twelve Data WebSocket
// Connects to Zustand price store for automatic UI updates

import { priceStore } from '../stores/priceStore';
import { AppState, AppStateStatus } from 'react-native';

// WebSocket configuration - connects to our Railway relay server (not directly to Twelve Data)
// This allows unlimited app users with just 1 Twelve Data connection
const WEBSOCKET_URL = 'wss://wallstreetstocks-ws-server-production.up.railway.app';

const MAX_SYMBOLS = 800; // Pro plan: 1000 WS credits - maximize usage!
const RECONNECT_DELAY = 3000; // 3 seconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Twelve Data WebSocket message types
interface TwelveDataPriceMessage {
  event: 'price';
  symbol: string;
  currency?: string;
  exchange?: string;
  type?: string;
  timestamp: number;
  price: number;
  day_change?: number;
  day_change_percent?: number;
  bid?: number;
  ask?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  previous_close?: number;
  volume?: number;
}

interface TwelveDataHeartbeatMessage {
  event: 'heartbeat';
  status: string;
}

interface TwelveDataSubscribeConfirm {
  event: 'subscribe-status';
  status: string;
  success?: { symbol: string; exchange: string; type: string }[];
  fails?: { symbol: string; msg: string }[];
}

type TwelveDataMessage = TwelveDataPriceMessage | TwelveDataHeartbeatMessage | TwelveDataSubscribeConfirm;

class WebSocketService {
  private ws: WebSocket | null = null;
  private subscribedSymbols: Set<string> = new Set();
  private pendingSubscriptions: Set<string> = new Set();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private status: ConnectionStatus = 'disconnected';
  private listeners: Set<(status: ConnectionStatus) => void> = new Set();
  private appStateSubscription: any = null;
  private isConnected: boolean = false;

  constructor() {
    // Listen for app state changes (background/foreground)
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground - reconnect if needed
      if (this.status !== 'connected' && this.subscribedSymbols.size > 0) {
        this.connect();
      }
    } else if (nextAppState === 'background') {
      // App went to background - disconnect to save battery
      this.disconnect();
    }
  };

  // Connect to Twelve Data WebSocket
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.status === 'connecting') {
      return;
    }

    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(WEBSOCKET_URL);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.setStatus('connected');
        this.startHeartbeat();

        // Subscribe to pending symbols
        if (this.subscribedSymbols.size > 0 || this.pendingSubscriptions.size > 0) {
          this.resubscribeAll();
        }
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        this.setStatus('error');
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.setStatus('disconnected');
        this.stopHeartbeat();

        // Auto-reconnect if we have subscriptions
        if (this.subscribedSymbols.size > 0) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  // Handle incoming messages
  private handleMessage(data: string): void {
    try {
      const message: TwelveDataMessage = JSON.parse(data);

      // Handle heartbeat
      if (message.event === 'heartbeat') {
        return;
      }

      // Handle subscription confirmation
      if (message.event === 'subscribe-status') {
        const subMsg = message as TwelveDataSubscribeConfirm;
        if (subMsg.success && subMsg.success.length > 0) {
        }
        if (subMsg.fails && subMsg.fails.length > 0) {
        }
        return;
      }

      // Handle price updates
      if (message.event === 'price') {
        this.handlePriceUpdate(message as TwelveDataPriceMessage);
      }
    } catch (error) {
    }
  }

  // Handle real-time price update
  private handlePriceUpdate(message: TwelveDataPriceMessage): void {
    const symbol = message.symbol.toUpperCase();
    const price = message.price;

    if (!price || price <= 0) return;

    // Get existing quote to preserve other fields
    const existingQuote = priceStore.getQuote(symbol);

    // Get previous close - prefer existing value from REST API (regular session close)
    // over WebSocket's previous_close (which includes after-hours trading and gives
    // wrong change% for stocks with big after-hours moves like earnings)
    const previousClose = existingQuote?.previousClose ?? message.previous_close ?? price;

    // Always calculate change from previousClose for accuracy
    // Twelve Data's day_change/day_change_percent can use open price as reference,
    // which gives wrong values for stocks with after-hours moves (e.g. earnings)
    let change: number;
    let changePercent: number;

    if (previousClose > 0 && previousClose !== price) {
      change = price - previousClose;
      changePercent = ((price - previousClose) / previousClose) * 100;
    } else {
      change = existingQuote?.change ?? 0;
      changePercent = existingQuote?.changePercent ?? 0;
    }

    // Update the price store with all available data
    priceStore.setQuote({
      ...existingQuote,
      symbol,
      price,
      change,
      changePercent,
      previousClose,
      open: message.open ?? existingQuote?.open,
      high: message.high ?? existingQuote?.high,
      low: message.low ?? existingQuote?.low,
      volume: message.volume ?? existingQuote?.volume,
      bid: message.bid ?? existingQuote?.bid,
      ask: message.ask ?? existingQuote?.ask,
    });

    // Debug log for real-time updates (uncomment to debug)
  }

  // Subscribe to symbols
  subscribe(symbols: string | string[]): void {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    const normalizedSymbols = symbolArray.map(s => s.toUpperCase().trim()).filter(s => s);

    // Add to pending/subscribed sets
    normalizedSymbols.forEach(s => {
      if (!this.subscribedSymbols.has(s)) {
        this.pendingSubscriptions.add(s);
      }
    });

    // If connected, subscribe now
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscriptions();
    } else {
      // Connect if not connected
      this.connect();
    }
  }

  // Send subscription request to Twelve Data
  private sendSubscriptions(): void {
    if (this.pendingSubscriptions.size === 0) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Check symbol limit and actually unsubscribe old symbols if needed
    const totalSymbols = this.subscribedSymbols.size + this.pendingSubscriptions.size;
    if (totalSymbols > MAX_SYMBOLS) {
      const toRemove = totalSymbols - MAX_SYMBOLS;
      const symbolsArray = Array.from(this.subscribedSymbols);
      const symbolsToRemove = symbolsArray.slice(0, toRemove);


      // Actually send unsubscribe request to server
      if (symbolsToRemove.length > 0) {
        const unsubscribeMessage = {
          action: 'unsubscribe',
          symbols: symbolsToRemove.join(','),
        };
        this.ws.send(JSON.stringify(unsubscribeMessage));

        // Remove from tracking set
        symbolsToRemove.forEach(s => this.subscribedSymbols.delete(s));
      }
    }

    const newSymbols = Array.from(this.pendingSubscriptions);

    // Subscribe message format for our Railway relay server
    const subscribeMessage = {
      action: 'subscribe',
      symbols: newSymbols.join(','),
    };

    this.ws.send(JSON.stringify(subscribeMessage));

    // Move pending to subscribed
    newSymbols.forEach(s => {
      this.subscribedSymbols.add(s);
      this.pendingSubscriptions.delete(s);
    });
  }

  // Resubscribe to all symbols (after reconnect)
  private resubscribeAll(): void {
    const allSymbols = new Set([...this.subscribedSymbols, ...this.pendingSubscriptions]);
    if (allSymbols.size === 0) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const symbols = Array.from(allSymbols);

    const subscribeMessage = {
      action: 'subscribe',
      symbols: symbols.join(','),
    };

    this.ws.send(JSON.stringify(subscribeMessage));

    // Update tracking sets
    symbols.forEach(s => {
      this.subscribedSymbols.add(s);
      this.pendingSubscriptions.delete(s);
    });
  }

  // Unsubscribe from symbols
  unsubscribe(symbols: string | string[]): void {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    const normalizedSymbols = symbolArray.map(s => s.toUpperCase().trim());

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      normalizedSymbols.forEach(s => {
        this.subscribedSymbols.delete(s);
        this.pendingSubscriptions.delete(s);
      });
      return;
    }

    const unsubscribeMessage = {
      action: 'unsubscribe',
      symbols: normalizedSymbols.join(','),
    };

    this.ws.send(JSON.stringify(unsubscribeMessage));

    normalizedSymbols.forEach(s => {
      this.subscribedSymbols.delete(s);
    });
  }

  // Disconnect WebSocket
  disconnect(): void {
    this.cancelReconnect();
    this.stopHeartbeat();
    this.isConnected = false;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  // Schedule reconnection
  private scheduleReconnect(): void {
    this.cancelReconnect();

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, RECONNECT_DELAY);
  }

  // Cancel scheduled reconnect
  private cancelReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  // Heartbeat to keep connection alive
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Twelve Data sends heartbeats automatically, we just log ours
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Status management
  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.listeners.forEach(listener => listener(status));
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  // Listen for status changes
  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Get currently subscribed symbols
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  // Check if a symbol is subscribed
  isSubscribed(symbol: string): boolean {
    return this.subscribedSymbols.has(symbol.toUpperCase());
  }

  // Cleanup
  destroy(): void {
    this.disconnect();
    this.subscribedSymbols.clear();
    this.pendingSubscriptions.clear();
    this.listeners.clear();

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();

// Export type for status
export type { ConnectionStatus };
