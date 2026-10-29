import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Text,
  View,
  type LayoutChangeEvent,
  type TextStyle,
} from 'react-native';

import type { Category, GameWord } from '@/types/game';

interface WordCardProps {
  word: GameWord | null;
  category: Category;
  index: number;
  /** Landscape game layout: bigger type, tighter chrome, no hint line. */
  compact?: boolean;
}

const webNoWrapStyle =
  Platform.OS === 'web'
    ? ({ overflowWrap: 'normal', wordBreak: 'keep-all' } as unknown as TextStyle)
    : undefined;

function countLines(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length === 0) return 1;

  let lines = 1;
  let current = words[0].length;

  for (let index = 1; index < words.length; index += 1) {
    const wordLength = words[index].length;

    if (current + 1 + wordLength <= maxChars) {
      current += 1 + wordLength;
    } else {
      lines += 1;
      current = wordLength;
    }
  }

  return lines;
}

/**
 * Picks the largest font size that fits both the width of the longest word and
 * the available card height. This replaces `adjustsFontSizeToFit` on web and
 * keeps long words such as "Fotografisanje" on a single line.
 */
function getWordFontSize(
  text: string,
  width: number,
  height: number,
  compact: boolean,
) {
  if (width <= 0 || height <= 0) {
    return compact ? 62 : 52;
  }

  const horizontalPadding = compact ? 40 : 48;
  const verticalReserved = compact ? 64 : 118;
  const sizeCap = compact ? 104 : 76;
  const minSize = 20;

  const availableWidth = Math.max(90, width - horizontalPadding);
  const availableHeight = Math.max(44, height - verticalReserved);
  const longestWord = text
    .split(/[\s-]+/)
    .reduce((max, part) => Math.max(max, part.length), 1);
  const startSize = Math.max(
    minSize,
    Math.min(
      sizeCap,
      Math.floor(availableHeight / 1.08),
      Math.floor(availableWidth / (longestWord * 0.51)),
    ),
  );

  for (let size = startSize; size >= minSize; size -= 2) {
    const characterWidth = size * 0.51;

    if (longestWord * characterWidth > availableWidth) continue;

    const maxChars = Math.max(1, Math.floor(availableWidth / characterWidth));
    const lines = countLines(text, maxChars);

    if (lines > 3) continue;
    if (lines * size * 1.08 <= availableHeight) return size;
  }

  return minSize;
}

export function WordCard({ word, category, index, compact = false }: WordCardProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const text = word?.text ?? '—';
  const fontSize = useMemo(
    () => getWordFontSize(text, size.width, size.height, compact),
    [compact, size.height, size.width, text],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      current.width === width && current.height === height ? current : { width, height },
    );
  };

  useEffect(() => {
    translateY.setValue(compact ? 16 : 22);
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
  }, [compact, opacity, translateY, word?.id]);

  return (
    <Animated.View
      onLayout={handleLayout}
      style={{
        flex: 1,
        opacity,
        transform: [{ translateY }],
        overflow: 'hidden',
        borderRadius: compact ? 28 : 32,
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
          paddingHorizontal: compact ? 20 : 24,
          paddingTop: compact ? 48 : 32,
          paddingBottom: compact ? 14 : 32,
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

        <View
          className={`absolute flex-row items-center justify-between ${
            compact ? 'left-4 right-4 top-3.5' : 'left-5 right-5 top-5'
          }`}
        >
          <View
            style={{ borderColor: `${category.accent}55`, backgroundColor: `${category.accent}14` }}
            className={`flex-row items-center rounded-full border ${
              compact ? 'gap-1 px-2.5 py-1' : 'gap-1.5 px-3 py-1.5'
            }`}
          >
            <Text className={compact ? 'text-[10px]' : 'text-xs'}>{category.emoji}</Text>
            <Text
              style={{ color: category.accent }}
              className={`font-body-bold uppercase ${
                compact
                  ? 'text-[8px] tracking-[1px]'
                  : 'text-[10px] tracking-[1.2px]'
              }`}
            >
              {category.title}
            </Text>
          </View>
          <Text
            className={`font-body-bold uppercase text-white/30 ${
              compact ? 'text-[9px] tracking-[1.3px]' : 'text-[10px] tracking-[1.5px]'
            }`}
          >
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
              letterSpacing: -fontSize * 0.028,
            },
            webNoWrapStyle,
          ]}
          className="text-center font-display-black text-cream"
        >
          {text}
        </Text>

        {compact ? null : (
          <View className="absolute bottom-5 left-5 right-5 flex-row items-center justify-center">
            <Text className="font-body-semibold text-[11px] tracking-wide text-white/35">
              Objasni drugačije ako zaglaviš
            </Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}
