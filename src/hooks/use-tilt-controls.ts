import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

interface TiltControlsOptions {
  /** Only trigger gestures while the round is running. */
  active: boolean;
  /** Collect a neutral baseline while the phone is being placed on the forehead. */
  calibrating: boolean;
  onCorrect: () => void;
  onSkip: () => void;
  threshold?: number;
}

interface TiltControlsResult {
  sensorAvailable: boolean | null;
}

type TiltDirection = 'correct' | 'skip';

const UPDATE_INTERVAL_MS = 60;
const SMOOTHING = 0.72;
const TILT_HOLD_MS = 90;
const REARM_DELTA = 0.17;
const TRIGGER_COOLDOWN_MS = 750;
const START_GRACE_MS = 450;

/**
 * Reads the accelerometer and maps screen-down / screen-up gestures.
 *
 * iOS reports gravity with the opposite sign from Android, so the Z axis is
 * normalised first. The neutral angle is captured during the 3-2-1 countdown,
 * which makes the controls work regardless of how tightly the phone is held.
 */
export function useTiltControls({
  active,
  calibrating,
  onCorrect,
  onSkip,
  threshold = 0.38,
}: TiltControlsOptions): TiltControlsResult {
  const [sensorAvailable, setSensorAvailable] = useState<boolean | null>(null);

  const callbacksRef = useRef({ onCorrect, onSkip });
  const baselineRef = useRef<number | null>(null);
  const smoothRef = useRef<number | null>(null);
  const armedRef = useRef(false);
  const activeAtRef = useRef(0);
  const lastTriggerRef = useRef(0);
  const candidateRef = useRef<{ direction: TiltDirection | null; since: number }>({
    direction: null,
    since: 0,
  });

  callbacksRef.current = { onCorrect, onSkip };

  useEffect(() => {
    // Native sensors are the primary control. On web we intentionally use the
    // on-screen buttons instead; browser motion permission is unreliable.
    if (Platform.OS === 'web') {
      setSensorAvailable(false);
      return;
    }

    let mounted = true;

    Accelerometer.isAvailableAsync()
      .then((available) => {
        if (mounted) setSensorAvailable(available);
      })
      .catch(() => {
        if (mounted) setSensorAvailable(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!active && !calibrating) return;

    if (calibrating) {
      baselineRef.current = null;
      smoothRef.current = null;
      armedRef.current = false;
      candidateRef.current = { direction: null, since: 0 };
    }

    if (active) {
      activeAtRef.current = Date.now();
      armedRef.current = false;
      candidateRef.current = { direction: null, since: 0 };
    }

    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);

    const subscription = Accelerometer.addListener(({ z }) => {
      if (typeof z !== 'number' || Number.isNaN(z)) return;

      // Screen-down is +Z on iOS and -Z on Android.
      const screenDownAxis = Platform.OS === 'ios' ? z : -z;
      const previous = smoothRef.current;
      const smooth =
        previous === null ? screenDownAxis : previous * SMOOTHING + screenDownAxis * (1 - SMOOTHING);
      smoothRef.current = smooth;

      if (calibrating) {
        const baseline = baselineRef.current;
        baselineRef.current =
          baseline === null ? smooth : baseline * 0.88 + smooth * 0.12;
        return;
      }

      if (!active) return;

      const now = Date.now();
      const baseline = baselineRef.current ?? 0;
      const delta = smooth - baseline;

      if (now - activeAtRef.current < START_GRACE_MS) {
        return;
      }

      if (!armedRef.current) {
        if (Math.abs(delta) < REARM_DELTA) {
          armedRef.current = true;
        }
        return;
      }

      if (now - lastTriggerRef.current < TRIGGER_COOLDOWN_MS) {
        return;
      }

      let direction: TiltDirection | null = null;
      if (delta > threshold) direction = 'correct';
      else if (delta < -threshold) direction = 'skip';

      if (!direction) {
        candidateRef.current = { direction: null, since: 0 };
        return;
      }

      if (candidateRef.current.direction !== direction) {
        candidateRef.current = { direction, since: now };
        return;
      }

      if (now - candidateRef.current.since < TILT_HOLD_MS) {
        return;
      }

      lastTriggerRef.current = now;
      armedRef.current = false;
      candidateRef.current = { direction: null, since: 0 };

      if (direction === 'correct') {
        callbacksRef.current.onCorrect();
      } else {
        callbacksRef.current.onSkip();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [active, calibrating, threshold]);

  return { sensorAvailable };
}
