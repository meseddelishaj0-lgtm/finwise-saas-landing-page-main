// utils/textParser.tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';

// Regex patterns
const TICKER_REGEX = /\$([A-Za-z]{1,5})\b/g;  // $AAPL, $TSLA
const MENTION_REGEX = /@([a-zA-Z0-9_]{3,20})\b/g;  // @username
const HASHTAG_REGEX = /#([a-zA-Z0-9_]+)\b/g;  // #bullish

interface ParsedSegment {
  type: 'text' | 'ticker' | 'mention' | 'hashtag';
  value: string;
  raw: string;
}

// Parse text into segments
export function parseText(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;
  
  // Combined regex to find all special tokens
  const combinedRegex = /(\$[A-Za-z]{1,5})|(@[a-zA-Z0-9_]{3,20})|(#[a-zA-Z0-9_]+)/g;
  
  let match;
  while ((match = combinedRegex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: text.slice(lastIndex, match.index),
        raw: text.slice(lastIndex, match.index),
      });
    }
    
    const token = match[0];
    if (token.startsWith('$')) {
      segments.push({
        type: 'ticker',
        value: token.slice(1).toUpperCase(),
        raw: token,
      });
    } else if (token.startsWith('@')) {
      segments.push({
        type: 'mention',
        value: token.slice(1),
        raw: token,
      });
    } else if (token.startsWith('#')) {
      segments.push({
        type: 'hashtag',
        value: token.slice(1),
        raw: token,
      });
    }
    
    lastIndex = match.index + token.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      value: text.slice(lastIndex),
      raw: text.slice(lastIndex),
    });
  }
  
  return segments;
}

// Extract all tickers from text
export function extractTickers(text: string): string[] {
  const matches = text.match(TICKER_REGEX);
  if (!matches) return [];
  return [...new Set(matches.map(t => t.slice(1).toUpperCase()))];
}

// Extract all mentions from text
export function extractMentions(text: string): string[] {
  const matches = text.match(MENTION_REGEX);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
}

// Render parsed text with clickable links
interface RenderTextProps {
  text: string;
  style?: any;
  onTickerPress?: (ticker: string) => void;
  onMentionPress?: (username: string) => void;
  onHashtagPress?: (hashtag: string) => void;
}

export function RenderParsedText({ 
  text, 
  style,
  onTickerPress,
  onMentionPress,
  onHashtagPress,
}: RenderTextProps) {
  const segments = parseText(text);
  
  const handleTickerPress = (ticker: string) => {
    if (onTickerPress) {
      onTickerPress(ticker);
    } else {
      router.push(`/symbol/${ticker}` as any);
    }
  };
  
  const handleMentionPress = (username: string) => {
    if (onMentionPress) {
      onMentionPress(username);
    } else {
      // Navigate to user profile
      router.push(`/profile/my-profile?username=${username}`);
    }
  };
  
  const handleHashtagPress = (hashtag: string) => {
    if (onHashtagPress) {
      onHashtagPress(hashtag);
    }
  };
  
  return React.createElement(
    Text,
    { style },
    segments.map((segment, index) => {
      switch (segment.type) {
        case 'ticker':
          return React.createElement(
            Text,
            {
              key: index,
              style: styles.ticker,
              onPress: () => handleTickerPress(segment.value),
            },
            '$' + segment.value
          );
        case 'mention':
          return React.createElement(
            Text,
            {
              key: index,
              style: styles.mention,
              onPress: () => handleMentionPress(segment.value),
            },
            '@' + segment.value
          );
        case 'hashtag':
          return React.createElement(
            Text,
            {
              key: index,
              style: styles.hashtag,
              onPress: () => handleHashtagPress(segment.value),
            },
            '#' + segment.value
          );
        default:
          return React.createElement(Text, { key: index }, segment.value);
      }
    })
  );
}

const styles = StyleSheet.create({
  ticker: {
    color: '#007AFF',
    fontWeight: '600',
  },
  mention: {
    color: '#5856D6',
    fontWeight: '500',
  },
  hashtag: {
    color: '#34C759',
    fontWeight: '500',
  },
});
