import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientOrb, ScreenBackground } from '@/components/screen-background';
import { PrimaryButton } from '@/components/primary-button';
import { getCategory } from '@/constants/categories';
import { formatCategoryCount, formatScore } from '@/lib/utils';
import { useGame } from '@/providers/game-provider';

function longestStreak(statuses: Array<'correct' | 'skipped'>): number {
  let longest = 0;
  let current = 0;

  for (const status of statuses) {
    if (status === 'correct') {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

export default function SummaryScreen() {
  const router = useRouter();
  const { state, category, categories, startRound, resetRound, triggerFeedback } = useGame();

  const results = state.results;
  const correct = results.filter((result) => result.status === 'correct').length;
  const skipped = results.length - correct;
  const accuracy = results.length > 0 ? Math.round((correct / results.length) * 100) : 0;
  const streak = useMemo(
    () => longestStreak(results.map((result) => result.status)),
    [results],
  );
  const hasRound = state.status === 'SUMMARY' && state.categoryIds.length > 0;

  const handleReplay = () => {
    if (state.categoryIds.length === 0) return;
    triggerFeedback('medium');
    startRound(state.categoryIds, state.duration);
    router.replace('/game');
  };

  const handleHome = () => {
    resetRound();
    if (router.canDismiss()) {
      router.dismissTo('/');
    } else {
      router.replace('/');
    }
  };

  if (!hasRound) {
    return (
      <ScreenBackground>
        <StatusBar style="light" />
        <SafeAreaView
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
        >
          <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-white/5">
            <Ionicons name="document-text-outline" size={30} color="#959DB5" />
          </View>
          <Text className="mt-5 text-center font-display-black text-[30px] tracking-[-1px] text-cream">
            Nema rezultata
          </Text>
          <Text className="mt-2 text-center font-body text-[13px] leading-5 text-muted">
            Odigraj rundu da bi ovde videla listu pojmova i ukupan skor.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nazad na početni ekran"
            onPress={handleHome}
            className="mt-6 rounded-2xl bg-lime px-6 py-3.5"
          >
            <Text className="font-display-black text-[14px] text-ink">Nazad na početak</Text>
          </Pressable>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  const headline =
    correct >= 15 ? 'Ekipa je u formi!' : correct >= 8 ? 'Odlična runda!' : 'Dobra igra!';

  return (
    <ScreenBackground colors={[category.gradient[0], '#080C1A', '#080C1A']}>
      <StatusBar style="light" />
      <AmbientOrb color={category.accent} size={280} top={-120} right={-130} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 24 }}
        >
          <View className="flex-row items-center justify-between pt-3">
            <View
              style={{
                borderColor: `${category.accent}44`,
                backgroundColor: `${category.accent}12`,
              }}
              className="flex-row items-center gap-2 rounded-full border px-3.5 py-2"
            >
              <View className="flex-row items-center gap-0.5">
                {categories.slice(0, 3).map((item) => (
                  <Text key={item.id} className="text-[13px]">
                    {item.emoji}
                  </Text>
                ))}
                {categories.length > 3 ? (
                  <Text className="ml-0.5 font-body-bold text-[8px] text-white/45">
                    +{categories.length - 3}
                  </Text>
                ) : null}
              </View>
              <Text
                style={{ color: category.accent }}
                className="font-body-bold text-[10px] uppercase tracking-[1.3px]"
              >
                {categories.length === 1
                  ? categories[0].title
                  : `${categories.length} ${formatCategoryCount(categories.length)}`}
              </Text>
            </View>
            <Text className="font-body-bold text-[10px] uppercase tracking-[1.6px] text-white/35">
              {state.duration}s runda
            </Text>
          </View>

          <View className="mt-9 items-center">
            <View
              style={{ borderColor: `${category.accent}38`, backgroundColor: `${category.accent}12` }}
              className="h-16 w-16 items-center justify-center rounded-[22px] border"
            >
              <Ionicons name="trophy" size={29} color={category.accent} />
            </View>
            <Text className="mt-5 font-body-bold text-[10px] uppercase tracking-[2.4px] text-white/35">
              Runda završena
            </Text>
            <Text className="mt-2 text-center font-display-black text-[38px] leading-[40px] tracking-[-1.4px] text-cream">
              {headline}
            </Text>
            <Text className="mt-2 text-center font-body text-[12px] text-muted">
              Svaka reč je zabeležena. Vreme je da vidimo učinak.
            </Text>

            <View className="mt-7 flex-row items-end gap-2">
              <Text className="font-display-black text-[92px] leading-[88px] tracking-[-6px] text-lime">
                {formatScore(state.score)}
              </Text>
              <Text className="mb-3 font-body-bold text-[13px] text-lime/60">
                {state.score === 1 ? 'poen' : 'poena'}
              </Text>
            </View>
          </View>

          <View className="mt-7 flex-row gap-2.5">
            <View className="flex-1 rounded-[20px] border border-white/[0.07] bg-white/[0.045] px-3.5 py-3.5">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="checkmark-circle" size={14} color="#DDFA50" />
                <Text className="font-body-bold text-[9px] uppercase tracking-[1.1px] text-white/40">
                  Tačno
                </Text>
              </View>
              <Text className="mt-1.5 font-display-black text-[23px] text-cream">{correct}</Text>
            </View>

            <View className="flex-1 rounded-[20px] border border-white/[0.07] bg-white/[0.045] px-3.5 py-3.5">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="arrow-up-circle" size={14} color="#FFC857" />
                <Text className="font-body-bold text-[9px] uppercase tracking-[1.1px] text-white/40">
                  Preskočeno
                </Text>
              </View>
              <Text className="mt-1.5 font-display-black text-[23px] text-cream">{skipped}</Text>
            </View>

            <View className="flex-1 rounded-[20px] border border-white/[0.07] bg-white/[0.045] px-3.5 py-3.5">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="speedometer-outline" size={14} color="#7DD3FC" />
                <Text className="font-body-bold text-[9px] uppercase tracking-[1.1px] text-white/40">
                  Uspeh
                </Text>
              </View>
              <Text className="mt-1.5 font-display-black text-[23px] text-cream">{accuracy}%</Text>
            </View>
          </View>

          <View className="mt-3 flex-row items-center justify-between rounded-[18px] border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <View className="flex-row items-center gap-2">
              <Ionicons name="flame-outline" size={16} color="#FF6B6B" />
              <Text className="font-body-semibold text-[11px] text-white/55">
                Najduži niz pogodaka
              </Text>
            </View>
            <Text className="font-display-bold text-[15px] text-cream">{streak}</Text>
          </View>

          <View className="mt-8 flex-row items-center justify-between">
            <Text className="font-display-bold text-[22px] tracking-[-0.5px] text-cream">
              Sve reči
            </Text>
            <Text className="font-body text-[10px] text-muted">{results.length} ukupno</Text>
          </View>

          <View className="mt-3 gap-2">
            {results.length === 0 ? (
              <View className="items-center rounded-[22px] border border-white/[0.07] bg-white/[0.035] px-5 py-8">
                <Text className="text-2xl">🫥</Text>
                <Text className="mt-2 text-center font-body-semibold text-[12px] text-muted">
                  Nijedan pojam nije zabeležen. Sledeća runda ide bolje!
                </Text>
              </View>
            ) : (
              results.map((result, index) => {
                const isCorrect = result.status === 'correct';
                return (
                  <View
                    key={result.key}
                    className="flex-row items-center gap-3 rounded-[18px] border border-white/[0.055] bg-white/[0.035] px-3.5 py-3"
                  >
                    <View
                      className={`h-8 w-8 items-center justify-center rounded-full ${
                        isCorrect ? 'bg-lime/15' : 'bg-amber/15'
                      }`}
                    >
                      <Ionicons
                        name={isCorrect ? 'checkmark' : 'arrow-up'}
                        size={15}
                        color={isCorrect ? '#DDFA50' : '#FFC857'}
                      />
                    </View>
                    <Text className="flex-1 font-body-semibold text-[13px] text-cream">
                      {result.text}
                    </Text>
                    <Text className="text-[11px] opacity-70">
                      {getCategory(result.categoryId).emoji}
                    </Text>
                    <Text
                      className={`font-body-bold text-[9px] uppercase tracking-[0.8px] ${
                        isCorrect ? 'text-lime/70' : 'text-amber/70'
                      }`}
                    >
                      {isCorrect ? 'tačno' : 'preskočeno'}
                    </Text>
                    <Text className="w-5 text-right font-body text-[9px] text-white/20">
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                  </View>
                );
              })
            )}
          </View>

          <PrimaryButton
            label="Igraj ponovo"
            icon="refresh"
            onPress={handleReplay}
            style={{ marginTop: 24 }}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Promeni kategorije"
            onPress={handleHome}
            className="mt-2.5 h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045]"
          >
            <Text className="font-body-bold text-[12px] text-cream">Promeni kategorije</Text>
          </Pressable>

          <Text className="mt-5 text-center font-body text-[9px] uppercase tracking-[1.4px] text-white/20">
            Charades · party game
          </Text>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
