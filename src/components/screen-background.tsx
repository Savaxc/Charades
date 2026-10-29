import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

interface ScreenBackgroundProps extends PropsWithChildren {
  colors?: [string, string, ...string[]];
}

export function ScreenBackground({ children, colors }: ScreenBackgroundProps) {
  return (
    <LinearGradient
      colors={colors ?? ['#080C1A', '#10152A', '#080C1A']}
      locations={colors ? undefined : [0, 0.48, 1]}
      style={styles.fill}
    >
      {children}
    </LinearGradient>
  );
}

export function AmbientOrb({
  color,
  size,
  top,
  right,
  left,
  bottom,
}: {
  color: string;
  size: number;
  top?: number;
  right?: number;
  left?: number;
  bottom?: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        top,
        right,
        left,
        bottom,
        opacity: 0.13,
      }}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    overflow: 'hidden',
  },
});
