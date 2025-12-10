// components/FormattedContent.tsx
// Renders post/comment content with clickable $TICKER and @username mentions
import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface Props {
  content: string;
  onTickerPress?: (ticker: string) => void;
  onMentionPress?: (username: string) => void;
  style?: any;
}

export default function FormattedContent({ 
  content, 
  onTickerPress, 
  onMentionPress,
  style 
}: Props) {
  // Parse content and create array of text parts
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
        value: matchValue,
      });
    } else {
      parts.push({
        type: 'mention',
        value: matchValue,
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

  return (
    <Text style={[styles.container, style]}>
      {parts.map((part, index) => {
        if (part.type === 'ticker') {
          return (
            <Text
              key={index}
              style={styles.ticker}
              onPress={() => onTickerPress?.(part.value.substring(1))}
            >
              {part.value}
            </Text>
          );
        }
        
        if (part.type === 'mention') {
          return (
            <Text
              key={index}
              style={styles.mention}
              onPress={() => onMentionPress?.(part.value.substring(1))}
            >
              {part.value}
            </Text>
          );
        }
        
        return <Text key={index}>{part.value}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 22,
  },
  ticker: {
    color: '#007AFF',
    fontWeight: '600',
  },
  mention: {
    color: '#5856D6',
    fontWeight: '500',
  },
});
