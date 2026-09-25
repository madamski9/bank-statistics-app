import { describe, expect, test } from 'bun:test';

import { chartPoints, nearestIndex, smoothAreaPath, smoothLinePath } from './area-chart-geometry';

const frame = { width: 300, height: 100, maximum: 50, topInset: 0 };

function pathNumbers(path: string): number[] {
  return (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

describe('area chart geometry', () => {
  test('spreads points across the width and scales them to the tallest value', () => {
    expect(chartPoints([0, 25, 50], frame)).toEqual([
      { x: 0, y: 100 },
      { x: 150, y: 50 },
      { x: 300, y: 0 },
    ]);
  });

  test('leaves room above the peak for the top inset', () => {
    expect(chartPoints([50], { ...frame, topInset: 20 })[0].y).toBe(20);
  });

  test('never curves below the baseline between a spike and empty days', () => {
    const points = chartPoints([0, 0, 50, 0, 0], frame);
    const ys = pathNumbers(smoothLinePath(points)).filter((_, index) => index % 2 === 1);

    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
  });

  test('closes the area along the baseline', () => {
    const path = smoothAreaPath(chartPoints([10, 20], frame), 100);

    expect(path.startsWith('M0,80')).toBe(true);
    expect(path.endsWith('L300,100 L0,100 Z')).toBe(true);
  });

  test('draws nothing for a single value', () => {
    expect(smoothAreaPath(chartPoints([10], frame), 100)).toBe('');
  });

  test('finds the point nearest to a finger', () => {
    expect(nearestIndex(0, 300, 31)).toBe(0);
    expect(nearestIndex(151, 300, 31)).toBe(15);
    expect(nearestIndex(400, 300, 31)).toBe(30);
  });
});
