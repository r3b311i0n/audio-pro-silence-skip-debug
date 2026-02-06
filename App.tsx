import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Animated,
  Pressable,
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

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const STATE_COLORS: Record<string, string> = {
  [AudioProState.PLAYING]: '#34C759',
  [AudioProState.LOADING]: '#FF9500',
  [AudioProState.PAUSED]: '#FF9500',
  [AudioProState.ERROR]: '#FF3B30',
  [AudioProState.IDLE]: '#8E8E93',
  [AudioProState.STOPPED]: '#8E8E93',
};

const DEBORAH = Asset.fromModule(require('./assets/66_Deborah.mp3'));

AudioPro.configure({ contentType: AudioProContentType.SPEECH, silenceSkip: true });

export default function App() {
  const state = useAudioPro(s => s.playerState);
  const position = useAudioPro(s => s.position);
  const duration = useAudioPro(s => s.duration);
  const silenceSkip = useAudioPro(s => s.configureOptions.silenceSkip);
  const isSkippingSilence = useAudioPro(s => s.isSkippingSilence);
  const playbackSpeed = useAudioPro(s => s.playbackSpeed);
  const volume = useAudioPro(s => s.volume);
  const error = useAudioPro(s => s.error);

  const [localUri, setLocalUri] = useState<string | null>(DEBORAH.localUri);

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
    if (localUri) return;
    DEBORAH
      .downloadAsync()
      .then((asset) => setLocalUri(asset.localUri!));
  }, [localUri]);

  const track = useMemo(() => {
    if (!localUri) return null;
    return {
      id: 'debug-podcast',
      url: localUri,
      title: 'Debug Podcast',
      artwork: 'https://e1.nmcdn.io/pushkin/wp-content/uploads/2025/03/Heavyweight-Pushkin-1080.png/v:1-dynamic:1-aspect:1-fit:cover/Heavyweight-Pushkin-1080--600.webp',
    };
  }, [localUri]);

  const toggleSilenceSkip = () => {
    if (!track) return;
    const next = !silenceSkip;
    AudioPro.configure({ contentType: AudioProContentType.SPEECH, silenceSkip: next });
    AudioPro.stop();
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

  const playPauseLabel =
    state === AudioProState.PLAYING ? 'Pause' : 'Play';

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;
  const stateColor = STATE_COLORS[state] ?? '#8E8E93';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.section}>
          <Text style={styles.title}>Debug Podcast</Text>
          <View style={styles.stateRow}>
            <Text style={[styles.state, { color: stateColor }]}>{state}</Text>
            <Animated.View style={{ opacity: loadingOpacity }}>
              <ActivityIndicator size="small" color="#FF9500" />
            </Animated.View>
          </View>
        </View>

        {/* Playback */}
        <View style={styles.section}>
          <Text style={styles.time}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: isSkippingSilence ? '#FF9500' : '#007AFF',
                },
              ]}
            />
          </View>
          <Animated.Text style={[styles.skipping, { opacity: skippingOpacity }]}>
            Skipping Silence
          </Animated.Text>
        </View>

        {/* Debug */}
        <View style={styles.debugRow}>
          <Text style={styles.debugText}>Speed: {playbackSpeed.toFixed(1)}x</Text>
          <Text style={styles.debugDivider}>|</Text>
          <Text style={styles.debugText}>Vol: {Math.round(volume * 100)}%</Text>
        </View>

        {/* Controls */}
        <View style={styles.section}>
          <Pressable
            style={[styles.toggle, silenceSkip && styles.toggleActive, isLoading && styles.buttonDisabled]}
            onPress={toggleSilenceSkip}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              Silence Skip: {silenceSkip ? 'ON' : 'OFF'}
            </Text>
          </Pressable>

          <View style={styles.controls}>
            <Pressable style={[styles.button, isLoading && styles.buttonDisabled]} onPress={() => AudioPro.seekBack()} disabled={isLoading}>
              <Text style={styles.buttonText}>-30s</Text>
            </Pressable>

            <Pressable style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handlePlayPause} disabled={isLoading}>
              <Text style={styles.buttonText}>{playPauseLabel}</Text>
            </Pressable>

            <Pressable style={[styles.button, isLoading && styles.buttonDisabled]} onPress={() => AudioPro.stop()} disabled={isLoading}>
              <Text style={styles.buttonText}>Stop</Text>
            </Pressable>

            <Pressable style={[styles.button, isLoading && styles.buttonDisabled]} onPress={() => AudioPro.seekForward()} disabled={isLoading}>
              <Text style={styles.buttonText}>+30s</Text>
            </Pressable>
          </View>
        </View>

        {/* Error */}
        {error && (
          <Text style={styles.error}>
            Error: {error.error}{error.errorCode != null ? ` (${error.errorCode})` : ''}
          </Text>
        )}

        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 24,
  },
  section: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  state: {
    fontSize: 16,
    fontWeight: '600',
  },
  time: {
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  skipping: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
  },
  debugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  debugText: {
    fontSize: 14,
    color: '#8E8E93',
    fontVariant: ['tabular-nums'],
  },
  debugDivider: {
    fontSize: 14,
    color: '#D1D1D6',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  toggle: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#8E8E93',
    borderRadius: 8,
  },
  toggleActive: {
    backgroundColor: '#34C759',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  error: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
    textAlign: 'center',
  },
});
