// components/Sparkline.tsx
// Lightweight SVG sparkline for watchlist/trending rows.
// Draws raw price data in true proportion (no 0-100 normalization),
// so live tick updates visibly move the line. Far cheaper per row
// than a full chart library.
import React, { memo, useMemo, useRef } from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

let sparklineIdCounter = 0;

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  fillOpacity?: number;
}

const buildPaths = (data: number[], width: number, height: number) => {
  const clean = data.filter((v) => typeof v === 'number' && isFinite(v));
  if (clean.length < 2) return null;

  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min;

  // Flat series: draw an honest straight line at mid-height
  if (range < 1e-9) {
    const y = height / 2;
    const linePath = `M 0 ${y} L ${width} ${y}`;
    return { linePath, areaPath: `${linePath} L ${width} ${height} L 0 ${height} Z` };
  }

  const points = clean.map((value, index) => ({
    x: (index / (clean.length - 1)) * width,
    y: height - ((value - min) / range) * (height - 4) - 2,
  }));

  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    linePath += ` Q ${prev.x + (midX - prev.x) * 0.5} ${prev.y}, ${midX} ${(prev.y + curr.y) / 2}`;
    linePath += ` Q ${midX + (curr.x - midX) * 0.5} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  return { linePath, areaPath };
};

const Sparkline = memo(({
  data,
  color = '#00C853',
  width = 85,
  height = 36,
  strokeWidth = 1.5,
  fillOpacity = 0.25,
}: SparklineProps) => {
  // Stable per-instance gradient id (Math.random per render forces
  // gradient re-definition on every tick)
  const gradientId = useRef(`spark-${++sparklineIdCounter}`).current;

  const paths = useMemo(() => buildPaths(data, width, height), [data, width, height]);

  if (!paths) return <View style={{ width, height }} />;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={paths.areaPath} fill={`url(#${gradientId})`} />
      <Path
        d={paths.linePath}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});

Sparkline.displayName = 'Sparkline';

export default Sparkline;
