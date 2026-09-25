/**
 * Tokens for the Overview surface. This screen is deliberately always dark: the bubbles are
 * lit films that only read against true black, so it opts out of the app's light/dark theme
 * instead of deriving from it.
 */
export const overviewColors = {
  /** True black, so an OLED panel keeps the pixels off around the bubbles. */
  background: '#000000',
  surface: '#0D0D0F',
  surfacePressed: '#17171A',
  hairline: 'rgba(255, 255, 255, 0.09)',
  textPrimary: '#FFFFFF',
  /** 6.4:1 on black - the lightest grey that still passes as body text. */
  textSecondary: '#8E8E93',
  /** Decoration only (rims, tracks); never carries text or meaning. */
  textDisabled: '#48484A',
  caution: '#FFC46B',
  positive: '#34E39B',
  negative: '#FF5C7A',
  scrim: '#000000',
} as const;

export type BubbleKey = 'expense' | 'income' | 'net';

export interface BubbleTint {
  /** Dominant colour of the soap film, also used for the outer glow. */
  film: string;
  /** Comma-separated RGB channels, for composing rgba() stops in gradients. */
  rgb: string;
  /**
   * The second band. A real soap film splits light into two visible bands, and on black a
   * single hue at low alpha just reads as muddy - the pair is what makes it look like glass.
   */
  rgbSecondary: string;
}

export const bubbleTints: Record<BubbleKey, BubbleTint> = {
  expense: { film: '#FF5C8A', rgb: '255, 92, 138', rgbSecondary: '255, 196, 107' },
  income: { film: '#3DE8A0', rgb: '61, 232, 160', rgbSecondary: '95, 216, 255' },
  net: { film: '#8F7BFF', rgb: '143, 123, 255', rgbSecondary: '95, 200, 255' },
};

/**
 * Bubble sizes are fixed fractions of the field, never derived from the amounts: a big
 * expense month must not make the expense bubble grow.
 */
export const bubbleLayout = {
  expense: { diameter: 0.58, centerX: 0.33, centerY: 0.48 },
  income: { diameter: 0.36, centerX: 0.75, centerY: 0.24 },
  net: { diameter: 0.25, centerX: 0.72, centerY: 0.71 },
} as const satisfies Record<BubbleKey, { diameter: number; centerX: number; centerY: number }>;

export const overviewSpacing = {
  gutter: 20,
  tight: 8,
  row: 12,
  block: 16,
  section: 24,
} as const;

export const overviewMotion = {
  /** Finger lands: the film dents in. */
  pushIn: { duration: 110, dampingRatio: 1 },
  /** Finger leaves: it springs past its resting size before settling. */
  rebound: { duration: 460, dampingRatio: 0.55 },
  transition: { duration: 420, dampingRatio: 1, overshootClamping: true },
  exitDuration: 200,
  dismiss: { duration: 320, dampingRatio: 1, overshootClamping: true },
} as const;
