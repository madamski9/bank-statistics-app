import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { brandMarkSvg } from './brand-artwork';

export function BrandMark({ size = 112 }: { size?: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml height={size} width={size} xml={brandMarkSvg} />
    </View>
  );
}
