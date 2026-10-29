import fs from 'node:fs';
import path from 'node:path';

const SAMPLE_RATE = 44_100;
const OUT_DIR = path.resolve('assets/sounds');

fs.mkdirSync(OUT_DIR, { recursive: true });

/**
 * Tiny WAV synthesizer. Every sound is built from sine tones with a short
 * attack/release envelope so it feels soft rather than clicky.
 */
function createTone({ frequency, duration, volume = 0.32, start = 0, endFrequency }) {
  const samples = Math.floor(duration * SAMPLE_RATE);
  const buffer = new Float32Array(samples);
  let phase = 0;

  for (let i = 0; i < samples; i += 1) {
    const progress = i / Math.max(1, samples - 1);
    const currentFrequency = endFrequency
      ? frequency + (endFrequency - frequency) * progress
      : frequency;

    phase += (2 * Math.PI * currentFrequency) / SAMPLE_RATE;

    const attack = Math.min(1, i / (SAMPLE_RATE * 0.012));
    const release = Math.min(1, (samples - i) / (SAMPLE_RATE * 0.06));
    const envelope = attack * release;

    // A quiet second harmonic makes the tones sound warmer on tiny speakers.
    buffer[i] = (Math.sin(phase) + 0.16 * Math.sin(phase * 2)) * envelope * volume;
    if (progress < start) buffer[i] = 0;
  }

  return buffer;
}

function silence(duration) {
  return new Float32Array(Math.floor(duration * SAMPLE_RATE));
}

function mix(...tracks) {
  const length = Math.max(...tracks.map((track) => track.length));
  const output = new Float32Array(length);

  for (const track of tracks) {
    for (let i = 0; i < track.length; i += 1) {
      output[i] += track[i];
    }
  }

  return output;
}

function sequence(parts) {
  const tracks = [];
  let offset = 0;

  for (const part of parts) {
    tracks.push([offset, part.samples]);
    offset += part.samples.length;
  }

  const length = tracks.reduce((total, [start, samples]) => Math.max(total, start + samples.length), 0);
  const output = new Float32Array(length);

  for (const [start, samples] of tracks) {
    samples.forEach((sample, index) => {
      output[start + index] += sample;
    });
  }

  return output;
}

function encodeWav(samples) {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32_767), 44 + i * bytesPerSample);
  }

  return buffer;
}

const sounds = {
  countdown: createTone({ frequency: 880, duration: 0.16, volume: 0.3 }),
  tick: createTone({ frequency: 1_180, duration: 0.045, volume: 0.18 }),
  correct: sequence([
    { samples: createTone({ frequency: 659.25, duration: 0.1, volume: 0.34 }) },
    { samples: silence(0.025) },
    { samples: createTone({ frequency: 987.77, duration: 0.22, volume: 0.42 }) },
  ]),
  pass: sequence([
    { samples: createTone({ frequency: 493.88, duration: 0.11, volume: 0.3 }) },
    { samples: silence(0.02) },
    { samples: createTone({ frequency: 329.63, duration: 0.18, volume: 0.28 }) },
  ]),
  end: sequence([
    { samples: createTone({ frequency: 523.25, duration: 0.13, volume: 0.36 }) },
    { samples: createTone({ frequency: 659.25, duration: 0.13, volume: 0.36 }) },
    { samples: createTone({ frequency: 783.99, duration: 0.13, volume: 0.38 }) },
    { samples: createTone({ frequency: 1_046.5, duration: 0.45, volume: 0.4 }) },
  ]),
};

for (const [name, samples] of Object.entries(sounds)) {
  fs.writeFileSync(path.join(OUT_DIR, `${name}.wav`), encodeWav(samples));
  console.log(`✓ assets/sounds/${name}.wav`);
}
