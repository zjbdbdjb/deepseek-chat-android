# DeepSeek Chat Android App

English | [简体中文](README.zh-CN.md)

An Android mobile app built with Capacitor on top of the open-source [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo) project (MIT License). No custom backend is required: the app connects directly to the DeepSeek API using your own API key.

## Download & Install

1. Open the **[Releases](../../releases)** page of this repository.
2. Download the latest `DeepSeek-Chat-v*.apk` file on your Android phone.
3. Tap the APK to install (allow installing apps from unknown sources if prompted).
4. On first launch, enter your DeepSeek API key in **Settings → Data** to start chatting.

> Privacy: Your API key, settings, conversations, and locally cached images are stored only on your device.

## Highlights

- **Full upstream feature parity**: Multi-session chat history with automatic titles, streaming responses, DeepThink reasoning, smart web search & citations, link reading, message editing/regeneration/branch switching, file & image uploads, voice input with live mobile audio spectrum, read-aloud TTS, Markdown / syntax highlighting / KaTeX math / Mermaid diagrams, ZIP history import/export, Light/Dark/System themes, and Chinese/English UI.
- **Exclusive new features beyond upstream**:
  - **Custom System Prompts & Persona Presets**: Edit global or per-conversation system prompts, switch between 6 built-in personas (Default, Code Expert, Translator, Writing Editor, Study Tutor, Concise), and save/delete your own custom presets from both the Welcome screen and header.
  - **Upgraded Voice Input & Hands-Free Voice Chat**: Switch between **DeepSeek Cloud ASR** and **System Live Speech Recognition** (real-time streaming dictation), cancel recording anytime, enable **Auto-Send after voice transcription**, and enable **Auto Read-Aloud** for replies to voice messages.
  - **Quick Model Switcher**: Toggle effortlessly between `DeepSeek Flash` and `DeepSeek V4 Pro` from the header pill or Settings.
  - **Custom API Base URL**: Configure a compatible reverse proxy or self-hosted gateway URL in Settings with one-tap reset.
  - **Sidebar Search & Pinned Chats**: Filter conversations by title in real time and pin important chats to the top.
  - **Native Reply Sharing & Markdown Export**: Share any assistant reply directly via the Android share sheet, and export entire chats as `.md` files.
  - **Font Size Controls & Token Usage Badges**: Switch between Small / Standard / Large typography and view per-reply model & input/output/cached token counts.
  - **Welcome Quick Starters**: Tap built-in persona pills and starter templates on the home screen to jump right in.
- **Native Android enhancements**:
  - Edge-to-edge safe-area & soft-keyboard resize support (`SystemBars` + `adjustResize`).
  - Automatic light/dark status bar and navigation bar icon sync.
  - Native Android back-button handling (closes modals, search results, and sidebar drawer in order; double-tap to exit).
  - Native Android Share/Save sheet when exporting chat history ZIPs or opening local attachments.
  - External links and citations open cleanly via Chrome Custom Tabs (`@capacitor/browser`).
  - Configured microphone permissions for voice input and media playback settings for streaming read-aloud TTS.
  - Custom adaptive app icon and light/dark splash screen (package ID `io.chatdemo.deepseek`, installs alongside the official DeepSeek app without conflict).

## Development & Building Locally

Requirements: Node.js 22.12+, pnpm 12+, plus JDK 21 and Android SDK for compiling the APK.

```sh
pnpm install
pnpm dev            # Run web dev server at http://localhost:8090
pnpm android:sync   # Build web bundle and sync into android/
pnpm android:open   # Open Android project in Android Studio
```

Build the APK from the command line:

```sh
cd android
./gradlew assembleRelease
```

## Automated Releases with GitHub Actions

`.github/workflows/android-release.yml` automatically checks types, lints, builds, and compiles the Android APK:

- Push to `main`: runs checks and uploads the APK as a workflow artifact.
- Push a version tag (e.g. `git tag v1.0.0 && git push origin v1.0.0`) or dispatch manually with `release_tag`: publishes a GitHub Release with `DeepSeek-Chat-v*.apk` and `SHA256SUMS.txt`.
- Optional release signing secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` (falls back to debug signing so APKs are always directly installable).

## License & Attribution

Based on [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo) under the [MIT License](LICENSE).
