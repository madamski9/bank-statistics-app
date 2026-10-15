import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useId,
  useState,
  type ReactNode,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  type TextLayoutLine,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, FeGaussianBlur, Filter, Text as SvgText } from 'react-native-svg';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { revealMaskedAmount, containsMaskedAmount } from './amount-masking';
import { privacyCopy } from '../privacy-copy';

const NestedInText = createContext(false);
const blurStrength = 0.42;
const minimumBlur = 4;
const defaultFontSize = 14;

const layoutKeys = [
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'width',
  'minWidth',
  'maxWidth',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'position',
  'top',
  'left',
  'right',
  'bottom',
] as const;

function hasMaskedAmount(children: ReactNode): boolean {
  return Children.toArray(children).some((child) => {
    if (typeof child === 'string') {
      return containsMaskedAmount(child);
    }

    if (isValidElement<{ children?: ReactNode }>(child)) {
      return hasMaskedAmount(child.props.children);
    }

    return false;
  });
}

function revealAmounts(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === 'string') {
      return revealMaskedAmount(child);
    }

    if (isValidElement<{ children?: ReactNode }>(child)) {
      return cloneElement(child, undefined, revealAmounts(child.props.children));
    }

    return child;
  });
}

function splitLayout(style: TextProps['style']): { outer: ViewStyle; inner: TextStyle } {
  const flattened: TextStyle = StyleSheet.flatten(style) ?? {};
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = { ...flattened };

  for (const key of layoutKeys) {
    if (key in flattened) {
      outer[key] = flattened[key];
      delete inner[key];
    }
  }

  return { outer: outer as ViewStyle, inner: inner as TextStyle };
}

export function AmountText({ children, style, onTextLayout, accessibilityLabel, ...rest }: TextProps) {
  const copy = useCopy(privacyCopy);
  const isNested = useContext(NestedInText);
  const filterId = `amount-blur-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [lines, setLines] = useState<TextLayoutLine[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  if (isNested || !hasMaskedAmount(children)) {
    return (
      <Text accessibilityLabel={accessibilityLabel} onTextLayout={onTextLayout} style={style} {...rest}>
        {children}
      </Text>
    );
  }

  const { outer, inner } = splitLayout(style);
  const fontSize = inner.fontSize ?? defaultFontSize;
  const color = typeof inner.color === 'string' ? inner.color : overviewColors.textPrimary;
  const blurRadius = Math.max(fontSize * blurStrength, minimumBlur);
  const haloPadding = Math.ceil(blurRadius * 3);
  const canvasWidth = size.width + haloPadding * 2;
  const canvasHeight = size.height + haloPadding * 2;

  return (
    <View
      accessible
      accessibilityLabel={copy.hiddenAmount}
      accessibilityRole="text"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;

        setSize((current) =>
          current.width === width && current.height === height ? current : { width, height },
        );
      }}
      style={outer}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <NestedInText.Provider value>
          <Text
            onTextLayout={(event) => {
              setLines(event.nativeEvent.lines);
              onTextLayout?.(event);
            }}
            style={[inner, styles.invisible]}
            {...rest}
            accessible={false}
          >
            {revealAmounts(children)}
          </Text>
        </NestedInText.Provider>
        <Svg
          height={canvasHeight}
          pointerEvents="none"
          style={[styles.halo, { top: -haloPadding, left: -haloPadding }]}
          width={canvasWidth}
        >
          <Defs>
            <Filter
              filterUnits="userSpaceOnUse"
              height={canvasHeight}
              id={filterId}
              width={canvasWidth}
              x={0}
              y={0}
            >
              <FeGaussianBlur stdDeviation={blurRadius} />
            </Filter>
          </Defs>
          {lines.map((line, index) => (
            <SvgText
              fill={color}
              filter={`url(#${filterId})`}
              fontSize={Math.min(fontSize, line.height)}
              fontWeight={inner.fontWeight}
              key={index}
              lengthAdjust="spacingAndGlyphs"
              textLength={line.width}
              x={line.x + haloPadding}
              y={line.y + line.ascender + haloPadding}
            >
              {line.text}
            </SvgText>
          ))}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  invisible: {
    color: 'transparent',
  },
  halo: {
    position: 'absolute',
  },
});
