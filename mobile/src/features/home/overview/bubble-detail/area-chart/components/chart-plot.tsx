import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { smoothAreaPath, smoothLinePath } from '../area-chart-geometry';
import type { PlottedSeries } from '../area-series';

const gridLines = [0.25, 0.5, 0.75];

interface ChartPlotProps {
  width: number;
  height: number;
  topInset: number;
  plotted: PlottedSeries[];
  activeIndex: number | null;
}

export function ChartPlot({ width, height, topInset, plotted, activeIndex }: ChartPlotProps) {
  const activeX = activeIndex === null ? null : plotted[0]?.coordinates[activeIndex]?.x;

  return (
    <Svg height={height} width={width}>
      <Defs>
        {plotted.map((entry) => (
          <LinearGradient id={`fill-${entry.key}`} key={entry.key} x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={entry.color} stopOpacity={0.42} />
            <Stop offset="1" stopColor={entry.color} stopOpacity={0.02} />
          </LinearGradient>
        ))}
      </Defs>
      {gridLines.map((fraction) => (
        <Line
          key={fraction}
          stroke={overviewColors.textPrimary}
          strokeOpacity={0.07}
          strokeWidth={1}
          x1={0}
          x2={width}
          y1={topInset + (height - topInset) * fraction}
          y2={topInset + (height - topInset) * fraction}
        />
      ))}
      {plotted.map((entry) => (
        <Path d={smoothAreaPath(entry.coordinates, height)} fill={`url(#fill-${entry.key})`} key={`area-${entry.key}`} />
      ))}
      {plotted.map((entry) => (
        <Path
          d={smoothLinePath(entry.coordinates)}
          fill="none"
          key={`line-${entry.key}`}
          stroke={entry.color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      ))}
      {activeX == null ? null : (
        <Line
          stroke={overviewColors.textPrimary}
          strokeOpacity={0.35}
          strokeWidth={1}
          x1={activeX}
          x2={activeX}
          y1={0}
          y2={height}
        />
      )}
      {activeIndex === null
        ? null
        : plotted.map((entry) => (
            <Circle
              cx={entry.coordinates[activeIndex].x}
              cy={entry.coordinates[activeIndex].y}
              fill={entry.color}
              key={`dot-${entry.key}`}
              r={4.5}
              stroke={overviewColors.background}
              strokeWidth={2}
            />
          ))}
    </Svg>
  );
}
