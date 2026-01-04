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
});

export default AnimatedPrice;
