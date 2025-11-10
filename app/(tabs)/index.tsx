import { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

const BEATS_PER_BAR = 4;
const STEPS_PER_BEAT = 2; // 8분음표 단위
const TOTAL_STEPS = BEATS_PER_BAR * STEPS_PER_BEAT;
const NOTE_HEAD_SIZE = 16;
const NOTE_STEM_HEIGHT = 28;
const STAFF_LINE_COUNT = 5;
const STAFF_LINE_GAP = 14;
const STAFF_TOP_OFFSET = STAFF_LINE_GAP;

type Instrument = 'hihat' | 'snare' | 'kick' | 'tom' | 'crash';

type InstrumentMeta = {
  id: Instrument;
  label: string;
  noteStyle: 'cross' | 'filled';
  color: string;
  staffPosition: number;
};

const INSTRUMENTS: InstrumentMeta[] = [
  { id: 'crash', label: 'Crash', noteStyle: 'cross', color: '#2563eb', staffPosition: -0.5 },
  { id: 'hihat', label: 'Hi-Hat', noteStyle: 'cross', color: '#111827', staffPosition: 0 },
  { id: 'snare', label: 'Snare', noteStyle: 'filled', color: '#dc2626', staffPosition: 1.25 },
  { id: 'tom', label: 'Tom', noteStyle: 'filled', color: '#ea580c', staffPosition: 2.2 },
  { id: 'kick', label: 'Kick', noteStyle: 'filled', color: '#047857', staffPosition: 3.3 },
];

const INSTRUMENT_META_MAP = INSTRUMENTS.reduce<Record<Instrument, InstrumentMeta>>((map, meta) => {
  map[meta.id] = meta;
  return map;
}, {} as Record<Instrument, InstrumentMeta>);

type Note = {
  id: string;
  stepIndex: number;
  instrument: Instrument;
};

function findNearestAvailableStep(occupied: Set<number>, preferred: number) {
  if (!occupied.has(preferred)) {
    return preferred;
  }

  for (let offset = 1; offset < TOTAL_STEPS; offset++) {
    const rightCandidate = preferred + offset;
    if (rightCandidate < TOTAL_STEPS && !occupied.has(rightCandidate)) {
      return rightCandidate;
    }

    const leftCandidate = preferred - offset;
    if (leftCandidate >= 0 && !occupied.has(leftCandidate)) {
      return leftCandidate;
    }
  }

  return null;
}

export default function DrumSketchScreen() {
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument>('hihat');
  const [notes, setNotes] = useState<Note[]>([]);
  const [canvasWidth, setCanvasWidth] = useState(0);

  const selectedInstrumentMeta = INSTRUMENT_META_MAP[selectedInstrument];

  const stepWidth = useMemo(() => {
    return canvasWidth > 0 ? canvasWidth / TOTAL_STEPS : 0;
  }, [canvasWidth]);

  const handleCanvasLayout = useCallback((event: LayoutChangeEvent) => {
    setCanvasWidth(event.nativeEvent.layout.width);
  }, []);

  const handleCanvasPress = useCallback(
    (event: Parameters<NonNullable<Pressable['props']['onPressIn']>>[0]) => {
      if (!stepWidth) return;
      const { locationX } = event.nativeEvent;
      let preferredStep = Math.floor(locationX / stepWidth);
      preferredStep = Math.max(0, Math.min(TOTAL_STEPS - 1, preferredStep));

      setNotes((prev) => {
        const occupied = new Set(
          prev.filter((note) => note.instrument === selectedInstrument).map((note) => note.stepIndex),
        );

        if (occupied.size >= TOTAL_STEPS) {
          return prev; // 이미 한 마디가 가득 찬 경우 더 이상 추가하지 않는다.
        }

        const targetStep = findNearestAvailableStep(occupied, preferredStep);
        if (targetStep == null) {
          return prev;
        }

        const next: Note[] = [
          ...prev,
          {
            id: `${selectedInstrument}-${Date.now()}-${Math.random()}`,
            stepIndex: targetStep,
            instrument: selectedInstrument,
          },
        ];

        return next.sort((a, b) => a.stepIndex - b.stepIndex);
      });
    },
    [selectedInstrument, stepWidth],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>Drum Sheet iOS</Text>
        <Text style={styles.subtitle}>터치할 때마다 선택된 악기가 격자에 배치됩니다.</Text>
        <Text style={styles.instrumentLabel}>
          선택된 악기: {selectedInstrumentMeta?.label ?? selectedInstrument}
        </Text>
      </View>

      <View style={styles.instrumentPalette}>
        {INSTRUMENTS.map((instrument) => {
          const isSelected = instrument.id === selectedInstrument;
          return (
            <Pressable
              key={instrument.id}
              onPress={() => setSelectedInstrument(instrument.id)}
              style={[
                styles.instrumentChip,
                isSelected && { backgroundColor: instrument.color },
              ]}>
              <Text
                style={[
                  styles.instrumentChipLabel,
                  isSelected ? styles.instrumentChipLabelSelected : null,
                ]}>
                {instrument.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.canvasWrapper}>
        <Pressable style={styles.canvas} onLayout={handleCanvasLayout} onPressIn={handleCanvasPress}>
          {/* 오선지 라인 */}
          {new Array(STAFF_LINE_COUNT).fill(null).map((_, lineIndex) => (
            <View
              key={`staff-${lineIndex}`}
              style={[
                styles.staffLine,
                { top: STAFF_LINE_GAP * (lineIndex + 1) },
              ]}
            />
          ))}

          {/* 격자 라인 */}
          {new Array(TOTAL_STEPS + 1).fill(null).map((_, index) => {
            const isMeasureBoundary = index === 0 || index === TOTAL_STEPS;
            return (
              <View
                key={`grid-${index}`}
                style={[
                  styles.gridLine,
                  stepWidth ? { left: index * stepWidth } : null,
                  isMeasureBoundary ? styles.measureBoundary : styles.subdivisionGridLine,
                ]}
              />
            );
          })}

          {/* 하이햇 노트 */}
          {stepWidth > 0 &&
            notes.map((note) => {
              const meta = INSTRUMENT_META_MAP[note.instrument];
              if (!meta) return null;
              const left = note.stepIndex * stepWidth + stepWidth / 2 - NOTE_HEAD_SIZE / 2;
              const top = STAFF_TOP_OFFSET + meta.staffPosition * STAFF_LINE_GAP;
              const color = meta.color;

              return (
                <View key={note.id} style={[styles.note, { left, top }]}>
                  <View style={styles.stemWrapper}>
                    <View style={[styles.stem, { backgroundColor: color }]} />
                    <View style={[styles.flag, { backgroundColor: color }]} />
                  </View>
                  {meta.noteStyle === 'cross' ? (
                    <View style={styles.noteHead}>
                      <View style={[styles.crossArm, styles.crossArmPrimary, { backgroundColor: color }]} />
                      <View style={[styles.crossArm, styles.crossArmSecondary, { backgroundColor: color }]} />
                    </View>
                  ) : (
                    <View style={[styles.filledNoteHead, { backgroundColor: color }]} />
                  )}
                </View>
              );
            })}
        </Pressable>
      </View>

      <Text style={styles.helperText}>기본 드럼 악기를 선택해 한 마디(8분음표 8개) 안에 아이디어를 빠르게 스케치하세요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 24,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    color: '#4b5563',
  },
  instrumentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  instrumentPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  instrumentChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  instrumentChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  instrumentChipLabelSelected: {
    color: '#fff',
  },
  canvasWrapper: {
    flexGrow: 1,
    marginTop: 12,
  },
  canvas: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  staffLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#9ca3af',
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  measureBoundary: {
    backgroundColor: '#1f2937',
    width: 2,
  },
  subdivisionGridLine: {
    backgroundColor: '#f3f4f6',
  },
  note: {
    position: 'absolute',
    width: NOTE_HEAD_SIZE,
    alignItems: 'center',
  },
  stemWrapper: {
    position: 'relative',
    alignItems: 'flex-start',
    height: NOTE_STEM_HEIGHT,
    marginBottom: 4,
    width: 2,
  },
  stem: {
    width: 2,
    height: '100%',
  },
  flag: {
    position: 'absolute',
    top: 0,
    left: 2,
    width: 14,
    height: 6,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  noteHead: {
    width: NOTE_HEAD_SIZE,
    height: NOTE_HEAD_SIZE,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filledNoteHead: {
    width: NOTE_HEAD_SIZE,
    height: NOTE_HEAD_SIZE,
    borderRadius: NOTE_HEAD_SIZE / 2,
  },
  crossArm: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 2,
  },
  crossArmPrimary: {
    transform: [{ rotate: '45deg' }],
  },
  crossArmSecondary: {
    transform: [{ rotate: '-45deg' }],
  },
  helperText: {
    textAlign: 'center',
    color: '#6b7280',
  },
});
