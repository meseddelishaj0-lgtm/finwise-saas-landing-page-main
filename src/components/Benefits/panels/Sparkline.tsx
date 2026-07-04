"use client";

import React, { useId } from "react";

interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  /** Fill the area under the line with a soft gradient */
  area?: boolean;
  /** Render points from this index on as a dashed projection */
  dashedFrom?: number;
  className?: string;
}

const Sparkline: React.FC<Props> = ({
  data,
  width = 64,
  height = 24,
  color = "#FACC15",
  strokeWidth = 2,
  area = false,
  dashedFrom,
  className,
}) => {
  const gradientId = useId();
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = strokeWidth;

  const toX = (i: number) => pad + (i / (data.length - 1)) * (width - pad * 2);
  const toY = (v: number) =>
    height - pad - ((v - min) / range) * (height - pad * 2);

  const points = data.map((v, i) => `${toX(i)},${toY(v)}`);
  const solidEnd = dashedFrom !== undefined ? dashedFrom + 1 : data.length;
  const solidPoints = points.slice(0, solidEnd).join(" ");
  const dashedPoints =
    dashedFrom !== undefined ? points.slice(dashedFrom).join(" ") : null;

  const areaPath = `${points.join(" ")} ${toX(data.length - 1)},${height} ${toX(0)},${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      {area && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={areaPath} fill={`url(#${gradientId})`} />
        </>
      )}
      <polyline
        points={solidPoints}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {dashedPoints && (
        <polyline
          points={dashedPoints}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4 4"
          opacity={0.7}
        />
      )}
    </svg>
  );
};

export default Sparkline;
