import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { bubbleTints, type BubbleKey } from './overview-theme';

interface BubbleSkinProps {
  size: number;
  tint: BubbleKey;
}

function glassEdge(rgb: string, whiteness: number, alpha: number): string {
  const channels = rgb.split(',').map((channel) => Number(channel.trim()));
  const washed = channels.map((channel) => Math.round(channel + (255 - channel) * whiteness));

  return `rgba(${washed.join(', ')}, ${alpha})`;
}

function BubbleSkinComponent({ size: displaySize, tint }: BubbleSkinProps) {
  const renderScale = 1.5;
  const size = displaySize * renderScale;
  const { rgb, rgbSecondary } = bubbleTints[tint];
  const radius = size / 2;
  const highlight = { width: size * 0.36, height: size * 0.18, borderRadius: size * 0.18 };
  const bounce = { width: size * 0.62, height: size * 0.3, borderRadius: size * 0.31 };
  const sparkle = { width: size * 0.12, height: size * 0.09, borderRadius: size * 0.06 };

  const layer = (image: string) => [
    StyleSheet.absoluteFill,
    { borderRadius: radius, experimental_backgroundImage: image },
  ];

  return (
    <View
      pointerEvents="none"
      style={[
        styles.clip,
        {
          width: size,
          height: size,
          left: (displaySize - size) / 2,
          top: (displaySize - size) / 2,
          borderRadius: radius,
          transform: [{ scale: 1 / renderScale }],
        },
      ]}
    >
      <View
        style={layer(
          `radial-gradient(circle at 48% 44%, rgba(${rgb}, 0.07) 0%, rgba(${rgb}, 0.025) 46%, rgba(${rgb}, 0.12) 72%, rgba(${rgb}, 0.36) 90%, rgba(${rgb}, 0.62) 97%, rgba(${rgb}, 0.18) 100%)`,
        )}
      />
      <View
        style={layer(
          `radial-gradient(circle at 62% 66%, rgba(${rgb}, 0) 58%, rgba(${rgb}, 0.58) 84%, rgba(${rgb}, 0) 100%)`,
        )}
      />
      <View
        style={layer(
          `radial-gradient(circle at 36% 32%, rgba(${rgbSecondary}, 0) 56%, rgba(${rgbSecondary}, 0.52) 82%, rgba(${rgbSecondary}, 0) 100%)`,
        )}
      />
      <View
        style={layer(
          'radial-gradient(circle at 22% 18%, rgba(180, 225, 255, 0.24) 0%, rgba(140, 210, 255, 0) 48%)',
        )}
      />
      <View
        style={layer(
          'radial-gradient(circle at 82% 84%, rgba(255, 180, 230, 0.20) 0%, rgba(255, 150, 230, 0) 46%)',
        )}
      />
      <View
        style={layer(
          'radial-gradient(ellipse at 36% 26%, rgba(255, 255, 255, 0.20) 0%, rgba(255, 255, 255, 0.06) 32%, rgba(255, 255, 255, 0) 58%)',
        )}
      />
      <View
        style={layer(
          'radial-gradient(ellipse at 66% 62%, rgba(0, 0, 0, 0) 28%, rgba(0, 0, 0, 0.24) 65%, rgba(0, 0, 0, 0) 88%)',
        )}
      />
      <View
        style={layer(
          'radial-gradient(ellipse at 42% 38%, rgba(255, 255, 255, 0) 64%, rgba(255, 255, 255, 0.06) 77%, rgba(255, 255, 255, 0.72) 86%, rgba(255, 255, 255, 0.12) 89%, rgba(255, 255, 255, 0) 93%)',
        )}
      />
      <View
        style={[
          styles.lit,
          bounce,
          { left: size * 0.19, top: size * 0.62 },
          {
            experimental_backgroundImage: `radial-gradient(ellipse at 50% 50%, rgba(${rgbSecondary}, 0.48) 0%, rgba(${rgbSecondary}, 0.08) 52%, rgba(${rgbSecondary}, 0) 76%)`,
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
              'radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.78) 18%, rgba(255, 255, 255, 0.22) 38%, rgba(255, 255, 255, 0) 72%)',
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
          {
            borderRadius: radius,
            borderColor: glassEdge(rgb, 0.88, 0.5),
            borderWidth: StyleSheet.hairlineWidth * renderScale,
          },
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
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export const BubbleSkin = memo(BubbleSkinComponent);
