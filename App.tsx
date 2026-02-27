import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AudioPro,
  useAudioPro,
  AudioProState,
  AudioProContentType,
} from 'react-native-audio-pro';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';
import { getCpuUsage, onCpuChange } from 'react-native-performance-toolkit';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const THEME = {
  bg: '#090E16',
  surface: '#121A27',
  surfaceAlt: '#1A2434',
  border: '#2B3A53',
  text: '#F4F8FF',
  textMuted: '#91A3BF',
  accent: '#38BDF8',
  warning: '#F59E0B',
  success: '#34D399',
  danger: '#F87171',
};

const STATE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  [AudioProState.PLAYING]: { bg: '#113928', text: '#6EE7B7', border: '#1F7A52' },
  [AudioProState.LOADING]: { bg: '#4A2A00', text: '#FCD34D', border: '#9A6700' },
  [AudioProState.PAUSED]: { bg: '#1E2B3F', text: '#93C5FD', border: '#31568D' },
  [AudioProState.ERROR]: { bg: '#4A1616', text: '#FCA5A5', border: '#9F2E2E' },
  [AudioProState.IDLE]: { bg: '#1C2433', text: '#C7D2E7', border: '#334561' },
  [AudioProState.STOPPED]: { bg: '#1C2433', text: '#C7D2E7', border: '#334561' },
};

const RATE_PRESETS = [0.8, 1, 1.1, 1.2, 1.5, 2] as const;
const SEEK_FORWARD_MS = 15000;
const SEEK_BACK_MS = 5000;

type AudioSourceId = 'deborah' | 'deborahVb' | 'threeD';

type AudioSource = {
  id: AudioSourceId;
  trackId: string;
  title: string;
  asset: Asset;
};

const DEBORAH = Asset.fromModule(require('./assets/66_Deborah.mp3'));
const DEBORAH_VB = Asset.fromModule(require('./assets/66_Deborah-vb.mp3'));
const THREE_D = Asset.fromModule(require('./assets/3d-2s.mp3'));

const AUDIO_SOURCES: readonly AudioSource[] = [
  {
    id: 'deborah',
    trackId: 'debug-podcast-deborah',
    title: '66 Deborah',
    asset: DEBORAH,
  },
  {
    id: 'deborahVb',
    trackId: 'debug-podcast-deborah-vb',
    title: '66 Deborah (VB)',
    asset: DEBORAH_VB,
  },
  {
    id: 'threeD',
    trackId: 'debug-podcast-3d-2s',
    title: '3D 2s',
    asset: THREE_D,
  },
] as const;

const DEFAULT_SOURCE_ID: AudioSourceId = 'deborah';

AudioPro.configure({
  contentType: AudioProContentType.SPEECH,
  allowLockScreenScrubbing: true,
  showNextPrevControls: false,
  showSkipControls: true,
  skipBackMs: SEEK_BACK_MS,
  skipForwardMs: SEEK_FORWARD_MS,
  debug: true,
  voiceBoost: true,
});

