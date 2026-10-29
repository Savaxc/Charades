import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';

import type { Category } from '@/types/game';

interface CategoryCardProps {
  category: Category;
  selected: boolean;
  onPress: () => void;
}

export function CategoryCard({ category, selected, onPress }: CategoryCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${category.title}, ${category.words.length} pojmova`}
      onPress={onPress}
      style={({ pressed }) => [
        { width: '48.4%', transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <LinearGradient
        colors={selected ? category.gradient : ['#141A30', '#11162A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          minHeight: 146,
          borderRadius: 24,
          borderWidth: 1.5,
          borderColor: selected ? category.accent : 'rgba(255,255,255,0.08)',
          padding: 16,
          overflow: 'hidden',
        }}
      >
        <View
          style={{ backgroundColor: `${category.accent}1F` }}
          className="h-11 w-11 items-center justify-center rounded-2xl"
        >
          <Text className="text-2xl">{category.emoji}</Text>
        </View>

        {selected ? (
          <View
            style={{ backgroundColor: category.accent }}
            className="absolute right-3.5 top-3.5 h-6 w-6 items-center justify-center rounded-full"
          >
            <Ionicons name="checkmark" size={15} color="#080C1A" />
          </View>
        ) : null}

        <View className="mt-auto pt-5">
          <Text className="font-display-bold text-xl text-cream">{category.title}</Text>
          <Text className="mt-0.5 font-body text-[11px] text-muted">{category.subtitle}</Text>
          <Text
            style={{ color: selected ? category.accent : '#737C96' }}
            className="mt-2 font-body-bold text-[9px] uppercase tracking-[1.4px]"
          >
            {category.words.length} pojmova
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
