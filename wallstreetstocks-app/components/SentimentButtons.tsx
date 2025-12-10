// components/SentimentButtons.tsx
// Bullish/Bearish voting buttons like StockTwits
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  postId: number;
  userId: number | null;
  bullish: number;
  bearish: number;
  userVote: 'bullish' | 'bearish' | null;
  onVote: (postId: number, type: 'bullish' | 'bearish') => Promise<void>;
  compact?: boolean;
}

export default function SentimentButtons({
  postId,
  userId,
  bullish,
  bearish,
  userVote,
  onVote,
  compact = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [localBullish, setLocalBullish] = useState(bullish);
  const [localBearish, setLocalBearish] = useState(bearish);
  const [localVote, setLocalVote] = useState(userVote);

  const total = localBullish + localBearish;
  const bullishPercent = total > 0 ? Math.round((localBullish / total) * 100) : 50;

  const handleVote = async (type: 'bullish' | 'bearish') => {
    if (!userId || loading) return;

    setLoading(true);
    
    // Optimistic update
    if (localVote === type) {
      // Remove vote
      setLocalVote(null);
      if (type === 'bullish') setLocalBullish(prev => Math.max(0, prev - 1));
      else setLocalBearish(prev => Math.max(0, prev - 1));
    } else if (localVote) {
      // Change vote
      setLocalVote(type);
      if (type === 'bullish') {
        setLocalBullish(prev => prev + 1);
        setLocalBearish(prev => Math.max(0, prev - 1));
      } else {
        setLocalBearish(prev => prev + 1);
        setLocalBullish(prev => Math.max(0, prev - 1));
      }
    } else {
      // New vote
      setLocalVote(type);
      if (type === 'bullish') setLocalBullish(prev => prev + 1);
      else setLocalBearish(prev => prev + 1);
    }

    try {
      await onVote(postId, type);
    } catch (error) {
      // Revert on error
      setLocalVote(userVote);
      setLocalBullish(bullish);
      setLocalBearish(bearish);
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <TouchableOpacity
          style={[styles.compactButton, localVote === 'bullish' && styles.bullishActive]}
          onPress={() => handleVote('bullish')}
          disabled={loading}
        >
          <Ionicons 
            name="trending-up" 
            size={16} 
            color={localVote === 'bullish' ? '#FFF' : '#34C759'} 
          />
          <Text style={[styles.compactText, localVote === 'bullish' && styles.activeText]}>
            {localBullish}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.compactButton, localVote === 'bearish' && styles.bearishActive]}
          onPress={() => handleVote('bearish')}
          disabled={loading}
        >
          <Ionicons 
            name="trending-down" 
            size={16} 
            color={localVote === 'bearish' ? '#FFF' : '#FF3B30'} 
          />
          <Text style={[styles.compactText, localVote === 'bearish' && styles.activeText]}>
            {localBearish}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, localVote === 'bullish' && styles.bullishActive]}
          onPress={() => handleVote('bullish')}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#34C759" />
          ) : (
            <>
              <Ionicons 
                name="trending-up" 
                size={20} 
                color={localVote === 'bullish' ? '#FFF' : '#34C759'} 
              />
              <Text style={[styles.buttonText, localVote === 'bullish' && styles.activeText]}>
                Bullish
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, localVote === 'bearish' && styles.bearishActive]}
          onPress={() => handleVote('bearish')}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : (
            <>
              <Ionicons 
                name="trending-down" 
                size={20} 
                color={localVote === 'bearish' ? '#FFF' : '#FF3B30'} 
              />
              <Text style={[styles.buttonText, localVote === 'bearish' && styles.activeText]}>
                Bearish
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {total > 0 && (
        <View style={styles.barContainer}>
          <View style={[styles.bullishBar, { width: `${bullishPercent}%` }]} />
          <View style={[styles.bearishBar, { width: `${100 - bullishPercent}%` }]} />
        </View>
      )}

      {total > 0 && (
        <View style={styles.statsRow}>
          <Text style={styles.statText}>
            {bullishPercent}% Bullish ({localBullish})
          </Text>
          <Text style={styles.statText}>
            {100 - bullishPercent}% Bearish ({localBearish})
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  bullishActive: {
    backgroundColor: '#34C759',
  },
  bearishActive: {
    backgroundColor: '#FF3B30',
  },
  activeText: {
    color: '#FFF',
  },
  barContainer: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  bullishBar: {
    backgroundColor: '#34C759',
  },
  bearishBar: {
    backgroundColor: '#FF3B30',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  compactContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
  },
  compactText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
});
