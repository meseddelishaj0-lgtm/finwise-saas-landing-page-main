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
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.liveContainer}>
      <Animated.View
        style={[
          styles.liveDot,
          {
            transform: [{ scale: pulseAnim }],
            opacity: opacityAnim,
          },
        ]}
      />
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
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34C759',
    letterSpacing: 0.5,
  },
});

export default AnimatedPrice;