export default function App() {
  const state = useAudioPro(s => s.playerState);
  const position = useAudioPro(s => s.position);
  const duration = useAudioPro(s => s.duration);
  const silenceSkip = useAudioPro(s => s.silenceSkipEnabled);
  const voiceBoostEnabled = useAudioPro(s => s.voiceBoostEnabled);
  const isSkippingSilence = useAudioPro(s => s.isSkippingSilence);
  const playbackSpeed = useAudioPro(s => s.playbackSpeed);
  const silenceSkipSpeed = useAudioPro(s => s.silenceSkipSpeed);
  const volume = useAudioPro(s => s.volume);
  const error = useAudioPro(s => s.error);

  const [selectedSourceId, setSelectedSourceId] = useState<AudioSourceId>(DEFAULT_SOURCE_ID);
  const [resolvedLocalUris, setResolvedLocalUris] = useState<Record<AudioSourceId, string | undefined>>(
    () => ({
      deborah: DEBORAH.localUri ?? undefined,
      deborahVb: DEBORAH_VB.localUri ?? undefined,
      threeD: THREE_D.localUri ?? undefined,
    }),
  );
  const [barWidth, setBarWidth] = useState(0);
  const [cpuUsage, setCpuUsage] = useState<number | null>(() => {
    try {
      return getCpuUsage();
    } catch {
      return null;
    }
  });

  const skippingOpacity = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(skippingOpacity, {
      toValue: isSkippingSilence ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isSkippingSilence, skippingOpacity]);

  const isLoading = state === AudioProState.LOADING;

  useEffect(() => {
    Animated.timing(loadingOpacity, {
      toValue: isLoading ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isLoading, loadingOpacity]);

  useEffect(() => {
    const source = AUDIO_SOURCES.find((entry) => entry.id === selectedSourceId);
    if (!source) return;
    const knownUri = resolvedLocalUris[source.id] ?? source.asset.localUri ?? undefined;
    if (knownUri) {
      setResolvedLocalUris((prev) =>
        prev[source.id] === knownUri
          ? prev
          : {
            ...prev,
            [source.id]: knownUri,
          },
      );
      return;
    }

    let cancelled = false;
    source.asset.downloadAsync().then((asset) => {
      if (cancelled || !asset.localUri) return;
      setResolvedLocalUris((prev) => ({
        ...prev,
        [source.id]: asset.localUri!,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [resolvedLocalUris, selectedSourceId]);

  useEffect(() => {
    try {
      const unsubscribe = onCpuChange((nextCpuUsage) => {
        setCpuUsage(nextCpuUsage);
      });
      return unsubscribe;
    } catch {
      setCpuUsage(null);
      return undefined;
    }
  }, []);

  const selectedSource = useMemo(
    () => AUDIO_SOURCES.find((source) => source.id === selectedSourceId) ?? AUDIO_SOURCES[0],
    [selectedSourceId],
  );

  const selectedLocalUri = resolvedLocalUris[selectedSource.id] ?? selectedSource.asset.localUri ?? null;

  const track = useMemo(() => {
    if (!selectedLocalUri) return null;
    return {
      id: selectedSource.trackId,
      url: selectedLocalUri,
      title: selectedSource.title,
      artwork: 'https://e1.nmcdn.io/pushkin/wp-content/uploads/2025/03/Heavyweight-Pushkin-1080.png/v:1-dynamic:1-aspect:1-fit:cover/Heavyweight-Pushkin-1080--600.webp',
    };
  }, [selectedLocalUri, selectedSource]);

  const toggleSilenceSkip = () => {
    if (!track) return;
    const next = !silenceSkip;
    AudioPro.setSilenceSkipEnabled(next);
  };

  const toggleVoiceBoost = () => {
    if (!track) return;
    const next = !voiceBoostEnabled;
    AudioPro.setVoiceBoostEnabled(next);
  };

  const handlePlayPause = () => {
    if (!track) return;
    if (state === AudioProState.IDLE || state === AudioProState.STOPPED) {
      AudioPro.play(track);
    } else if (state === AudioProState.PLAYING) {
      AudioPro.pause();
    } else if (state === AudioProState.PAUSED) {
      AudioPro.resume();
    }
  };

  const handleSetPlaybackSpeed = (rate: number) => {
    AudioPro.setPlaybackSpeed(rate);
  };

  const handleSelectSource = useCallback(
    (nextSourceId: AudioSourceId) => {
      if (nextSourceId === selectedSourceId) return;
      setSelectedSourceId(nextSourceId);
      if (state !== AudioProState.IDLE && state !== AudioProState.STOPPED) {
        AudioPro.stop();
      }
    },
    [selectedSourceId, state],
  );

  const handleProgressPress = useCallback(
    (e: { nativeEvent: { locationX: number } }) => {
      if (duration <= 0 || barWidth <= 0) return;
      const seekMs = Math.floor((e.nativeEvent.locationX / barWidth) * duration);
      AudioPro.seekTo(seekMs);
    },
    [duration, barWidth],
  );

  const playPauseLabel =
    state === AudioProState.PLAYING ? 'Pause' : 'Play';

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (position / duration) * 100)) : 0;
  const cpuUsageDisplay =
    cpuUsage != null && Number.isFinite(cpuUsage)
      ? `${Math.max(0, cpuUsage).toFixed(0)}%`
      : '--%';
  const stateStyle = STATE_STYLES[state] ?? STATE_STYLES[AudioProState.IDLE];

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.panel}>
            <View style={styles.headerTopRow}>
              <Text style={styles.title}>AudioPro Debug Console</Text>
              <Animated.View style={[styles.loadingWrap, { opacity: loadingOpacity }]}>
                <ActivityIndicator size="small" color={THEME.warning} />
              </Animated.View>
            </View>
            <View
              style={[
                styles.stateBadge,
                {
                  backgroundColor: stateStyle.bg,
                  borderColor: stateStyle.border,
                },
              ]}
            >
              <Text style={[styles.stateBadgeText, { color: stateStyle.text }]}>{state}</Text>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Transport</Text>
            <View style={styles.timeRow}>
              <Text style={styles.timePrimary}>
                {formatTime(position)} / {formatTime(duration)}
              </Text>
              <Text style={styles.timeSecondary}>
                {position} ms / {duration} ms
              </Text>
            </View>

            <Pressable
              style={styles.progressTrack}
              onPress={handleProgressPress}
              onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
            >
              <View style={styles.progressBackground} />
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: isSkippingSilence ? THEME.warning : THEME.accent,
                  },
                ]}
              />
            </Pressable>

            <Animated.View style={[styles.skipBanner, { opacity: skippingOpacity }]}>
              <Text style={styles.skipBannerText}>
                Skipping silence at {silenceSkipSpeed.toFixed(1)}x
              </Text>
            </Animated.View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Audio Source</Text>
            <View style={styles.sourceWrap}>
              {AUDIO_SOURCES.map((source) => {
                const isActive = source.id === selectedSourceId;
                return (
                  <Pressable
                    key={source.id}
                    style={[
                      styles.sourceButton,
                      isActive && styles.sourceButtonActive,
                      isLoading && styles.buttonDisabled,
                    ]}
                    onPress={() => handleSelectSource(source.id)}
                    disabled={isLoading}
                  >
                    <Text style={[styles.sourceButtonText, isActive && styles.sourceButtonTextActive]}>
                      {source.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Telemetry</Text>
            <View style={styles.chipsWrap}>
              <View style={styles.metricChip}>
                <Text style={styles.metricLabel}>Speed</Text>
                <Text style={styles.metricValue}>{playbackSpeed.toFixed(1)}x</Text>
              </View>
              <View style={styles.metricChip}>
                <Text style={styles.metricLabel}>Skip Speed</Text>
                <Text style={styles.metricValue}>{silenceSkipSpeed.toFixed(1)}x</Text>
              </View>
              <View style={styles.metricChip}>
                <Text style={styles.metricLabel}>Volume</Text>
                <Text style={styles.metricValue}>{Math.round(volume * 100)}%</Text>
              </View>
              <View style={styles.metricChip}>
                <Text style={styles.metricLabel}>CPU</Text>
                <Text style={styles.metricValue}>{cpuUsageDisplay}</Text>
              </View>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Controls</Text>
            <View style={styles.controlsRow}>
              <Pressable
                style={[styles.controlButton, isLoading && styles.buttonDisabled]}
                onPress={() => AudioPro.seekBack(SEEK_BACK_MS)}
                disabled={isLoading}
              >
                <Text style={styles.controlButtonText}>-{SEEK_BACK_MS / 1000}s</Text>
              </Pressable>

              <Pressable
                style={[styles.controlButton, styles.controlButtonPrimary, isLoading && styles.buttonDisabled]}
                onPress={handlePlayPause}
                disabled={isLoading}
              >
                <Text style={styles.controlButtonText}>{playPauseLabel}</Text>
              </Pressable>

              <Pressable
                style={[styles.controlButton, styles.controlButtonDanger, isLoading && styles.buttonDisabled]}
                onPress={() => AudioPro.stop()}
                disabled={isLoading}
              >
                <Text style={styles.controlButtonText}>Stop</Text>
              </Pressable>

              <Pressable
                style={[styles.controlButton, isLoading && styles.buttonDisabled]}
                onPress={() => AudioPro.seekForward(SEEK_FORWARD_MS)}
                disabled={isLoading}
              >
                <Text style={styles.controlButtonText}>+{SEEK_FORWARD_MS / 1000}s</Text>
              </Pressable>
            </View>

            <Pressable
              style={[
                styles.toggleButton,
                silenceSkip ? styles.toggleButtonActive : styles.toggleButtonInactive,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={toggleSilenceSkip}
              disabled={isLoading}
            >
              <Text style={styles.toggleButtonText}>
                Silence Skip: {silenceSkip ? 'ON' : 'OFF'}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.toggleButton,
                voiceBoostEnabled ? styles.toggleButtonActive : styles.toggleButtonInactive,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={toggleVoiceBoost}
              disabled={isLoading}
            >
              <Text style={styles.toggleButtonText}>
                Voice Boost: {voiceBoostEnabled ? 'ON' : 'OFF'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Playback Rate</Text>
            <View style={styles.rateWrap}>
              {RATE_PRESETS.map((rate) => {
                const isActive = Math.abs(playbackSpeed - rate) < 0.01;
                return (
                  <Pressable
                    key={rate}
                    style={[
                      styles.rateButton,
                      isActive && styles.rateButtonActive,
                      isLoading && styles.buttonDisabled,
                    ]}
                    onPress={() => handleSetPlaybackSpeed(rate)}
                    disabled={isLoading}
                  >
                    <Text style={[styles.rateButtonText, isActive && styles.rateButtonTextActive]}>
                      {rate}x
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {error && (
            <View style={styles.errorPanel}>
              <Text style={styles.errorText}>
                Error: {error.error}{error.errorCode != null ? ` (${error.errorCode})` : ''}
              </Text>
            </View>
          )}
        </ScrollView>

        <StatusBar style="light" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 10,
  },
  panel: {
    backgroundColor: THEME.surface,
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loadingWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  stateBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  panelTitle: {
    color: THEME.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  timeRow: {
    gap: 2,
  },
  timePrimary: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeSecondary: {
    color: THEME.textMuted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 14,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  progressBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.surfaceAlt,
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  skipBanner: {
    alignSelf: 'flex-start',
    backgroundColor: '#4A2A00',
    borderColor: '#8A5C00',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  skipBannerText: {
    color: '#FCD34D',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricChip: {
    minWidth: 100,
    flexGrow: 1,
    backgroundColor: THEME.surfaceAlt,
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  metricLabel: {
    color: THEME.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  controlButton: {
    flexGrow: 1,
    minWidth: 72,
    backgroundColor: '#223049',
    borderColor: '#33507A',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  controlButtonPrimary: {
    backgroundColor: '#124D71',
    borderColor: '#2D89BD',
  },
  controlButtonDanger: {
    backgroundColor: '#4A1E26',
    borderColor: '#8C3342',
  },
  controlButtonText: {
    color: THEME.text,
    fontSize: 14,
    fontWeight: '700',
  },
  toggleButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#12392B',
    borderColor: '#2A7A5A',
  },
  toggleButtonInactive: {
    backgroundColor: '#2C2F38',
    borderColor: '#495063',
  },
  toggleButtonText: {
    color: THEME.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rateWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourceButton: {
    minWidth: 120,
    backgroundColor: THEME.surfaceAlt,
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  sourceButtonActive: {
    backgroundColor: '#12392B',
    borderColor: '#2A7A5A',
  },
  sourceButtonText: {
    color: THEME.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  sourceButtonTextActive: {
    color: '#A7F3D0',
  },
  rateButton: {
    minWidth: 64,
    backgroundColor: THEME.surfaceAlt,
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  rateButtonActive: {
    backgroundColor: '#133A4B',
    borderColor: THEME.accent,
  },
  rateButtonText: {
    color: THEME.textMuted,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  rateButtonTextActive: {
    color: '#BAE6FD',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  errorPanel: {
    borderColor: '#8C3342',
    borderWidth: 1,
    backgroundColor: '#4A1E26',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: THEME.danger,
    fontSize: 13,
    fontWeight: '600',
  },
});
