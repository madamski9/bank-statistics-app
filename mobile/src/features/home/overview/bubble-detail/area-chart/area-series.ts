import type { ChartPoint } from './area-chart-geometry';

export interface AreaSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

export interface PlottedSeries extends AreaSeries {
  coordinates: ChartPoint[];
}
