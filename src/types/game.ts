export type GameStatus = 'IDLE' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'SUMMARY';

export type CategoryId =
  | 'domestic-movies'
  | 'foreign-movies'
  | 'domestic-series'
  | 'foreign-series'
  | 'music'
  | 'animals'
  | 'acting';

export type ResultStatus = 'correct' | 'skipped';

export interface RoundResult {
  key: string;
  text: string;
  status: ResultStatus;
  at: number;
  categoryId: CategoryId;
}

export interface GameWord {
  id: string;
  text: string;
  categoryId: CategoryId;
}

export interface Category {
  id: CategoryId;
  title: string;
  subtitle: string;
  emoji: string;
  accent: string;
  gradient: [string, string];
  words: string[];
}

export interface GameState {
  status: GameStatus;
  categoryIds: CategoryId[];
  duration: number;
  deck: GameWord[];
  currentIndex: number;
  score: number;
  results: RoundResult[];
  remainingMs: number;
  endsAt: number | null;
  startedAt: number | null;
}
