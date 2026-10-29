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
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientOrb, ScreenBackground } from '@/components/screen-background';
import { WordCard } from '@/components/word-card';
import { useTiltControls } from '@/hooks/use-tilt-controls';
import { formatScore, formatTime } from '@/lib/utils';
import { useGame } from '@/providers/game-provider';
import type { Category, GameStatus } from '@/types/game';

type FlashKind = 'correct' | 'skip';
type SensorHint = 'checking' | 'ready' | 'missing';

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
        { flex: 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
      className={`h-[60px] flex-row items-center justify-center gap-3 rounded-[20px] border px-4 ${
        correct ? 'border-lime bg-lime' : 'border-amber/35 bg-amber/[0.09]'
      }`}
    >
      <View
        className={`h-9 w-9 items-center justify-center rounded-full ${
          correct ? 'bg-ink' : 'bg-amber/15'
        }`}
      >
        <Ionicons
          name={correct ? 'arrow-down' : 'arrow-up'}
          size={19}
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
    </Pressable>
  );
}

function SensorStatus({
  hint,
  label,
  compact = false,
}: {
  hint: SensorHint;
  label?: string;
  compact?: boolean;
}) {
  const color =
    hint === 'ready' ? 'bg-lime' : hint === 'missing' ? 'bg-coral' : 'bg-white/30';
  const text =
    label ??
    (hint === 'ready'
      ? 'Senzor aktivan'
      : hint === 'missing'
        ? 'Koristi dugmad'
        : 'Senzor…');

  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`h-1.5 w-1.5 rounded-full ${color}`} />
      <Text
        className={`font-body text-white/40 ${compact ? 'text-[9px]' : 'text-[10px]'}`}
      >
        {text}
      </Text>
    </View>
  );
}

