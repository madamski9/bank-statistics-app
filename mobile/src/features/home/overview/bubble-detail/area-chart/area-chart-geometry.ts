export interface ChartPoint {
  x: number;
  y: number;
}

interface PlotFrame {
  width: number;
  height: number;
  maximum: number;
  topInset: number;
}

export function chartPoints(values: number[], { width, height, maximum, topInset }: PlotFrame): ChartPoint[] {
  const drawableHeight = Math.max(height - topInset, 0);
  const scale = maximum > 0 ? drawableHeight / maximum : 0;

  return values.map((value, index) => ({
    x: values.length === 1 ? width / 2 : (index / (values.length - 1)) * width,
    y: height - Math.max(value, 0) * scale,
  }));
}

function monotoneTangents(points: ChartPoint[]): number[] {
  const count = points.length;
  const secants = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    const run = next.x - point.x;

    return run === 0 ? 0 : (next.y - point.y) / run;
  });
  const tangents = points.map((_, index) => {
    if (index === 0) {
      return secants[0];
    }

    if (index === count - 1) {
      return secants[count - 2];
    }

    const before = secants[index - 1];
    const after = secants[index];

    return before * after <= 0 ? 0 : (before + after) / 2;
  });

  secants.forEach((secant, index) => {
    if (secant === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      return;
    }

    const alpha = tangents[index] / secant;
    const beta = tangents[index + 1] / secant;
    const magnitude = alpha * alpha + beta * beta;

    if (magnitude > 9) {
      const factor = 3 / Math.sqrt(magnitude);

      tangents[index] = factor * alpha * secant;
      tangents[index + 1] = factor * beta * secant;
    }
  });

  return tangents;
}

function rounded(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export function smoothLinePath(points: ChartPoint[]): string {
  if (points.length === 0) {
    return '';
  }

  const [first] = points;

  if (points.length === 1) {
    return `M${rounded(first.x)},${rounded(first.y)}`;
  }

  const tangents = monotoneTangents(points);
  const segments = points.slice(1).map((point, offset) => {
    const previous = points[offset];
    const third = (point.x - previous.x) / 3;

    return `C${rounded(previous.x + third)},${rounded(previous.y + tangents[offset] * third)} ${rounded(point.x - third)},${rounded(point.y - tangents[offset + 1] * third)} ${rounded(point.x)},${rounded(point.y)}`;
  });

  return `M${rounded(first.x)},${rounded(first.y)} ${segments.join(' ')}`;
}

export function smoothAreaPath(points: ChartPoint[], baseline: number): string {
  if (points.length < 2) {
    return '';
  }

  const first = points[0];
  const last = points[points.length - 1];

  return `${smoothLinePath(points)} L${rounded(last.x)},${rounded(baseline)} L${rounded(first.x)},${rounded(baseline)} Z`;
}

export function nearestIndex(x: number, width: number, count: number): number {
  if (count <= 1 || width <= 0) {
    return 0;
  }

  return Math.min(Math.max(Math.round((x / width) * (count - 1)), 0), count - 1);
}
