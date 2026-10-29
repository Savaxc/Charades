import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  BackHandler,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientOrb, ScreenBackground } from '@/components/screen-background';
import { WordCard } from '@/components/word-card';
import { useTiltControls } from '@/hooks/use-tilt-controls';
import { formatScore, formatTime } from '@/lib/utils';
import { useGame } from '@/providers/game-provider';

type FlashKind = 'correct' | 'skip';

function ActionButton({
  kind,
  onPress,
}: {
  kind: FlashKind;
  onPress: () => void;
}) {
  const correct = kind === 'correct';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={correct ? 'Tačan odgovor' : 'Preskoči pojam'}
      onPress={onPress}
      style={({ pressed }) => [
        { flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
      className={`h-[84px] justify-center rounded-[24px] border px-4 ${
        correct
          ? 'border-lime bg-lime'
          : 'border-amber/35 bg-amber/[0.09]'
      }`}
    >
      <View className="flex-row items-center gap-2.5">
        <View
          className={`h-10 w-10 items-center justify-center rounded-full ${
            correct ? 'bg-ink' : 'bg-amber/15'
          }`}
        >
          <Ionicons
            name={correct ? 'arrow-down' : 'arrow-up'}
            size={20}
            color={correct ? '#DDFA50' : '#FFC857'}
          />
        </View>
        <View>
          <Text
            className={`font-display-black text-[16px] ${
              correct ? 'text-ink' : 'text-amber'
            }`}
          >
            {correct ? 'TAČNO' : 'PRESKOČI'}
          </Text>
          <Text
            className={`mt-0.5 font-body-semibold text-[9px] uppercase tracking-[1px] ${
              correct ? 'text-ink/50' : 'text-amber/55'
            }`}
          >
            {correct ? 'nagni dole' : 'nagni gore'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function GameScreen() {
  const router = useRouter();
  const {
    state,
    category,
    currentWord,
    remainingSeconds,
    startPlaying,
    tickRound,
    registerCorrect,
    registerSkip,
    pauseRound,
    resumeRound,
    finishRound,
    resetRound,
    playSound,
    triggerFeedback,
  } = useGame();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    void activateKeepAwakeAsync('charades-round').catch(() => undefined);

    return () => {
      void deactivateKeepAwake('charades-round').catch(() => undefined);
    };
  }, []);

  const [countdown, setCountdown] = useState(3);
  const [flashKind, setFlashKind] = useState<FlashKind | null>(null);
  const [sensorHint, setSensorHint] = useState<'checking' | 'ready' | 'missing'>(
    'checking',
  );
  const finishedRef = useRef(false);
  const lastTickSecondRef = useRef<number | null>(null);
  const countScale = useRef(new Animated.Value(0.7)).current;
  const countOpacity = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;

  const showFlash = useCallback(
    (kind: FlashKind) => {
      setFlashKind(kind);
      flashOpacity.stopAnimation();
      flashOpacity.setValue(0.25);
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setFlashKind(null);
      });
    },
    [flashOpacity],
  );

  const handleCorrect = useCallback(() => {
    registerCorrect();
    showFlash('correct');
  }, [registerCorrect, showFlash]);

  const handleSkip = useCallback(() => {
    registerSkip();
    showFlash('skip');
  }, [registerSkip, showFlash]);

  const { sensorAvailable } = useTiltControls({
    active: state.status === 'PLAYING',
    calibrating: state.status === 'COUNTDOWN',
    onCorrect: handleCorrect,
    onSkip: handleSkip,
  });

  useEffect(() => {
    if (sensorAvailable === null) {
      setSensorHint('checking');
    } else {
      setSensorHint(sensorAvailable ? 'ready' : 'missing');
    }
  }, [sensorAvailable]);

  // 3 · 2 · 1 countdown.
  useEffect(() => {
    if (state.status !== 'COUNTDOWN') return;

    let current = 3;
    setCountdown(3);
    playSound('countdown');

    const interval = setInterval(() => {
      current -= 1;

      if (current > 0) {
        setCountdown(current);
        playSound('countdown');
        return;
      }

      clearInterval(interval);
      playSound('countdown');
      startPlaying();
    }, 1_000);

    return () => clearInterval(interval);
  }, [playSound, startPlaying, state.status]);

  useEffect(() => {
    if (state.status !== 'COUNTDOWN') return;

    countScale.setValue(0.7);
    countOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(countScale, {
        toValue: 1,
        damping: 12,
        stiffness: 190,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.timing(countOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [countdown, countOpacity, countScale, state.status]);

  // Precise-ish round clock. The reducer derives remaining time from a deadline,
  // so a missed interval cannot make the game run long.
  useEffect(() => {
    if (state.status !== 'PLAYING') return;

    const interval = setInterval(tickRound, 200);
    return () => clearInterval(interval);
  }, [state.status, tickRound]);

  useEffect(() => {
    if (state.status !== 'PLAYING') {
      if (remainingSeconds > 10) lastTickSecondRef.current = null;
      return;
    }

    if (remainingSeconds > 10) {
      lastTickSecondRef.current = null;
      return;
    }

    if (
      remainingSeconds > 0 &&
      lastTickSecondRef.current !== remainingSeconds
    ) {
      lastTickSecondRef.current = remainingSeconds;
      playSound('tick');
    }
  }, [playSound, remainingSeconds, state.status]);

  // Auto-pause when the phone is interrupted or the app is backgrounded.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && state.status === 'PLAYING') {
        pauseRound();
      }
    });

    return () => subscription.remove();
  }, [pauseRound, state.status]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (
        state.status === 'PLAYING' ||
        state.status === 'PAUSED' ||
        state.status === 'COUNTDOWN'
      ) {
        if (state.status === 'PLAYING') pauseRound();
        return true;
      }
      return false;
    });

    return () => subscription.remove();
  }, [pauseRound, state.status]);

  useEffect(() => {
    if (state.status !== 'SUMMARY' || finishedRef.current) return;

    finishedRef.current = true;
    playSound('end');
    triggerFeedback('warning');

    const timeout = setTimeout(() => {
      router.replace('/summary');
    }, 1_150);

    return () => clearTimeout(timeout);
  }, [playSound, router, state.status, triggerFeedback]);

  const handleExit = () => {
    resetRound();
    router.replace('/');
  };

  if (state.status === 'IDLE') {
    return (
      <ScreenBackground>
        <StatusBar style="light" />
        <SafeAreaView
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
        >
          <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-lime/10">
            <Ionicons name="game-controller-outline" size={30} color="#DDFA50" />
          </View>
          <Text className="mt-5 text-center font-display-black text-[30px] tracking-[-1px] text-cream">
            Nema aktivne runde
          </Text>
          <Text className="mt-2 text-center font-body text-[13px] leading-5 text-muted">
            Izaberi kategoriju i trajanje na početnom ekranu.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nazad na početni ekran"
            onPress={() => router.replace('/')}
            className="mt-6 rounded-2xl bg-lime px-6 py-3.5"
          >
            <Text className="font-display-black text-[14px] text-ink">Nazad na početak</Text>
          </Pressable>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  const progress =
    state.duration > 0
      ? Math.max(0, Math.min(1, state.remainingMs / (state.duration * 1_000)))
      : 0;
  const urgent = state.status === 'PLAYING' && remainingSeconds <= 10;
  const flashColor = flashKind === 'correct' ? '#DDFA50' : '#FFC857';

  return (
    <ScreenBackground colors={[category.gradient[0], '#080C1A', '#080C1A']}>
      <StatusBar hidden />
      <AmbientOrb color={category.accent} size={300} top={-130} right={-150} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {state.status === 'COUNTDOWN' ? (
          <View className="flex-1 px-5">
            <View className="flex-row items-center justify-between pt-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Zatvori pripremu"
                onPress={handleExit}
                className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5"
              >
                <Ionicons name="close" size={21} color="#FFF9E9" />
              </Pressable>

              <View className="flex-row items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2">
                <View className="h-1.5 w-1.5 rounded-full bg-lime" />
                <Text className="font-body-bold text-[9px] uppercase tracking-[1.5px] text-white/55">
                  Priprema
                </Text>
              </View>

              <View className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <Text className="font-body-bold text-[11px] text-white/55">
                  {state.duration}s
                </Text>
              </View>
            </View>

            <View className="flex-1 items-center justify-center pb-2">
              <View
                style={{
                  borderColor: `${category.accent}44`,
                  backgroundColor: `${category.accent}12`,
                }}
                className="mb-5 flex-row items-center gap-2 rounded-full border px-3.5 py-1.5"
              >
                <Text className="text-[13px]">{category.emoji}</Text>
                <Text
                  style={{ color: category.accent }}
                  className="font-body-bold text-[10px] uppercase tracking-[1.4px]"
                >
                  {category.title}
                </Text>
              </View>

              <Text className="font-body-bold text-[11px] uppercase tracking-[2.8px] text-white/35">
                Spremi se
              </Text>

              <Animated.View
                style={{
                  height: 158,
                  marginVertical: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: countOpacity,
                  transform: [{ scale: countScale }],
                }}
              >
                <Text className="font-display-black text-[132px] leading-[150px] tracking-[-7px] text-lime">
                  {countdown}
                </Text>
              </Animated.View>

              <Text className="mt-1 max-w-[290px] text-center font-display-bold text-[23px] leading-7 tracking-[-0.4px] text-cream">
                Telefon na čelo,{'\n'}ekran ka ekipi.
              </Text>

              <Text className="mt-3 text-center font-body text-[12px] leading-[18px] text-muted">
                Drži telefon mirno dok traje odbrojavanje.
              </Text>
            </View>

            <View className="mb-2 flex-row gap-3">
              <View className="flex-1 rounded-[22px] border border-white/10 bg-white/[0.045] p-3.5">
                <View className="mb-2 h-8 w-8 items-center justify-center rounded-full bg-lime/15">
                  <Ionicons name="arrow-down" size={16} color="#DDFA50" />
                </View>
                <Text className="font-body-bold text-[11px] uppercase tracking-[1px] text-cream">
                  Nadole
                </Text>
                <Text className="mt-0.5 font-body text-[10px] text-muted">tačan odgovor</Text>
              </View>

              <View className="flex-1 rounded-[22px] border border-white/10 bg-white/[0.045] p-3.5">
                <View className="mb-2 h-8 w-8 items-center justify-center rounded-full bg-amber/15">
                  <Ionicons name="arrow-up" size={16} color="#FFC857" />
                </View>
                <Text className="font-body-bold text-[11px] uppercase tracking-[1px] text-cream">
                  Nagore
                </Text>
                <Text className="mt-0.5 font-body text-[10px] text-muted">preskoči pojam</Text>
              </View>
            </View>

            <View className="mb-2 flex-row items-center justify-center gap-2 py-2">
              <View
                className={`h-1.5 w-1.5 rounded-full ${
                  sensorHint === 'ready'
                    ? 'bg-lime'
                    : sensorHint === 'missing'
                      ? 'bg-coral'
                      : 'bg-white/30'
                }`}
              />
              <Text className="font-body text-[10px] text-white/40">
                {sensorHint === 'ready'
                  ? 'Senzor spreman · drži telefon mirno'
                  : sensorHint === 'missing'
                    ? 'Senzor nije dostupan · koristite dugmad'
                    : 'Proveravam senzor…'}
              </Text>
            </View>
          </View>
        ) : state.status === 'SUMMARY' ? (
          <View className="flex-1 items-center justify-center px-7">
            <View className="h-20 w-20 items-center justify-center rounded-[28px] border border-lime/25 bg-lime/10">
              <Ionicons name="trophy-outline" size={38} color="#DDFA50" />
            </View>
            <Text className="mt-7 font-display-black text-[52px] leading-[55px] tracking-[-2px] text-cream">
              Vreme je!
            </Text>
            <Text className="mt-3 font-display-bold text-[24px] text-lime">
              {formatScore(state.score)} {state.score === 1 ? 'poen' : 'poena'}
            </Text>
            <Text className="mt-3 font-body text-[13px] text-muted">
              Prebacujem rezultat runde…
            </Text>
          </View>
        ) : (
          <View className="flex-1 px-5">
            <View className="flex-row items-center justify-between pt-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pauza"
                onPress={pauseRound}
                className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5"
              >
                <Ionicons name="pause" size={19} color="#FFF9E9" />
              </Pressable>

              <View className="items-center">
                <Text className="font-body-bold text-[8px] uppercase tracking-[1.7px] text-white/35">
                  Preostalo
                </Text>
                <Text
                  className={`mt-0.5 font-display-black text-[29px] leading-[30px] tracking-[-1px] ${
                    urgent ? 'text-coral' : 'text-cream'
                  }`}
                >
                  {formatTime(remainingSeconds)}
                </Text>
              </View>

              <View className="min-w-[64px] items-end">
                <Text className="font-body-bold text-[8px] uppercase tracking-[1.5px] text-white/35">
                  Poeni
                </Text>
                <Text className="mt-0.5 font-display-black text-[25px] leading-[26px] text-lime">
                  {formatScore(state.score)}
                </Text>
              </View>
            </View>

            <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.075]">
              <View
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: urgent ? '#FF6B6B' : category.accent,
                }}
                className="h-full rounded-full"
              />
            </View>

            <View className="mt-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5">
                <Ionicons name="eye-outline" size={12} color="#FFF9E9" />
                <Text className="font-body-bold text-[9px] uppercase tracking-[1.2px] text-white/55">
                  Pogodi pojam
                </Text>
              </View>

              <View className="flex-row items-center gap-1.5">
                <View
                  className={`h-1.5 w-1.5 rounded-full ${
                    sensorHint === 'ready'
                      ? 'bg-lime'
                      : sensorHint === 'missing'
                        ? 'bg-coral'
                        : 'bg-white/30'
                  }`}
                />
                <Text className="font-body text-[9px] text-white/35">
                  {sensorHint === 'ready'
                    ? 'Senzor aktivan'
                    : sensorHint === 'missing'
                      ? 'Koristi dugmad'
                      : 'Senzor…'}
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-1">
              <WordCard
                word={currentWord}
                category={category}
                index={state.currentIndex}
              />
            </View>

            <View className="mt-3.5 flex-row gap-3">
              <ActionButton kind="skip" onPress={handleSkip} />
              <ActionButton kind="correct" onPress={handleCorrect} />
            </View>

            <View className="h-7 flex-row items-center justify-center gap-1.5">
              <Ionicons name="information-circle-outline" size={12} color="#60677D" />
              <Text className="font-body text-[9px] text-white/30">
                Dodirni dugme ako senzor ne reaguje
              </Text>
            </View>

            {state.status === 'PAUSED' ? (
              <View className="absolute inset-0 items-center justify-center bg-ink/95 px-6">
                <View className="w-full rounded-[32px] border border-white/10 bg-surface p-6">
                  <View className="h-14 w-14 items-center justify-center rounded-2xl bg-lime/10">
                    <Ionicons name="pause" size={26} color="#DDFA50" />
                  </View>
                  <Text className="mt-5 font-display-black text-[36px] tracking-[-1px] text-cream">
                    Pauza
                  </Text>
                  <Text className="mt-2 font-body text-[13px] leading-5 text-muted">
                    Vreme je zaustavljeno. Nastavi kada je ekipa spremna.
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Nastavi rundu"
                    onPress={resumeRound}
                    className="mt-6 h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-lime"
                  >
                    <Ionicons name="play" size={18} color="#080C1A" />
                    <Text className="font-display-black text-[16px] text-ink">
                      Nastavi rundu
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Završi rundu"
                    onPress={finishRound}
                    className="mt-2.5 h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5"
                  >
                    <Text className="font-body-bold text-[12px] text-cream">
                      Završi i vidi rezultat
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Izađi na početni ekran"
                    onPress={handleExit}
                    className="mt-3 items-center py-2"
                  >
                    <Text className="font-body-semibold text-[11px] text-white/35">
                      Izađi bez rezultata
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        )}
      </SafeAreaView>

      {flashKind ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: flashColor,
            opacity: flashOpacity,
          }}
        />
      ) : null}
    </ScreenBackground>
  );
}

