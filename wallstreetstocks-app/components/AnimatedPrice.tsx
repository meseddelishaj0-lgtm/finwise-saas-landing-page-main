// components/AnimatedPrice.tsx
// Animated price display with smooth transitions and flash effects
import React, { useEffect, useRef, memo } from 'react';
import { Text, StyleSheet, Animated, View, TextStyle, ViewStyle } from 'react-native';

interface AnimatedPriceProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  style?: TextStyle;
  containerStyle?: ViewStyle;
  flashOnChange?: boolean;
  showPulse?: boolean;
  duration?: number;
}

export const AnimatedPrice = memo(({
  value,
  prefix = '$',
  suffix = '',
  decimals = 2,
  style,
  containerStyle,
  flashOnChange = true,
  showPulse = false,
  duration = 300,
}: AnimatedPriceProps) => {
  const animatedValue = useRef(new Animated.Value(value)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevValue = useRef(value);
  const [displayValue, setDisplayValue] = React.useState(value);

  // Smooth number transition
  useEffect(() => {
    const wasUp = value > prevValue.current;
    const wasDown = value < prevValue.current;
    prevValue.current = value;

    // Animate the number change
    Animated.timing(animatedValue, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();

    // Flash effect on change
    if (flashOnChange && (wasUp || wasDown)) {
      flashAnim.setValue(wasUp ? 1 : -1);
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: false,
      }).start();
    }

    // Listen to animated value changes
    const listener = animatedValue.addListener(({ value: v }) => {
      setDisplayValue(v);
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [value]);

  // Continuous pulse animation for "live" feel
  useEffect(() => {
    if (showPulse) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [showPulse]);

  // Interpolate flash color
  const flashColor = flashAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['rgba(255, 59, 48, 0.3)', 'transparent', 'rgba(52, 199, 89, 0.3)'],
  });

  const formattedValue = `${prefix}${displayValue.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;

  return (
    <Animated.View
      style={[
        containerStyle,
        showPulse && { transform: [{ scale: pulseAnim }] },
      ]}
    >
      <Animated.View
        style={[
          styles.flashContainer,
          flashOnChange && { backgroundColor: flashColor },
        ]}
      >
        <Text style={[styles.price, style]}>{formattedValue}</Text>
      </Animated.View>
    </Animated.View>
  );
});

// Animated percentage change with color
interface AnimatedChangeProps {
  value: number;
  style?: TextStyle;
  showArrow?: boolean;
  flashOnChange?: boolean;
}

export const AnimatedChange = memo(({
  value,
  style,
  showArrow = true,
  flashOnChange = true,
}: AnimatedChangeProps) => {
  const flashAnim = useRef(new Animated.Value(0)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    const wasUp = value > prevValue.current;
    const wasDown = value < prevValue.current;
    prevValue.current = value;

    if (flashOnChange && (wasUp || wasDown)) {
      flashAnim.setValue(1);
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [value]);

  const isPositive = value >= 0;
  const color = isPositive ? '#34C759' : '#FF3B30';
  const arrow = isPositive ? '▲' : '▼';

  const flashOpacity = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  return (
    <Animated.Text
      style={[
        styles.change,
        { color },
        style,
        { opacity: flashOpacity },
      ]}
    >
      {showArrow && `${arrow} `}
      {isPositive ? '+' : ''}{value.toFixed(2)}%
    </Animated.Text>
  );
});

// Market status types
type MarketStatus = 'live' | 'premarket' | 'afterhours' | 'closed';

// Get current market status based on US Eastern Time
const getMarketStatus = (): MarketStatus => {
  const now = new Date();

  // Get UTC time components
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcDay = now.getUTCDay(); // 0 = Sunday, 6 = Saturday

  // Convert UTC to Eastern Time
  // EST = UTC - 5 hours, EDT = UTC - 4 hours
  // Determine if we're in DST (roughly March second Sunday to November first Sunday)
  const month = now.getUTCMonth(); // 0-11
  const date = now.getUTCDate();

  // Simple DST check: DST is roughly mid-March to early November
  const isDST = month > 2 && month < 10; // April through October is definitely DST

  const etOffset = isDST ? -4 : -5; // EDT or EST
  let etHours = utcHours + etOffset;
  let etDay = utcDay;

  // Handle day wraparound
  if (etHours < 0) {
    etHours += 24;
    etDay = (etDay + 6) % 7; // Go back one day
  } else if (etHours >= 24) {
    etHours -= 24;
    etDay = (etDay + 1) % 7; // Go forward one day
  }

  const timeInMinutes = etHours * 60 + utcMinutes;

  // Weekend - market closed
  if (etDay === 0 || etDay === 6) {
    return 'closed';
  }

  // Market hours in minutes from midnight (Eastern Time)
  const preMarketOpen = 7 * 60; // 7:00 AM ET (420)
  const marketOpen = 9 * 60 + 30; // 9:30 AM ET (570)
  const marketClose = 16 * 60; // 4:00 PM ET (960)
  const afterHoursClose = 20 * 60; // 8:00 PM ET (1200)

  if (timeInMinutes >= marketOpen && timeInMinutes < marketClose) {
    return 'live';
  } else if (timeInMinutes >= preMarketOpen && timeInMinutes < marketOpen) {
    return 'premarket';
  } else if (timeInMinutes >= marketClose && timeInMinutes < afterHoursClose) {
    return 'afterhours';
  }

  return 'closed';
};

// Market Status Indicator - shows Live, Pre Market, After Hours, or Closed
export const MarketStatusIndicator = memo(() => {
  const [status, setStatus] = React.useState<MarketStatus>(getMarketStatus);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Update status every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getMarketStatus());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Pulse animation only for live status
  useEffect(() => {
    if (status === 'live') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      const opacity = Animated.loop(
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      pulse.start();
      glow.start();
      opacity.start();

      return () => {
        pulse.stop();
        glow.stop();
        opacity.stop();
      };
    } else {
      // Reset animations for non-live status
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
      opacityAnim.setValue(1);
    }
  }, [status]);

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 0.3, 0],
  });

  // Colors based on status
  const getStatusConfig = () => {
    switch (status) {
      case 'live':
        return { color: '#34C759', label: 'LIVE', subtitle: '' };
      case 'premarket':
        return { color: '#FF9500', label: 'PRE MARKET', subtitle: 'Price update limited' };
      case 'afterhours':
        return { color: '#FF9500', label: 'AFTER HOURS', subtitle: 'Price update limited' };
      case 'closed':
        return { color: '#8E8E93', label: 'CLOSED', subtitle: '' };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={styles.marketStatusWrapper}>
      <View style={styles.marketStatusContainer}>
        <View style={styles.liveDotContainer}>
          {/* Glow ring - only for live */}
          {status === 'live' && (
            <Animated.View
              style={[
                styles.liveGlow,
                {
                  backgroundColor: config.color,
                  transform: [{ scale: glowScale }],
                  opacity: glowOpacity,
                },
              ]}
            />
          )}
          {/* Main dot */}
          <Animated.View
            style={[
              styles.liveDot,
              {
                backgroundColor: config.color,
                transform: status === 'live' ? [{ scale: pulseAnim }] : [],
                opacity: status === 'live' ? opacityAnim : 1,
              },
            ]}
          />
        </View>
        <Text style={[styles.liveText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
      {config.subtitle ? (
        <Text style={styles.marketStatusSubtitle}>{config.subtitle}</Text>
      ) : null}
    </View>
  );
});

// Live indicator dot with pulse animation
export const LiveIndicator = memo(() => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Main dot pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    // Glow ring animation
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    // Opacity pulse for extra effect
    const opacity = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    glow.start();
    opacity.start();

    return () => {
      pulse.stop();
      glow.stop();
      opacity.stop();
    };
  }, []);

  // Interpolate glow ring scale and opacity
  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 0.3, 0],
  });

  return (
    <View style={styles.liveContainer}>
      <View style={styles.liveDotContainer}>
        {/* Glow ring */}
        <Animated.View
          style={[
            styles.liveGlow,
            {
              transform: [{ scale: glowScale }],
              opacity: glowOpacity,
            },
          ]}
        />
        {/* Main dot */}
        <Animated.View
          style={[
            styles.liveDot,
            {
              transform: [{ scale: pulseAnim }],
              opacity: opacityAnim,
            },
          ]}
        />
      </View>
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  flashContainer: {
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  change: {
    fontSize: 14,
    fontWeight: '600',
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDotContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveGlow: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34C759',
    letterSpacing: 0.5,
  },
  marketStatusWrapper: {
    alignItems: 'flex-start',
  },
  marketStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  marketStatusSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 2,
    marginLeft: 22, // Align with text (dot container width + gap)
  },
});

export default AnimatedPrice;
