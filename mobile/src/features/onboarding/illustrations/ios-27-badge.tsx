import { StyleSheet, View } from 'react-native';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';

const badgeSize = 168;

export function Ios27Badge() {
  return (
    <AnimatedReveal delay={60} style={styles.frame}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.shadow}>
        <Svg height={badgeSize} viewBox="0 0 200 200" width={badgeSize}>
          <Defs>
            <LinearGradient id="silk" x1="0" x2="1" y1="0" y2="1">
              <Stop offset="0" stopColor="#d9c7a8" />
              <Stop offset="0.45" stopColor="#a18f7d" />
              <Stop offset="1" stopColor="#4f4a57" />
            </LinearGradient>
            <LinearGradient id="foldLight" x1="1" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor="#fff6e6" stopOpacity="0.9" />
              <Stop offset="1" stopColor="#fff6e6" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="foldShade" x1="0" x2="1" y1="0" y2="1">
              <Stop offset="0" stopColor="#2f2b36" stopOpacity="0" />
              <Stop offset="1" stopColor="#2f2b36" stopOpacity="0.55" />
            </LinearGradient>
            <LinearGradient id="numerals" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor="#ffffff" />
              <Stop offset="1" stopColor="#f1e2c8" />
            </LinearGradient>
            <LinearGradient id="rim" x1="0" x2="1" y1="0" y2="1">
              <Stop offset="0" stopColor="#ffffff" stopOpacity="0.7" />
              <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0.08" />
              <Stop offset="1" stopColor="#ffffff" stopOpacity="0.35" />
            </LinearGradient>
            <ClipPath id="squircle">
              <Rect height="200" rx="46" width="200" />
            </ClipPath>
          </Defs>
          <G clipPath="url(#squircle)">
            <Rect fill="url(#silk)" height="200" width="200" />
            <Path d="M200 0C150 20 112 70 104 128C98 170 70 194 0 200H200Z" fill="url(#foldShade)" />
            <Path d="M150 0C122 34 96 70 90 116C84 160 52 186 0 196V176C40 160 62 140 66 104C72 58 98 24 124 0Z" fill="url(#foldLight)" opacity="0.55" />
            <Path d="M200 36C168 60 146 96 140 140C136 172 116 192 84 200H120C146 186 160 164 164 134C170 92 182 64 200 52Z" fill="url(#foldLight)" opacity="0.35" />
            <Path d="M0 120C30 116 52 134 62 158C70 178 86 192 104 200H0Z" fill="url(#foldShade)" opacity="0.7" />
            <SvgText
              fill="url(#numerals)"
              fontSize="112"
              fontWeight="700"
              letterSpacing="-4"
              stroke="#ffffff"
              strokeOpacity="0.35"
              strokeWidth="1.2"
              textAnchor="middle"
              x="100"
              y="140"
            >
              27
            </SvgText>
          </G>
          <Rect fill="none" height="198" rx="45" stroke="url(#rim)" strokeWidth="2" width="198" x="1" y="1" />
        </Svg>
      </View>
    </AnimatedReveal>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', paddingVertical: 8 },
  shadow: {
    borderRadius: 40,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
});
