// context/WebSocketContext.tsx
// React context for WebSocket real-time price streaming

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { websocketService, ConnectionStatus } from '../services/websocketService';

interface WebSocketContextValue {
  status: ConnectionStatus;
  isConnected: boolean;
  subscribe: (symbols: string | string[]) => void;
  unsubscribe: (symbols: string | string[]) => void;
  subscribedSymbols: string[];
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
  autoConnect?: boolean;
  initialSymbols?: string[];
}

export function WebSocketProvider({
  children,
  autoConnect = true,
  initialSymbols = [],
}: WebSocketProviderProps) {
  const [status, setStatus] = useState<ConnectionStatus>(websocketService.getStatus());
  const [subscribedSymbols, setSubscribedSymbols] = useState<string[]>([]);
  const initializedRef = useRef(false);

  // Listen for status changes
  useEffect(() => {
    const unsubscribe = websocketService.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return () => unsubscribe();
  }, []);

  // Update subscribed symbols periodically
  useEffect(() => {
    const updateSymbols = () => {
      setSubscribedSymbols(websocketService.getSubscribedSymbols());
    };

    // Update every 2 seconds
    const interval = setInterval(updateSymbols, 2000);
    updateSymbols();

    return () => clearInterval(interval);
  }, []);

  // Auto-connect and subscribe to initial symbols
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (autoConnect) {
      // Connect after a short delay to let app initialize
      const timeout = setTimeout(() => {
        if (initialSymbols.length > 0) {
          websocketService.subscribe(initialSymbols);
        } else {
          websocketService.connect();
        }
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [autoConnect, initialSymbols]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't destroy on unmount - keep connection alive
      // websocketService.destroy();
    };
  }, []);

  const subscribe = useCallback((symbols: string | string[]) => {
    websocketService.subscribe(symbols);
    // Update local state
    setTimeout(() => {
      setSubscribedSymbols(websocketService.getSubscribedSymbols());
    }, 100);
  }, []);

  const unsubscribe = useCallback((symbols: string | string[]) => {
    websocketService.unsubscribe(symbols);
    // Update local state
    setTimeout(() => {
      setSubscribedSymbols(websocketService.getSubscribedSymbols());
    }, 100);
  }, []);

  const value: WebSocketContextValue = {
    status,
    isConnected: status === 'connected',
    subscribe,
    unsubscribe,
    subscribedSymbols,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook to use WebSocket context
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

// Hook to subscribe to symbols when component mounts
export function useSubscribe(symbols: string | string[]) {
  const { subscribe, unsubscribe } = useWebSocket();
  const symbolsRef = useRef<string[]>([]);

  useEffect(() => {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    const validSymbols = symbolArray.filter(s => s && s.trim());

    if (validSymbols.length === 0) return;

    // Subscribe to new symbols
    subscribe(validSymbols);
    symbolsRef.current = validSymbols;

    // Unsubscribe when component unmounts
    return () => {
      // Don't unsubscribe - keep prices streaming
      // Other components might still need them
      // unsubscribe(symbolsRef.current);
    };
  }, [Array.isArray(symbols) ? symbols.join(',') : symbols, subscribe]);
}

// Hook to get real-time price with auto-subscription
export function useRealtimePrice(symbol: string) {
  const { subscribe, isConnected } = useWebSocket();

  useEffect(() => {
    if (symbol && isConnected) {
      subscribe(symbol);
    }
  }, [symbol, isConnected, subscribe]);

  // Return the price from the store (will auto-update)
  // Components should use usePrice from priceStore for the actual value
}
