import * as Haptics from 'expo-haptics';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type PropsWithChildren,
} from 'react';

import { CATEGORIES, getCategories, getCategory } from '@/constants/categories';
import { shuffle } from '@/lib/utils';
import type {
  Category,
  CategoryId,
  GameState,
  GameWord,
  ResultStatus,
  RoundResult,
} from '@/types/game';

type SoundName = 'countdown' | 'tick' | 'correct' | 'pass' | 'end';
type FeedbackName = 'success' | 'warning' | 'light' | 'medium';

const INITIAL_STATE: GameState = {
  status: 'IDLE',
  categoryIds: [],
  duration: 60,
  deck: [],
  currentIndex: 0,
  score: 0,
  results: [],
  remainingMs: 60_000,
  endsAt: null,
  startedAt: null,
};

type Action =
  | {
      type: 'START_ROUND';
      categoryIds: CategoryId[];
      duration: number;
      deck: GameWord[];
    }
  | { type: 'START_PLAYING'; now: number }
  | { type: 'TICK'; now: number }
  | { type: 'REGISTER'; status: ResultStatus; now: number }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'FINISH'; now: number }
  | { type: 'RESET' };

function addResult(state: GameState, status: ResultStatus, now: number): GameState {
  if (state.status !== 'PLAYING' || state.deck.length === 0) {
    return state;
  }

  const word = state.deck[state.currentIndex % state.deck.length];
  const result: RoundResult = {
    key: `${word.id}-${state.currentIndex}`,
    text: word.text,
    status,
    at: now,
    categoryId: word.categoryId,
  };

  return {
    ...state,
    currentIndex: state.currentIndex + 1,
    score: state.score + (status === 'correct' ? 1 : 0),
    results: [...state.results, result],
  };
}

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START_ROUND':
      return {
        ...INITIAL_STATE,
        status: 'COUNTDOWN',
        categoryIds: action.categoryIds,
        duration: action.duration,
        deck: action.deck,
        remainingMs: action.duration * 1_000,
      };

    case 'START_PLAYING':
      if (state.status !== 'COUNTDOWN') return state;
      return {
        ...state,
        status: 'PLAYING',
        startedAt: action.now,
        endsAt: action.now + state.remainingMs,
      };

    case 'TICK': {
      if (state.status !== 'PLAYING' || state.endsAt === null) return state;

      const remainingMs = Math.max(0, state.endsAt - action.now);

      if (remainingMs <= 0) {
        return {
          ...state,
          status: 'SUMMARY',
          remainingMs: 0,
          endsAt: null,
        };
      }

      return { ...state, remainingMs };
    }

    case 'REGISTER':
      return addResult(state, action.status, action.now);

    case 'PAUSE': {
      if (state.status !== 'PLAYING' || state.endsAt === null) return state;

      return {
        ...state,
        status: 'PAUSED',
        remainingMs: Math.max(0, state.endsAt - action.now),
        endsAt: null,
      };
    }

    case 'RESUME':
      if (state.status !== 'PAUSED') return state;
      return {
        ...state,
        status: 'PLAYING',
        endsAt: action.now + state.remainingMs,
      };

    case 'FINISH': {
      if (state.status === 'SUMMARY' || state.status === 'IDLE') return state;

      const remainingMs =
        state.endsAt === null ? state.remainingMs : Math.max(0, state.endsAt - action.now);

      return {
        ...state,
        status: 'SUMMARY',
        remainingMs,
        endsAt: null,
      };
    }

    case 'RESET':
      return INITIAL_STATE;

    default:
      return state;
  }
}