function RotateOverlay({
  status,
  category,
  onExit,
}: {
  status: GameStatus;
  category: Category;
  onExit: () => void;
}) {
  const paused = status === 'PAUSED';

  return (
    <ScreenBackground>
      <StatusBar hidden />
      <AmbientOrb color={category.accent} size={280} top={-140} left={-120} />
      <SafeAreaView
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
      >
        <View
          style={{ borderColor: `${category.accent}44`, backgroundColor: `${category.accent}12` }}
          className="mb-7 flex-row items-center gap-2 rounded-full border px-3.5 py-1.5"
        >
          <Text className="text-[13px]">{category.emoji}</Text>
          <Text
            style={{ color: category.accent }}
            className="font-body-bold text-[10px] uppercase tracking-[1.3px]"
          >
            {category.title}
          </Text>
        </View>

        <View className="h-24 w-24 items-center justify-center rounded-[30px] border border-lime/25 bg-lime/10">
          <Ionicons name="phone-landscape-outline" size={48} color="#DDFA50" />
        </View>

        <Text className="mt-7 text-center font-display-black text-[38px] tracking-[-1.4px] text-cream">
          Okreni telefon
        </Text>
        <Text className="mt-2 max-w-[330px] text-center font-body text-[13px] leading-5 text-muted">
          {paused
            ? 'Runda je pauzirana. Postavi telefon horizontalno da nastaviš.'
            : 'Runda se igra horizontalno kako bi pojmovi bili što veći i čitljiviji.'}
        </Text>

        <View className="mt-7 flex-row items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
          <Ionicons name="sync-outline" size={13} color="#DDFA50" />
          <Text className="font-body-semibold text-[10px] uppercase tracking-[1px] text-white/55">
            Ekran mora biti horizontalan
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Otkaži rundu"
          onPress={onExit}
          className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-5 py-3"
        >
          <Text className="font-body-bold text-[12px] text-cream">Otkaži rundu</Text>
        </Pressable>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function CountdownView({
  category,
  countdown,
  duration,
  sensorHint,
  countScale,
  countOpacity,
  onExit,
}: {
  category: Category;
  countdown: number;
  duration: number;
  sensorHint: SensorHint;
  countScale: Animated.Value;
  countOpacity: Animated.Value;
  onExit: () => void;
}) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 18, paddingVertical: 8 }}>
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zatvori pripremu"
          onPress={onExit}
          className="h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5"
        >
          <Ionicons name="close" size={19} color="#FFF9E9" />
        </Pressable>

        <View className="flex-row items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
          <View className="h-1.5 w-1.5 rounded-full bg-lime" />
          <Text className="font-body-bold text-[9px] uppercase tracking-[1.5px] text-white/55">
            Priprema · {duration}s
          </Text>
        </View>

        <SensorStatus
          hint={sensorHint}
          label={
            sensorHint === 'missing'
              ? 'Senzor nije dostupan'
              : 'Drži telefon mirno'
          }
        />
      </View>

      <View className="flex-1 flex-row items-center gap-6 px-2">
        <View className="flex-1 items-center justify-center">
          <View
            style={{
              borderColor: `${category.accent}44`,
              backgroundColor: `${category.accent}12`,
            }}
            className="mb-3 flex-row items-center gap-2 rounded-full border px-3 py-1.5"
          >
            <Text className="text-[12px]">{category.emoji}</Text>
            <Text
              style={{ color: category.accent }}
              className="font-body-bold text-[9px] uppercase tracking-[1.3px]"
            >
              {category.title}
            </Text>
          </View>

          <Text className="font-body-bold text-[10px] uppercase tracking-[2.6px] text-white/35">
            Spremi se
          </Text>

          <Animated.View
            style={{
              height: 150,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: countOpacity,
              transform: [{ scale: countScale }],
            }}
          >
            <Text className="font-display-black text-[126px] leading-[142px] tracking-[-7px] text-lime">
              {countdown}
            </Text>
          </Animated.View>
        </View>

        <View className="flex-[1.15] justify-center">
          <Text className="font-display-black text-[32px] leading-[35px] tracking-[-1px] text-cream">
            Telefon na čelo,{'\n'}ekran ka ekipi.
          </Text>
          <Text className="mt-2 font-body text-[12px] leading-[18px] text-muted">
            Drži telefon mirno dok traje odbrojavanje. Senzor se kalibriše u tom položaju.
          </Text>

          <View className="mt-4 flex-row gap-2.5">
            <View className="flex-1 rounded-[18px] border border-white/10 bg-white/[0.045] px-3 py-2.5">
              <View className="flex-row items-center gap-2">
                <View className="h-7 w-7 items-center justify-center rounded-full bg-lime/15">
                  <Ionicons name="arrow-down" size={14} color="#DDFA50" />
                </View>
                <View>
                  <Text className="font-body-bold text-[10px] uppercase tracking-[0.8px] text-cream">
                    Nadole
                  </Text>
                  <Text className="font-body text-[9px] text-muted">tačan odgovor</Text>
                </View>
              </View>
            </View>

            <View className="flex-1 rounded-[18px] border border-white/10 bg-white/[0.045] px-3 py-2.5">
              <View className="flex-row items-center gap-2">
                <View className="h-7 w-7 items-center justify-center rounded-full bg-amber/15">
                  <Ionicons name="arrow-up" size={14} color="#FFC857" />
                </View>
                <View>
                  <Text className="font-body-bold text-[10px] uppercase tracking-[0.8px] text-cream">
                    Nagore
                  </Text>
                  <Text className="font-body text-[9px] text-muted">preskoči pojam</Text>
                </View>
              </View>
            </View>
          </View>

          <Text className="mt-3 font-body text-[9px] text-white/30">
            Ako senzor ne reaguje, koristi dugmad ispod pojmova.
          </Text>
        </View>
      </View>
    </View>
  );
}

