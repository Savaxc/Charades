import { Ionicons } from '@expo/vector-icons';
import { Switch, Text, View } from 'react-native';

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function SettingRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}: SettingRowProps) {
  return (
    <View className="flex-row items-center gap-3 py-2">
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-white/5">
        <Ionicons name={icon} size={17} color="#DDFA50" />
      </View>
      <View className="flex-1">
        <Text className="font-body-bold text-sm text-cream">{title}</Text>
        <Text className="mt-0.5 font-body text-[11px] text-muted">{subtitle}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#2A3048', true: '#788B31' }}
        thumbColor={value ? '#DDFA50' : '#9199B0'}
        ios_backgroundColor="#2A3048"
      />
    </View>
  );
}
