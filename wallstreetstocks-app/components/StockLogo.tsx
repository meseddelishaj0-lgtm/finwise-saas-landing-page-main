import React, { useState, memo } from 'react';
import { View, Image, Text, StyleSheet, Platform } from 'react-native';

// Crypto symbol to icon mapping for popular cryptocurrencies (fallback)
const CRYPTO_ICONS: { [key: string]: string } = {
  'BTC': '₿',
  'ETH': 'Ξ',
  'SOL': '◎',
  'BNB': '◆',
  'XRP': '✕',
  'ADA': '₳',
  'DOGE': 'Ð',
  'AVAX': 'A',
  'DOT': '●',
  'MATIC': '⬡',
  'LINK': '⬡',
  'LTC': 'Ł',
};

// Color mapping for crypto symbols (used for fallback background)
const CRYPTO_COLORS: { [key: string]: string } = {
  'BTC': '#F7931A',
  'ETH': '#627EEA',
  'SOL': '#9945FF',
  'BNB': '#F3BA2F',
  'XRP': '#23292F',
  'ADA': '#0033AD',
  'DOGE': '#C2A633',
  'AVAX': '#E84142',
  'DOT': '#E6007A',
  'MATIC': '#8247E5',
  'LINK': '#2A5ADA',
  'LTC': '#BFBBBB',
};

// CoinGecko ID mapping for crypto symbols (for logo fetching)
const CRYPTO_IDS: { [key: string]: string } = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'AVAX': 'avalanche-2',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'LINK': 'chainlink',
  'LTC': 'litecoin',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'SHIB': 'shiba-inu',
  'TRX': 'tron',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'XLM': 'stellar',
  'ALGO': 'algorand',
  'NEAR': 'near',
  'APT': 'aptos',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'FTM': 'fantom',
  'AAVE': 'aave',
  'MKR': 'maker',
  'CRO': 'crypto-com-chain',
  'VET': 'vechain',
  'HBAR': 'hedera-hashgraph',
  'FIL': 'filecoin',
  'ICP': 'internet-computer',
  'ETC': 'ethereum-classic',
  'BCH': 'bitcoin-cash',
  'XMR': 'monero',
};

interface StockLogoProps {
  symbol: string;
  size?: number;
  style?: any;
}

const StockLogo: React.FC<StockLogoProps> = memo(({ symbol, size = 40, style }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Normalize symbol - remove /USD suffix for crypto
  const normalizedSymbol = symbol.replace('/USD', '').replace('USD', '');
  const isCrypto = symbol.includes('/') || 
    (symbol.endsWith('USD') && symbol.length <= 10) ||
    Object.keys(CRYPTO_ICONS).includes(normalizedSymbol) ||
    Object.keys(CRYPTO_IDS).includes(normalizedSymbol);

  // Get first letter for fallback
  const firstLetter = normalizedSymbol.charAt(0).toUpperCase();
  
  // Get crypto icon if available (for fallback)
  const cryptoIcon = CRYPTO_ICONS[normalizedSymbol];
  const cryptoColor = CRYPTO_COLORS[normalizedSymbol] || '#007AFF';
  // Logo URLs
  const stockLogoUrl = `https://financialmodelingprep.com/image-stock/${normalizedSymbol}.png`;
  // CoinCap API for crypto logos (reliable and consistent)
  const cryptoLogoUrl = `https://assets.coincap.io/assets/icons/${normalizedSymbol.toLowerCase()}@2x.png`;

  // For crypto, try to load logo image with fallback to icon
  if (isCrypto) {
    return (
      <View style={[
        styles.container,
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          backgroundColor: cryptoColor + '20',
        },
        style
      ]}>
        {!imageError ? (
          <>
            <Image
              source={{ uri: cryptoLogoUrl }}
              style={[
                styles.image,
                { 
                  width: size - 4, 
                  height: size - 4, 
                  borderRadius: (size - 4) / 2,
                  opacity: imageLoaded ? 1 : 0,
                }
              ]}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              resizeMode="contain"
            />
            {/* Show fallback icon while loading */}
            {!imageLoaded && (
              <View style={[styles.fallbackOverlay, { width: size, height: size, borderRadius: size / 2, backgroundColor: 'transparent' }]}>
                <Text style={[
                  styles.cryptoIcon,
                  { 
                    fontSize: size * 0.5,
                    color: cryptoColor,
                  }
                ]}>
                  {cryptoIcon || firstLetter}
                </Text>
              </View>
            )}
          </>
        ) : (
          // Fallback to text icon if image fails
          <Text style={[
            styles.cryptoIcon,
            { 
              fontSize: size * 0.5,
              color: cryptoColor,
            }
          ]}>
            {cryptoIcon || firstLetter}
          </Text>
        )}
      </View>
    );
  }

  // For stocks, try to load the logo image
  return (
    <View style={[
      styles.container,
      { 
        width: size, 
        height: size, 
        borderRadius: size / 2,
        backgroundColor: '#F5F5F7',
      },
      style
    ]}>
      {!imageError ? (
        <>
          <Image
            source={{ uri: stockLogoUrl }}
            style={[
              styles.image,
              { 
                width: size - 2, 
                height: size - 2, 
                borderRadius: (size - 2) / 2,
                opacity: imageLoaded ? 1 : 0,
              }
            ]}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            resizeMode="cover"
          />
          {/* Show fallback while loading */}
          {!imageLoaded && (
            <View style={[styles.fallbackOverlay, { width: size, height: size, borderRadius: size / 2 }]}>
              <Text style={[styles.fallbackText, { fontSize: size * 0.4 }]}>
                {firstLetter}
              </Text>
            </View>
          )}
        </>
      ) : (
        // Fallback to first letter if image fails
        <Text style={[styles.fallbackText, { fontSize: size * 0.4 }]}>
          {firstLetter}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    backgroundColor: 'transparent',
  },
  fallbackOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
  },
  fallbackText: {
    fontWeight: '700',
    color: '#007AFF',
    includeFontPadding: false,
  },
  cryptoIcon: {
    fontWeight: '700',
    includeFontPadding: false,
  },
});

export default StockLogo;
