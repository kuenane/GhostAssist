# GhostAssist 👻
> **Undetectable Translucent Desktop AI Copilot for Real-Time Meetings & Technical Interviews**

GhostAssist is a fast, lightweight native desktop overlay app built with React, TypeScript, Tailwind CSS, and Tauri (~10MB binary size). It provides real-time meeting and interview assistance while remaining completely invisible to screen shares and recordings on Zoom, Google Meet, Microsoft Teams, Slack, and OBS.

---

## 🌟 Key Features

- 🕵️ **Undetectable Screen-Share Exclusion**:
  - **Windows 10/11**: Strips window capture via `SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)` (0x00000011).
  - **macOS**: Sets `[NSWindow setSharingType: NSWindowSharingNone]`, preventing ScreenCaptureKit and QuickTime from recording the overlay.
  - **Linux**: Sets compositor bypass overlay flags (`_NET_WM_BYPASS_COMPOSITOR`).
- 🎙️ **Dual-Channel Audio Capture & Real-Time Transcription**:
  - Captures microphone (your speech) and desktop system audio (interviewer / meeting participants).
  - Web Audio API real-time volume activity meters (interviewer vs candidate).
  - Continuous speech recognition with speaker diarization (`[INTERVIEWER]` vs `[YOU]`).
- 📄 **Resume-Grounded Answering**:
  - Stores your CV / resume offline in IndexedDB.
  - When asked behavioral questions or technical experiences, GhostAssist directly references your real past companies, projects, and metrics instead of generic answers.
- ⚡ **Multi-Provider BYOK & NVIDIA NIM Support**:
  - **NVIDIA NIM (Free 1,000 Credits)**: Pre-configured with `meta/llama-3.3-70b-instruct`, `deepseek-ai/deepseek-r1`, `nvidia/llama-3.1-nemotron-70b-instruct`, `mistralai/mistral-large-2-instruct`, `microsoft/phi-4`.
  - **Custom OpenAI-Compatible API**: Connect any endpoint (OpenRouter, Together AI, vLLM, LM Studio, Ollama).
  - **Gemini 3.8 Flash**: High-speed built-in multimodal reasoning.
  - **Groq**: Ultra-fast Llama 3.3 70B & Whisper audio models.
  - **OpenAI & Anthropic**: GPT-4o, o3-mini, Claude 3.7 Sonnet.
  - **DeepSeek**: DeepSeek-V3 & DeepSeek-R1.
  - **Ollama**: 100% offline local model inference.
- 📷 **Screen Snippet Vision Solver (`Alt+S`)**:
  - Crosshair snip tool to capture any problem statement, code snippet, or system design diagram on your screen.
  - Automatically produces optimal Big-O code and talking points.
- 💨 **Multiple Answering Modes**:
  - **Quick Speak (`Alt+A`)**: 2–3 concise bullet points formatted for natural speech.
  - **STAR Method**: Situation, Task, Action, Result structured breakdown.
  - **Code & Big-O**: Optimal implementation with time/space complexity and edge cases.
  - **System Architecture**: High-level distributed system blueprint.
  - **Clarify**: Smart questions to ask the interviewer to buy time and demonstrate seniority.
  - **Teleprompter**: Smooth auto-scrolling cue card.
- 🔒 **Zero-Telemetry Local Privacy**:
  - Offline-first persistence via IndexedDB (`GhostAssistDB`).
  - API keys obfuscated and stored locally in browser storage. Zero tracking.

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Esc` or `Alt + X` | **Emergency Panic Hide** (Instantly vanish HUD) |
| `Alt + A` | **Quick Speak Answer** (Auto-answers latest question) |
| `Alt + S` | **Screen Snippet Tool** (OCR & Vision Solver) |
| `Alt + M` | **Toggle Audio Capture** (Mic + System Audio) |
| `Alt + C` | **Toggle Click-Through Mode** |
| `Alt + Space` | **Minimize / Expand HUD** |

---

## 🚀 Quickstart

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Configure Environment (Optional for Gemini Server)
Copy `.env.example` to `.env`:
\`\`\`bash
cp .env.example .env
\`\`\`
Set your `GEMINI_API_KEY` or bring your own keys directly in the in-app BYOK vault (NVIDIA NIM, Groq, OpenAI, Anthropic, DeepSeek, Ollama).

### 3. Run Development Server
\`\`\`bash
npm run dev
\`\`\`
Visit \`http://localhost:3000\` to open the GhostAssist HUD and test lab.

### 4. Build Lightweight 10MB Native Desktop Binary (Tauri)
\`\`\`bash
# Install Tauri CLI
npm install -g @tauri-apps/cli

# Build frontend & native binary
npm run build
cargo tauri build
\`\`\`
Installers will be generated under:
- **Windows**: \`src-tauri/target/release/bundle/msi/GhostAssist_1.0.0_x64_en-US.msi\`
- **macOS**: \`src-tauri/target/release/bundle/dmg/GhostAssist_1.0.0_aarch64.dmg\`
- **Linux**: \`src-tauri/target/release/bundle/appimage/ghostassist_1.0.0_amd64.AppImage\`

---

## 🛡️ License

MIT License. Built for ethical meeting productivity and interview preparation.