interface GameContextValue {
  state: GameState;
  categories: Category[];
  category: Category;
  currentCategory: Category;
  currentWord: GameWord | null;
  remainingSeconds: number;
  elapsedSeconds: number;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  startRound: (categoryIds: CategoryId[], duration: number) => void;
  startPlaying: () => void;
  tickRound: () => void;
  registerCorrect: () => void;
  registerSkip: () => void;
  pauseRound: () => void;
  resumeRound: () => void;
  finishRound: () => void;
  resetRound: () => void;
  playSound: (name: SoundName) => void;
  triggerFeedback: (name: FeedbackName) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  const countdownPlayer = useAudioPlayer(require('../../assets/sounds/countdown.wav'));
  const tickPlayer = useAudioPlayer(require('../../assets/sounds/tick.wav'));
  const correctPlayer = useAudioPlayer(require('../../assets/sounds/correct.wav'));
  const passPlayer = useAudioPlayer(require('../../assets/sounds/pass.wav'));
  const endPlayer = useAudioPlayer(require('../../assets/sounds/end.wav'));

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
      allowsBackgroundRecording: false,
    }).catch(() => {
      // Audio is a nice-to-have. The game works even if the audio session fails.
    });
  }, []);

  const playSound = useCallback(
    (name: SoundName) => {
      if (!soundEnabled) return;

      const players = {
        countdown: countdownPlayer,
        tick: tickPlayer,
        correct: correctPlayer,
        pass: passPlayer,
        end: endPlayer,
      } as const;

      try {
        const player = players[name];
        void player.seekTo(0).then(() => player.play());
      } catch {
        // Ignore playback errors so a broken asset can never stop a round.
      }
    },
    [correctPlayer, countdownPlayer, endPlayer, passPlayer, soundEnabled, tickPlayer],
  );

  const triggerFeedback = useCallback(
    (name: FeedbackName) => {
      if (!hapticsEnabled) return;

      const hapticMap = {
        success: () =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
        warning: () =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
        light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
      } as const;

      hapticMap[name]().catch(() => {
        // Haptics are disabled on some devices and in the simulator.
      });
    },
    [hapticsEnabled],
  );

  const startRound = useCallback((categoryIds: CategoryId[], duration: number) => {
    const selectedIds =
      categoryIds.length > 0 ? categoryIds : [CATEGORIES[0].id];

    const deck = shuffle(
      selectedIds.flatMap((categoryId) => {
        const category = getCategory(categoryId);

        return category.words.map((text, index) => ({
          id: `${category.id}-${index}-${text}`,
          text,
          categoryId: category.id,
        }));
      }),
    );

    dispatch({
      type: 'START_ROUND',
      categoryIds: selectedIds,
      duration,
      deck,
    });
  }, []);

  const startPlaying = useCallback(() => {
    dispatch({ type: 'START_PLAYING', now: Date.now() });
  }, []);

  const tickRound = useCallback(() => {
    dispatch({ type: 'TICK', now: Date.now() });
  }, []);

  const registerCorrect = useCallback(() => {
    dispatch({ type: 'REGISTER', status: 'correct', now: Date.now() });
    playSound('correct');
    triggerFeedback('success');
  }, [playSound, triggerFeedback]);

  const registerSkip = useCallback(() => {
    dispatch({ type: 'REGISTER', status: 'skipped', now: Date.now() });
    playSound('pass');
    triggerFeedback('light');
  }, [playSound, triggerFeedback]);

  const pauseRound = useCallback(() => {
    dispatch({ type: 'PAUSE', now: Date.now() });
    triggerFeedback('light');
  }, [triggerFeedback]);

  const resumeRound = useCallback(() => {
    dispatch({ type: 'RESUME', now: Date.now() });
    triggerFeedback('medium');
  }, [triggerFeedback]);

  const finishRound = useCallback(() => {
    dispatch({ type: 'FINISH', now: Date.now() });
  }, []);

  const resetRound = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const categories = getCategories(state.categoryIds);
  const category = categories[0] ?? getCategory(null);
  const currentWord =
    state.deck.length > 0 ? state.deck[state.currentIndex % state.deck.length] : null;
  const currentCategory = currentWord
    ? getCategory(currentWord.categoryId)
    : category;
  const remainingSeconds = Math.ceil(state.remainingMs / 1_000);
  const elapsedSeconds = Math.max(
    0,
    state.duration - Math.ceil(state.remainingMs / 1_000),
  );

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      categories,
      category,
      currentCategory,
      currentWord,
      remainingSeconds,
      elapsedSeconds,
      soundEnabled,
      hapticsEnabled,
      setSoundEnabled,
      setHapticsEnabled,
      startRound,
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
    }),
    [
      categories,
      category,
      currentCategory,
      currentWord,
      elapsedSeconds,
      finishRound,
      hapticsEnabled,
      pauseRound,
      playSound,
      registerCorrect,
      registerSkip,
      remainingSeconds,
      resetRound,
      resumeRound,
      soundEnabled,
      startPlaying,
      startRound,
      state,
      tickRound,
      triggerFeedback,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);

  if (!context) {
    throw new Error('useGame must be used inside a GameProvider');
  }

  return context;
}
