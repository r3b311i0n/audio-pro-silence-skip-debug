import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
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

const DEBORAH = Asset.fromModule(require('./assets/66_Deborah.mp3'));

AudioPro.configure({ contentType: AudioProContentType.SPEECH, silenceSkip: true });

export default function App() {
  const state = useAudioPro(s => s.playerState);
  const position = useAudioPro(s => s.position);
  const duration = useAudioPro(s => s.duration);
  const silenceSkip = useAudioPro(s => s.configureOptions.silenceSkip);

  const [localUri, setLocalUri] = useState<string | null>(DEBORAH.localUri);

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
    AudioPro.play(track);
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

  const isLoading = state === AudioProState.LOADING;

  const playPauseLabel =
    state === AudioProState.PLAYING ? 'Pause' : 'Play';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Debug Podcast</Text>

        <Text style={styles.state}>{state}</Text>
        <Text style={styles.time}>
          {formatTime(position)} / {formatTime(duration)}
        </Text>

        {isLoading && <ActivityIndicator size="large" color="#007AFF" />}

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
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  state: {
    fontSize: 16,
    color: '#666',
  },
  time: {
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
});
