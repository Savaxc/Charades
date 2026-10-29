import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Text, View, type TextStyle } from 'react-native';

import type { Category, GameWord } from '@/types/game';

interface WordCardProps {
  word: GameWord | null;
  category: Category;
  index: number;
}

/**
 * Long single words (e.g. "Maratonci") get scaled down so they never need to
 * break in the middle on web, where `adjustsFontSizeToFit` is a no-op.
 */
function getWordFontSize(text: string) {
  const longest = text
    .split(/[\s-]+/)
    .reduce((max, part) => Math.max(max, part.length), 1);

  const availableWidth = 276;
  const estimatedCharWidth = 0.55;
  const fitted = availableWidth / (longest * estimatedCharWidth);

  return Math.round(Math.min(62, Math.max(24, fitted)));
}

const webNoWrapStyle =
  Platform.OS === 'web'
    ? ({ overflowWrap: 'normal', wordBreak: 'keep-all' } as unknown as TextStyle)
    : undefined;

export function WordCard({ word, category, index }: WordCardProps) {
  const fontSize = getWordFontSize(word?.text ?? '—');
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    translateY.setValue(22);
    opacity.setValue(0.2);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 17,
        stiffness: 170,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, word?.id]);

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity,
        transform: [{ translateY }],
        overflow: 'hidden',
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.095)', 'rgba(255,255,255,0.025)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingVertical: 32,
        }}
      >
        <View
          pointerEvents="none"
          style={{ backgroundColor: category.accent }}
          className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-10"
        />
        <View
          pointerEvents="none"
          style={{ backgroundColor: category.accent }}
          className="absolute -bottom-14 -left-12 h-40 w-40 rounded-full opacity-[0.07]"
        />

        <View className="absolute left-5 right-5 top-5 flex-row items-center justify-between">
          <View
            style={{ borderColor: `${category.accent}55`, backgroundColor: `${category.accent}14` }}
            className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
          >
            <Text className="text-xs">{category.emoji}</Text>
            <Text
              style={{ color: category.accent }}
              className="font-body-bold text-[10px] uppercase tracking-[1.2px]"
            >
              {category.title}
            </Text>
          </View>
          <Text className="font-body-bold text-[10px] uppercase tracking-[1.5px] text-white/30">
            Reč {String(index + 1).padStart(2, '0')}
          </Text>
        </View>

        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.42}
          numberOfLines={3}
          style={[
            {
              fontSize,
              lineHeight: Math.round(fontSize * 1.06),
              letterSpacing: -fontSize * 0.025,
            },
            webNoWrapStyle,
          ]}
          className="text-center font-display-black text-cream"
        >
          {word?.text ?? '—'}
        </Text>

        <View className="absolute bottom-5 left-5 right-5 flex-row items-center justify-center">
          <Text className="font-body-semibold text-[11px] tracking-wide text-white/35">
            Objasni drugačije ako zaglaviš
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
