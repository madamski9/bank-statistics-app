import { StyleSheet, View } from 'react-native';

import { bubbleTints, type BubbleKey } from './overview-theme';

interface BubbleSkinProps {
  size: number;
  tint: BubbleKey;
}

/**
 * The soap-film look, built from stacked radial gradients: a body that is nearly empty in the
 * middle, two off-centre colour bands that catch opposite edges, iridescent washes, a specular
 * highlight and the light that bounces back off the far wall of the film. Gradients are used
 * rather than a blur because `filter: blur` is Android-only in RN 0.86.
 *
 * Every band is drawn from a gradient circle whose centre sits off the bubble's own centre, so
 * each one lands as an uneven arc instead of an even ring — an even ring reads as an outline.
 */
/**
 * A washed-out version of the film's own colour: white enough to read as a glass edge, tinted
 * enough that it never looks like a drawn outline.
 */
function glassEdge(rgb: string, whiteness: number, alpha: number): string {
  const channels = rgb.split(',').map((channel) => Number(channel.trim()));
  const washed = channels.map((channel) => Math.round(channel + (255 - channel) * whiteness));

  return `rgba(${washed.join(', ')}, ${alpha})`;
}

export function BubbleSkin({ size, tint }: BubbleSkinProps) {
  const { rgb, rgbSecondary } = bubbleTints[tint];
  const radius = size / 2;
  const highlight = { width: size * 0.36, height: size * 0.24, borderRadius: size * 0.18 };
  const bounce = { width: size * 0.62, height: size * 0.3, borderRadius: size * 0.31 };
  const sparkle = { width: size * 0.12, height: size * 0.09, borderRadius: size * 0.06 };

  const layer = (image: string) => [
    StyleSheet.absoluteFill,
    { borderRadius: radius, experimental_backgroundImage: image },
  ];

  return (
    <View pointerEvents="none" style={[styles.clip, { borderRadius: radius }]}>
      <View
        style={layer(
          `radial-gradient(circle at 50% 50%, rgba(${rgb}, 0.07) 0%, rgba(${rgb}, 0.03) 44%, rgba(${rgb}, 0.12) 72%, rgba(${rgb}, 0.30) 88%, rgba(${rgb}, 0.16) 96%, rgba(${rgb}, 0) 100%)`,
        )}
      />
      <View
        style={layer(
          `radial-gradient(circle at 62% 66%, rgba(${rgb}, 0) 58%, rgba(${rgb}, 0.50) 84%, rgba(${rgb}, 0) 100%)`,
        )}
      />
      <View
        style={layer(
          `radial-gradient(circle at 36% 32%, rgba(${rgbSecondary}, 0) 56%, rgba(${rgbSecondary}, 0.46) 82%, rgba(${rgbSecondary}, 0) 100%)`,
        )}
      />
      <View
        style={layer(
          'radial-gradient(circle at 22% 18%, rgba(140, 210, 255, 0.34) 0%, rgba(140, 210, 255, 0) 54%)',
        )}
      />
      <View
        style={layer(
          'radial-gradient(circle at 82% 84%, rgba(255, 150, 230, 0.30) 0%, rgba(255, 150, 230, 0) 52%)',
        )}
      />
      {/* Light that crossed the bubble and bounced off the far wall. */}
      <View
        style={[
          styles.lit,
          bounce,
          { left: size * 0.19, top: size * 0.62 },
          {
            experimental_backgroundImage: `radial-gradient(ellipse at 50% 50%, rgba(${rgbSecondary}, 0.30) 0%, rgba(${rgbSecondary}, 0.08) 52%, rgba(${rgbSecondary}, 0) 76%)`,
          },
        ]}
      />
      <View
        style={[
          styles.lit,
          highlight,
          styles.tilted,
          { left: size * 0.16, top: size * 0.13 },
          {
            experimental_backgroundImage:
              'radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.18) 46%, rgba(255, 255, 255, 0) 72%)',
          },
        ]}
      />
      <View
        style={[
          styles.lit,
          sparkle,
          styles.tilted,
          { left: size * 0.66, top: size * 0.74 },
          {
            experimental_backgroundImage:
              'radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 70%)',
          },
        ]}
      />
      <View
        style={[
          styles.edge,
          { borderRadius: radius, borderColor: glassEdge(rgb, 0.62, 0.55) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  lit: {
    position: 'absolute',
  },
  tilted: {
    transform: [{ rotate: '-24deg' }],
  },
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    /** A hairline is one physical pixel and disappears into the anti-aliased edge. */
    borderWidth: 1,
  },
});
