# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Expo (React Native) app for debugging silence-skip behavior when playing audio via `react-native-audio-pro`. It plays a hard-coded podcast audio URL and displays debug information about playback state.

The audio library dependency uses a GitHub fork:
```
"react-native-audio-pro": "github:r3b311i0n/react-native-audio-pro#main"
```

## Development Commands

```bash
npx expo start          # Start Expo dev server
npx expo start --ios    # Run on iOS simulator
npx expo start --android # Run on Android emulator
npx expo prebuild       # Generate native ios/ and android/ directories
```

After prebuild, native builds can be run directly:
```bash
npx expo run:ios
npx expo run:android
```

No test or lint scripts are configured.

## Architecture

- **index.ts** — Entry point; registers root component via `registerRootComponent`
- **App.tsx** — Single-screen app component; all UI and audio logic lives here
- **app.json** — Expo config with New Architecture enabled (`newArchEnabled: true`)

This is a single-file app (no navigation, no multiple screens). The entire debug UI and audio integration should be in `App.tsx`.

## Key Technical Details

- **React Native New Architecture** is enabled — use Turbo Modules / Fabric-compatible APIs
- **TypeScript strict mode** is on (`tsconfig.json` extends `expo/tsconfig.base` with `strict: true`)
- **React 19** and **React Native 0.81** — use modern React patterns (no legacy lifecycle methods)
- Native `ios/` and `android/` directories are gitignored and generated via `npx expo prebuild`

## Audio URL for Testing

```
https://pdrl.fm/a95070/podtrac.com/pts/redirect.mp3/tracking.swap.fm/track/SxlTEPDY7xDg35RXkASs/traffic.omny.fm/d/clips/e73c998e-6e60-432f-8610-ae210140c5b1/afbd76b8-eff2-442a-b938-b28e0126edad/3c0eb72f-0017-489f-a549-b3b7002020a9/audio.mp3?utm_source=Podcast&in_playlist=d08826cd-f888-4cd3-b700-b28e0126edbb
```
