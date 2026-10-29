import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientOrb, ScreenBackground } from '@/components/screen-background';
import { CategoryCard } from '@/components/category-card';
import { PrimaryButton } from '@/components/primary-button';
import { SettingRow } from '@/components/setting-row';
import { CATEGORIES, CATEGORY_GROUPS, getCategory } from '@/constants/categories';
import {
  DURATIONS,
  formatCategoryCount,
  type RoundDuration,
} from '@/lib/utils';
import { useGame } from '@/providers/game-provider';
import { useMemo, useState } from 'react';
import type { CategoryId } from '@/types/game';

const STEPS = [
  { number: '1', label: 'Izaberi kategorije' },
  { number: '2', label: 'Stavi na čelo' },
  { number: '3', label: 'Naginji i pogađaj' },
];

export default function HomeScreen() {
  const router = useRouter();
  const {
    startRound,
    soundEnabled,
    setSoundEnabled,
    hapticsEnabled,
    setHapticsEnabled,
    triggerFeedback,
  } = useGame();

  const [selectedIds, setSelectedIds] = useState<CategoryId[]>(['domestic-movies']);
  const [duration, setDuration] = useState<RoundDuration>(60);

  const selectedCategories = useMemo(
    () => CATEGORIES.filter((category) => selectedIds.includes(category.id)),
    [selectedIds],
  );
  const wordCount = selectedCategories.reduce(
    (total, category) => total + category.words.length,
    0,
  );

  const toggleCategory = (categoryId: CategoryId) => {
    const isSelected = selectedIds.includes(categoryId);

    if (isSelected && selectedIds.length === 1) {
      triggerFeedback('warning');
      return;
    }

    const nextIds = isSelected
      ? selectedIds.filter((id) => id !== categoryId)
      : [...selectedIds, categoryId];

    // Keep the deck order stable regardless of the tap order.
    setSelectedIds(
      CATEGORIES.filter((category) => nextIds.includes(category.id)).map(
        (category) => category.id,
      ),
    );
    triggerFeedback('light');
  };

  const handleStart = () => {
    if (selectedIds.length === 0) return;
    triggerFeedback('medium');
    startRound(selectedIds, duration);
    router.push('/game');
  };

  return (
    <ScreenBackground>
      <AmbientOrb color="#FF6B6B" size={250} top={-80} right={-90} />
      <AmbientOrb color="#DDFA50" size={220} top={510} left={-170} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 20 }}
        >
          <View className="flex-row items-center justify-between pt-3">
            <View className="flex-row items-center gap-2.5">
              <View className="-rotate-6 items-center justify-center rounded-2xl bg-lime px-2.5 py-2">
                <Text className="font-display-black text-[19px] leading-none text-ink">CH</Text>
              </View>
              <Text className="font-display-black text-[23px] tracking-[-0.6px] text-cream">
                CHARADES
              </Text>
            </View>
            <View className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <Text className="font-body-bold text-[9px] uppercase tracking-[1.6px] text-white/55">
                Party game
              </Text>
            </View>
          </View>

          <View className="mt-11">
            <View className="flex-row items-center gap-2 self-start rounded-full border border-lime/20 bg-lime/10 px-3 py-1.5">
              <View className="h-1.5 w-1.5 rounded-full bg-lime" />
              <Text className="font-body-bold text-[10px] uppercase tracking-[1.8px] text-lime">
                Jedan telefon · cela ekipa
              </Text>
            </View>

            <Text className="mt-5 font-display-black text-[53px] leading-[51px] tracking-[-2px] text-cream">
              Pokaži.{'\n'}Pogodi.{' '}
              <Text className="text-lime">Pobedi.</Text>
            </Text>

            <Text className="mt-5 max-w-[330px] font-body text-[15px] leading-6 text-muted">
              Telefon ide na čelo, ekipa objašnjava pojam, a ti pogađaš. Nagini dole za
              pogodak i skupi što više poena pre nego što vreme istekne.
            </Text>
          </View>

          <View className="mt-7 flex-row gap-2">
            {STEPS.map((step) => (
              <View
                key={step.number}
                className="flex-1 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3"
              >
                <View className="h-6 w-6 items-center justify-center rounded-lg bg-lime/15">
                  <Text className="font-body-extrabold text-[11px] text-lime">
                    {step.number}
                  </Text>
                </View>
                <Text className="mt-2 font-body-semibold text-[10.5px] leading-4 text-white/65">
                  {step.label}
                </Text>
              </View>
            ))}
          </View>

          <View className="mt-10">
            <View className="flex-row items-start justify-between">
              <Text className="font-body-bold text-[10px] uppercase tracking-[2px] text-white/35">
                Kategorije
              </Text>
              <View className="shrink-0 items-end">
                <View className="rounded-full border border-lime/20 bg-lime/10 px-2.5 py-1">
                  <Text className="font-body-bold text-[9px] uppercase tracking-[0.8px] text-lime">
                    {selectedIds.length} {formatCategoryCount(selectedIds.length)}
                  </Text>
                </View>
                <Text className="mt-1 font-body text-[10px] text-muted">
                  {wordCount} pojmova
                </Text>
              </View>
            </View>
            <Text className="mt-2 font-display-bold text-[25px] tracking-[-0.6px] text-cream">
              Šta objašnjavamo?
            </Text>
            <Text className="mt-2 font-body text-[11px] leading-[17px] text-white/35">
              Izaberi jednu ili više kategorija — pojmovi se mešaju u istoj rundi.
            </Text>
          </View>

          {CATEGORY_GROUPS.map((group) => {
            const groupCategories = group.ids.map((id) => getCategory(id));
            const compact = group.id === 'other';

            return (
              <View key={group.id} className="mt-5">
                <View className="flex-row items-center justify-between">
                  <Text className="font-body-bold text-[9px] uppercase tracking-[1.8px] text-white/35">
                    {group.title}
                  </Text>
                  <Text className="font-body text-[9px] text-white/25">
                    {groupCategories.length} {formatCategoryCount(groupCategories.length)}
                  </Text>
                </View>

                <View
                  className={`mt-2.5 flex-row ${
                    compact ? 'gap-2' : 'flex-wrap justify-between gap-y-2.5'
                  }`}
                >
                  {groupCategories.map((category) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      selected={selectedIds.includes(category.id)}
                      onPress={() => toggleCategory(category.id)}
                      variant={compact ? 'compact' : 'featured'}
                      style={compact ? { flex: 1 } : { width: '48.4%' }}
                    />
                  ))}
                </View>
              </View>
            );
          })}

          <View className="mt-8 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Ionicons name="timer-outline" size={17} color="#959DB5" />
              <Text className="font-body-bold text-[14px] text-cream">Trajanje runde</Text>
            </View>
            <Text className="font-body text-[11px] text-muted">
              {duration === 60 ? 'Preporučeno' : 'Za veće ekipe'}
            </Text>
          </View>

          <View className="mt-3 flex-row gap-2.5">
            {DURATIONS.map((value) => {
              const active = duration === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setDuration(value);
                    triggerFeedback('light');
                  }}
                  className={`flex-1 items-center rounded-2xl border py-3.5 ${
                    active
                      ? 'border-lime bg-lime'
                      : 'border-white/10 bg-white/[0.045]'
                  }`}
                >
                  <Text
                    className={`font-display-black text-lg ${
                      active ? 'text-ink' : 'text-cream'
                    }`}
                  >
                    {value}s
                  </Text>
                  <Text
                    className={`mt-0.5 font-body-bold text-[9px] uppercase tracking-[1.1px] ${
                      active ? 'text-ink/55' : 'text-muted'
                    }`}
                  >
                    {value === 60 ? 'brzo' : value === 90 ? 'standard' : 'dugo'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-7 rounded-[24px] border border-white/[0.07] bg-white/[0.035] px-4 py-2.5">
            <SettingRow
              icon="volume-high"
              title="Zvuk"
              subtitle="Odbrojavanje, poeni i kraj runde"
              value={soundEnabled}
              onValueChange={(value) => {
                setSoundEnabled(value);
                if (value) triggerFeedback('light');
              }}
            />
            <View className="ml-12 h-px bg-white/[0.06]" />
            <SettingRow
              icon="phone-portrait-outline"
              title="Vibracija"
              subtitle="Kratka potvrda svakog pogotka"
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
            />
          </View>

          <View className="mt-4 flex-row items-start gap-3 rounded-[24px] border border-lime/15 bg-lime/[0.055] p-4">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-lime/15">
              <Ionicons name="phone-portrait-outline" size={18} color="#DDFA50" />
            </View>
            <View className="flex-1">
              <Text className="font-body-bold text-[12px] text-cream">
                Telefon na čelo, ekran ka ekipi
              </Text>
              <Text className="mt-1 font-body text-[11px] leading-[17px] text-muted">
                Naginjanje nadole je tačan odgovor, a nagore preskakanje. Ako senzor nije
                dostupan, ekipa može da koristi dugmad na ekranu.
              </Text>
            </View>
          </View>

          <PrimaryButton
            label="Započni rundu"
            icon="play"
            onPress={handleStart}
            style={{ marginTop: 22 }}
          />

          <View className="mt-4 flex-row items-center justify-center gap-1.5">
            <Ionicons name="shield-checkmark-outline" size={13} color="#687089" />
            <Text className="font-body text-[10px] text-white/30">
              Bez naloga · bez interneta · samo igra
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
