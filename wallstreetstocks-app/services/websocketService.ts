// services/websocketService.ts
// Real-time price streaming via FMP WebSocket
// Connects to Zustand price store for automatic UI updates

import { priceStore } from '../stores/priceStore';
import { AppState, AppStateStatus } from 'react-native';

const FMP_API_KEY = 'bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU';

// FMP WebSocket endpoint (legacy - documented with login event auth)
const WEBSOCKET_URL = 'wss://websockets.financialmodelingprep.com';

const MAX_SYMBOLS = 25; // FMP limit per connection
const RECONNECT_DELAY = 3000; // 3 seconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface WebSocketMessage {
  s: string;      // symbol
  t: number;      // timestamp
  type: string;   // 'T' = trade, 'Q' = quote, 'B' = break
  lp?: number;    // last price (trade)
  ls?: number;    // last size/volume
  ap?: number;    // ask price (quote)
  bp?: number;    // bid price (quote)
  as?: number;    // ask size
  bs?: number;    // bid size
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private subscribedSymbols: Set<string> = new Set();
  private pendingSubscriptions: Set<string> = new Set();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private status: ConnectionStatus = 'disconnected';
  private listeners: Set<(status: ConnectionStatus) => void> = new Set();
  private appStateSubscription: any = null;
  private isAuthenticated: boolean = false;

  constructor() {
    // Listen for app state changes (background/foreground)
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground - reconnect if needed
      if (this.status !== 'connected' && this.subscribedSymbols.size > 0) {
        console.log('📱 App active - reconnecting WebSocket');
        this.connect();
      }
    } else if (nextAppState === 'background') {
      // App went to background - disconnect to save battery
      console.log('📱 App background - disconnecting WebSocket');
      this.disconnect();
    }
  };

  // Connect to WebSocket
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocket already connected');
      return;
    }

    if (this.status === 'connecting') {
      console.log('🔌 WebSocket already connecting...');
      return;
    }

    this.setStatus('connecting');
    console.log('🔌 Connecting to FMP WebSocket...');

    try {
      // Use legacy WebSocket endpoint (authenticates via login event)
      this.ws = new WebSocket(WEBSOCKET_URL);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected, authenticating...');
        this.authenticate();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.setStatus('error');
      };

      this.ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
        this.isAuthenticated = false;
        this.setStatus('disconnected');
        this.stopHeartbeat();

        // Auto-reconnect if we have subscriptions
        if (this.subscribedSymbols.size > 0) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  // Authenticate with API key
  private authenticate(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const loginMessage = {
      event: 'login',
      data: {
        apiKey: FMP_API_KEY,
      },
    };

    this.ws.send(JSON.stringify(loginMessage));
    console.log('🔐 Sent authentication request to FMP WebSocket');
  }

  // Handle incoming messages
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Check for auth success
      if (message.event === 'login' && message.status === 'success') {
        console.log('✅ WebSocket authenticated');
        this.isAuthenticated = true;
        this.setStatus('connected');
        this.startHeartbeat();

        // Resubscribe to any pending symbols
        if (this.subscribedSymbols.size > 0) {
          this.resubscribeAll();
        }
        return;
      }

      // Check for auth error
      if (message.event === 'login' && message.status === 'error') {
        console.error('❌ WebSocket auth failed:', message.message);
        this.setStatus('error');
        return;
      }

      // Handle price updates
      if (message.s && (message.lp || message.bp)) {
        this.handlePriceUpdate(message as WebSocketMessage);
      }
    } catch (error) {
      // Non-JSON message or parse error
      console.warn('⚠️ WebSocket message parse error:', error);
    }
  }

  // Update price store with new price
  private handlePriceUpdate(message: WebSocketMessage): void {
    const symbol = message.s.toUpperCase();

    // Get the price (last trade price or bid price)
    const price = message.lp || message.bp;
    if (!price) return;

    // Get existing quote to preserve other fields
    const existingQuote = priceStore.getQuote(symbol);

    // Update the store (spread existing first, then override with new values)
    priceStore.setQuote({
      ...existingQuote,
      symbol,
      price,
    });

    // Log for debugging (remove in production)
    // console.log(`💹 ${symbol}: $${price}`);
  }

  // Subscribe to symbols
  subscribe(symbols: string | string[]): void {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    const normalizedSymbols = symbolArray.map(s => s.toUpperCase().trim());

    // Add to pending/subscribed sets
    normalizedSymbols.forEach(s => {
      if (!this.subscribedSymbols.has(s)) {
        this.pendingSubscriptions.add(s);
      }
    });

    // If connected and authenticated, subscribe now
    if (this.isAuthenticated && this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscriptions();
    } else {
      // Connect if not connected
      this.connect();
    }
  }

  // Send subscription request
  private sendSubscriptions(): void {
    if (this.pendingSubscriptions.size === 0) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) return;

    // Check symbol limit
    const totalSymbols = this.subscribedSymbols.size + this.pendingSubscriptions.size;
    if (totalSymbols > MAX_SYMBOLS) {
      console.warn(`⚠️ Symbol limit exceeded (${totalSymbols}/${MAX_SYMBOLS}). Trimming older subscriptions.`);
      // Remove oldest subscriptions to make room
      const toRemove = totalSymbols - MAX_SYMBOLS;
      const symbolsArray = Array.from(this.subscribedSymbols);
      for (let i = 0; i < toRemove; i++) {
        this.subscribedSymbols.delete(symbolsArray[i]);
      }
    }

    const newSymbols = Array.from(this.pendingSubscriptions);

    const subscribeMessage = {
      event: 'subscribe',
      data: {
        ticker: newSymbols.map(s => s.toLowerCase()),
      },
    };

    this.ws.send(JSON.stringify(subscribeMessage));
    console.log(`📊 Subscribed to: ${newSymbols.join(', ')}`);

    // Move pending to subscribed
    newSymbols.forEach(s => {
      this.subscribedSymbols.add(s);
      this.pendingSubscriptions.delete(s);
    });
  }

  // Resubscribe to all symbols (after reconnect)
  private resubscribeAll(): void {
    if (this.subscribedSymbols.size === 0) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) return;

    const symbols = Array.from(this.subscribedSymbols);

    const subscribeMessage = {
      event: 'subscribe',
      data: {
        ticker: symbols.map(s => s.toLowerCase()),
      },
    };

    this.ws.send(JSON.stringify(subscribeMessage));
    console.log(`📊 Resubscribed to ${symbols.length} symbols`);
  }

  // Unsubscribe from symbols
  unsubscribe(symbols: string | string[]): void {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    const normalizedSymbols = symbolArray.map(s => s.toUpperCase().trim());

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Just remove from tracking
      normalizedSymbols.forEach(s => {
        this.subscribedSymbols.delete(s);
        this.pendingSubscriptions.delete(s);
      });
      return;
    }

    const unsubscribeMessage = {
      event: 'unsubscribe',
      data: {
        ticker: normalizedSymbols.map(s => s.toLowerCase()),
      },
    };

    this.ws.send(JSON.stringify(unsubscribeMessage));
    console.log(`📊 Unsubscribed from: ${normalizedSymbols.join(', ')}`);

    normalizedSymbols.forEach(s => {
      this.subscribedSymbols.delete(s);
    });
  }

  // Disconnect WebSocket
  disconnect(): void {
    this.cancelReconnect();
    this.stopHeartbeat();
    this.isAuthenticated = false;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  // Schedule reconnection
  private scheduleReconnect(): void {
    this.cancelReconnect();

    console.log(`🔄 Reconnecting in ${RECONNECT_DELAY / 1000}s...`);
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
        // FMP might use ping/pong or we can send a subscribe refresh
        // For now, just check connection is alive
        console.log('💓 WebSocket heartbeat');
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