function PauseOverlay({
  onResume,
  onFinish,
  onExit,
}: {
  onResume: () => void;
  onFinish: () => void;
  onExit: () => void;
}) {
  return (
    <View className="absolute inset-0 items-center justify-center bg-ink/95 px-6">
      <View
        style={{ width: '100%', maxWidth: 660 }}
        className="rounded-[30px] border border-white/10 bg-surface p-6"
      >
        <View className="flex-row items-center gap-6">
          <View className="flex-1">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-lime/10">
              <Ionicons name="pause" size={24} color="#DDFA50" />
            </View>
            <Text className="mt-3 font-display-black text-[34px] tracking-[-1px] text-cream">
              Pauza
            </Text>
            <Text className="mt-1 max-w-[300px] font-body text-[12px] leading-[18px] text-muted">
              Vreme je zaustavljeno. Nastavi kada je ekipa spremna.
            </Text>
          </View>

          <View style={{ width: 240 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nastavi rundu"
              onPress={onResume}
              className="h-[52px] flex-row items-center justify-center gap-2 rounded-2xl bg-lime"
            >
              <Ionicons name="play" size={17} color="#080C1A" />
              <Text className="font-display-black text-[15px] text-ink">
                Nastavi rundu
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Završi rundu"
              onPress={onFinish}
              className="mt-2 h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5"
            >
              <Text className="font-body-bold text-[12px] text-cream">
                Završi i vidi rezultat
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Izađi na početni ekran"
              onPress={onExit}
              className="mt-2 items-center py-1.5"
            >
              <Text className="font-body-semibold text-[10px] text-white/35">
                Izađi bez rezultata
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function FinishView({ score }: { score: number }) {
  return (
    <View className="flex-1 items-center justify-center px-7">
      <View className="flex-row items-center gap-6">
        <View className="h-[86px] w-[86px] items-center justify-center rounded-[26px] border border-lime/25 bg-lime/10">
          <Ionicons name="trophy-outline" size={40} color="#DDFA50" />
        </View>
        <View>
          <Text className="font-display-black text-[46px] leading-[48px] tracking-[-2px] text-cream">
            Vreme je!
          </Text>
          <Text className="mt-1 font-display-bold text-[23px] text-lime">
            {formatScore(score)} {score === 1 ? 'poen' : 'poena'}
          </Text>
          <Text className="mt-1 font-body text-[12px] text-muted">
            Prebacujem rezultat runde…
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function GameScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
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
  const [sensorHint, setSensorHint] = useState<SensorHint>('checking');
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
    active: state.status === 'PLAYING' && isLandscape,
    calibrating: state.status === 'COUNTDOWN' && isLandscape,
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

  // Keep the round paused while the phone is upright. On native the screen is
  // locked to landscape, so this mainly covers web and refused iOS locks.
  useEffect(() => {
    if (!isLandscape && state.status === 'PLAYING') {
      pauseRound();
    }
  }, [isLandscape, pauseRound, state.status]);

  // 3 · 2 · 1 countdown only starts once the game is actually landscape.
  useEffect(() => {
    if (state.status !== 'COUNTDOWN' || !isLandscape) return;

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
  }, [isLandscape, playSound, startPlaying, state.status]);

  useEffect(() => {
    if (state.status !== 'COUNTDOWN' || !isLandscape) return;

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
  }, [countdown, countOpacity, countScale, isLandscape, state.status]);

  // Precise-ish round clock. The reducer derives remaining time from a deadline,
  // so a missed interval cannot make the game run long.
  useEffect(() => {
    if (state.status !== 'PLAYING' || !isLandscape) return;

    const interval = setInterval(tickRound, 200);
    return () => clearInterval(interval);
  }, [isLandscape, state.status, tickRound]);

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

  if (!isLandscape) {
    return (
      <RotateOverlay status={state.status} category={category} onExit={handleExit} />
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
      <AmbientOrb color={category.accent} size={300} top={-160} right={-150} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
        {state.status === 'COUNTDOWN' ? (
          <CountdownView
            category={category}
            countdown={countdown}
            duration={state.duration}
            sensorHint={sensorHint}
            countScale={countScale}
            countOpacity={countOpacity}
            onExit={handleExit}
          />
        ) : state.status === 'SUMMARY' ? (
          <FinishView score={state.score} />
        ) : (
          <View className="flex-1 px-4 py-2">
            <View className="flex-row items-center gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pauza"
                onPress={pauseRound}
                className="h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5"
              >
                <Ionicons name="pause" size={17} color="#FFF9E9" />
              </Pressable>

              <View className="flex-row items-baseline gap-1.5">
                <Text className="font-body-bold text-[8px] uppercase tracking-[1.5px] text-white/35">
                  Preostalo
                </Text>
                <Text
                  className={`font-display-black text-[24px] leading-[26px] tracking-[-0.8px] ${
                    urgent ? 'text-coral' : 'text-cream'
                  }`}
                >
                  {formatTime(remainingSeconds)}
                </Text>
              </View>

              <View className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/[0.075]">
                <View
                  style={{
                    width: `${progress * 100}%`,
                    backgroundColor: urgent ? '#FF6B6B' : category.accent,
                  }}
                  className="h-full rounded-full"
                />
              </View>

              <View className="flex-row items-center gap-1.5">
                <Text className="font-body-bold text-[8px] uppercase tracking-[1.4px] text-white/35">
                  Poeni
                </Text>
                <Text className="font-display-black text-[23px] leading-[25px] text-lime">
                  {formatScore(state.score)}
                </Text>
              </View>

              <SensorStatus hint={sensorHint} compact />
            </View>

            <View className="mt-2 flex-1">
              <WordCard
                word={currentWord}
                category={category}
                index={state.currentIndex}
                compact
              />
            </View>

            <View className="mt-2 flex-row gap-2.5">
              <ActionButton kind="skip" onPress={handleSkip} />
              <ActionButton kind="correct" onPress={handleCorrect} />
            </View>

            {state.status === 'PAUSED' ? (
              <PauseOverlay
                onResume={resumeRound}
                onFinish={finishRound}
                onExit={handleExit}
              />
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
