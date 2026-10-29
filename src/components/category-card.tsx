import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { Category } from '@/types/game';

interface CategoryCardProps {
  category: Category;
  selected: boolean;
  onPress: () => void;
  variant?: 'featured' | 'compact';
  style?: StyleProp<ViewStyle>;
}

export function CategoryCard({
  category,
  selected,
  onPress,
  variant = 'featured',
  style,
}: CategoryCardProps) {
  const compact = variant === 'compact';

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      accessibilityLabel={`${category.title}, ${category.words.length} pojmova`}
      onPress={onPress}
      style={({ pressed }) => [
        style,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <LinearGradient
        colors={selected ? category.gradient : ['#141A30', '#11162A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          minHeight: compact ? 108 : 148,
          borderRadius: compact ? 20 : 22,
          borderWidth: 1.5,
          borderColor: selected ? category.accent : 'rgba(255,255,255,0.08)',
          padding: compact ? 12 : 14,
          overflow: 'hidden',
        }}
      >
        <View
          pointerEvents="none"
          style={{ backgroundColor: category.accent }}
          className={`absolute -right-6 -top-6 rounded-full opacity-[0.09] ${
            compact ? 'h-16 w-16' : 'h-20 w-20'
          }`}
        />

        <View className="flex-row items-start justify-between">
          <View
            style={{ backgroundColor: `${category.accent}1F` }}
            className={`items-center justify-center rounded-2xl ${
              compact ? 'h-8 w-8' : 'h-10 w-10'
            }`}
          >
            <Text className={compact ? 'text-base' : 'text-xl'}>{category.emoji}</Text>
          </View>

          <View
            style={
              selected
                ? { backgroundColor: category.accent }
                : undefined
            }
            className={`items-center justify-center rounded-full border ${
              compact ? 'h-5 w-5' : 'h-6 w-6'
            } ${
              selected
                ? 'border-transparent'
                : 'border-white/15 bg-white/[0.06]'
            }`}
          >
            <Ionicons
              name={selected ? 'checkmark' : 'add'}
              size={compact ? 12 : 14}
              color={selected ? '#080C1A' : '#7B849D'}
            />
          </View>
        </View>

        <View className="mt-auto pt-3">
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            numberOfLines={2}
            className={`font-display-bold text-cream ${
              compact
                ? 'text-[12.5px] leading-[15px] tracking-[-0.2px]'
                : 'text-[16px] leading-[18px] tracking-[-0.3px]'
            }`}
          >
            {category.title}
          </Text>

          {compact ? null : (
            <Text
              numberOfLines={1}
              className="mt-0.5 font-body text-[9.5px] text-muted"
            >
              {category.subtitle}
            </Text>
          )}

          <Text
            style={{ color: selected ? category.accent : '#737C96' }}
            className={`font-body-bold uppercase ${
              compact
                ? 'mt-1 text-[7.5px] tracking-[0.8px]'
                : 'mt-2 text-[8.5px] tracking-[1.2px]'
            }`}
          >
            {category.words.length} pojmova
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
