// utils/textParser.ts
// Parse $TICKER and @username mentions from text

export interface ParsedText {
  tickers: string[];
  mentions: string[];
  formattedText: string;
}

// Extract all $TICKER mentions from text
export function extractTickers(text: string): string[] {
  const tickerRegex = /\$([A-Za-z]{1,5})\b/g;
  const matches = text.match(tickerRegex) || [];
  return [...new Set(matches.map(m => m.substring(1).toUpperCase()))];
}

// Extract all @username mentions from text
export function extractMentions(text: string): string[] {
  const mentionRegex = /@([A-Za-z0-9_]{1,30})\b/g;
  const matches = text.match(mentionRegex) || [];
  return [...new Set(matches.map(m => m.substring(1).toLowerCase()))];
}

// Parse text and return tickers, mentions, and formatted text
export function parseText(text: string): ParsedText {
  const tickers = extractTickers(text);
  const mentions = extractMentions(text);
  
  return {
    tickers,
    mentions,
    formattedText: text,
  };
}

// Check if a string is a valid ticker format
export function isValidTicker(ticker: string): boolean {
  return /^[A-Za-z]{1,5}$/.test(ticker);
}

// Check if a string is a valid username format
export function isValidUsername(username: string): boolean {
  return /^[A-Za-z0-9_]{1,30}$/.test(username);
}

// Format content with clickable tickers and mentions (for display)
export function formatContentForDisplay(content: string): {
  parts: Array<{ type: 'text' | 'ticker' | 'mention'; value: string }>;
} {
  const parts: Array<{ type: 'text' | 'ticker' | 'mention'; value: string }> = [];
  
  // Combined regex for both tickers and mentions
  const regex = /(\$[A-Za-z]{1,5})|(@[A-Za-z0-9_]{1,30})/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: content.substring(lastIndex, match.index),
      });
    }
    
    // Add the match
    const matchValue = match[0];
    if (matchValue.startsWith('$')) {
      parts.push({
        type: 'ticker',
        value: matchValue.substring(1).toUpperCase(),
      });
    } else {
      parts.push({
        type: 'mention',
        value: matchValue.substring(1),
      });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      value: content.substring(lastIndex),
    });
  }
  
  return { parts };
}
