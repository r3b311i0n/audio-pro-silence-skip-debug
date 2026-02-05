import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AudioPro,
  useAudioPro,
  AudioProState,
  AudioProContentType,
} from 'react-native-audio-pro';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const REDIRECT_URL =
  'https://pdrl.fm/a95070/podtrac.com/pts/redirect.mp3/tracking.swap.fm/track/SxlTEPDY7xDg35RXkASs/traffic.omny.fm/d/clips/e73c998e-6e60-432f-8610-ae210140c5b1/afbd76b8-eff2-442a-b938-b28e0126edad/3c0eb72f-0017-489f-a549-b3b7002020a9/audio.mp3?utm_source=Podcast&in_playlist=d08826cd-f888-4cd3-b700-b28e0126edbb';

async function resolveRedirects(url: string): Promise<string> {
  const response = await fetch(url, { method: 'HEAD' });
  return response.url;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function App() {
  const { state, position, duration } = useAudioPro();
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    AudioPro.configure({ contentType: AudioProContentType.SPEECH });

    resolveRedirects(REDIRECT_URL)
      .then(setResolvedUrl)
      .catch((err) => setResolveError(String(err)));
  }, []);

  const handlePlayPause = () => {
    if (state === AudioProState.IDLE || state === AudioProState.STOPPED) {
      if (!resolvedUrl) return;
      AudioPro.play({
        id: 'debug-podcast',
        url: resolvedUrl,
        title: 'Debug Podcast',
        artwork: 'https://e1.nmcdn.io/pushkin/wp-content/uploads/2025/03/Heavyweight-Pushkin-1080.png/v:1-dynamic:1-aspect:1-fit:cover/Heavyweight-Pushkin-1080--600.webp',
      });
    } else if (state === AudioProState.PLAYING) {
      AudioPro.pause();
    } else if (state === AudioProState.PAUSED) {
      AudioPro.resume();
    }
  };

  const playPauseLabel =
    state === AudioProState.PLAYING ? 'Pause' : 'Play';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Debug Podcast</Text>

        {resolveError && (
          <Text style={styles.error}>URL resolve failed: {resolveError}</Text>
        )}
        {!resolvedUrl && !resolveError && (
          <Text style={styles.state}>Resolving URL...</Text>
        )}
        <Text style={styles.state}>{state}</Text>
        <Text style={styles.time}>
          {formatTime(position)} / {formatTime(duration)}
        </Text>

        <View style={styles.controls}>
          <Pressable style={styles.button} onPress={() => AudioPro.seekBack()}>
            <Text style={styles.buttonText}>-30s</Text>
          </Pressable>

          <Pressable style={styles.button} onPress={handlePlayPause}>
            <Text style={styles.buttonText}>{playPauseLabel}</Text>
          </Pressable>

          <Pressable style={styles.button} onPress={() => AudioPro.stop()}>
            <Text style={styles.buttonText}>Stop</Text>
          </Pressable>

          <Pressable style={styles.button} onPress={() => AudioPro.seekForward()}>
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
  error: {
    fontSize: 14,
    color: '#FF3B30',
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
});
