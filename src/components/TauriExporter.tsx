import React, { useState } from 'react';
import {
  Package,
  Download,
  Copy,
  Check,
  FileCode,
  Terminal,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const TauriExporter: React.FC = () => {
  const [activeFile, setActiveFile] = useState<'main.rs' | 'tauri.conf.json' | 'Cargo.toml' | 'build.sh'>('main.rs');
  const [copied, setCopied] = useState(false);

  const TAURI_CONF_JSON = `{
  "$schema": "../node_modules/@tauri-apps/cli/schema.json",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:3000",
    "distDir": "../dist"
  },
  "package": {
    "productName": "GhostAssist",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      },
      "window": {
        "all": true
      },
      "globalShortcut": {
        "all": true
      }
    },
    "bundle": {
      "active": true,
      "category": "Productivity",
      "copyright": "GhostAssist Open Source",
      "deb": { "depends": [] },
      "icon": ["icons/icon.png"],
      "identifier": "com.ghostassist.app",
      "targets": "all"
    },
    "windows": [
      {
        "title": "GhostAssist Overlay",
        "width": 540,
        "height": 480,
        "resizable": true,
        "fullscreen": false,
        "transparent": true,
        "decorations": false,
        "alwaysOnTop": true,
        "skipTaskbar": false,
        "visible": true
      }
    ]
  }
}`;

  const MAIN_RS = `// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, Window};

#[cfg(target_os = "windows")]
fn apply_windows_stealth_exclusion(window: &Window) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{SetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE};

    if let Ok(hwnd) = window.hwnd() {
        unsafe {
            // WDA_EXCLUDEFROMCAPTURE (0x00000011) hides window from Zoom, Teams, OBS, Meet
            let win_hwnd = HWND(hwnd.0 as isize);
            let _ = SetWindowDisplayAffinity(win_hwnd, WDA_EXCLUDEFROMCAPTURE);
            println!("[GhostAssist] Windows screen capture exclusion applied: WDA_EXCLUDEFROMCAPTURE");
        }
    }
}

#[cfg(target_os = "macos")]
fn apply_macos_stealth_exclusion(window: &Window) {
    use cocoa::appkit::NSWindow;
    use cocoa::base::id;
    use objc::{msg_send, sel, sel_impl};

    if let Ok(ns_window) = window.ns_window() {
        unsafe {
            let ns_win = ns_window as id;
            // NSWindowSharingNone (0) prevents window from appearing in ScreenCaptureKit or Zoom screen share
            let _: () = msg_send![ns_win, setSharingType: 0];
            println!("[GhostAssist] macOS NSWindowSharingNone exclusion applied");
        }
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let main_window = app.get_window("main").unwrap();

            #[cfg(target_os = "windows")]
            apply_windows_stealth_exclusion(&main_window);

            #[cfg(target_os = "macos")]
            apply_macos_stealth_exclusion(&main_window);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running GhostAssist Tauri application");
}`;

  const CARGO_TOML = `[package]
name = "ghostassist"
version = "1.0.0"
description = "Undetectable desktop AI assistant for meetings and interviews"
authors = ["GhostAssist Team"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "1.5", features = [] }

[dependencies]
tauri = { version = "1.5", features = ["window-all", "global-shortcut-all"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[target.'cfg(target_os = "windows")'.dependencies]
windows = { version = "0.51", features = [
    "Win32_Foundation",
    "Win32_UI_WindowsAndMessaging",
    "Win32_Graphics_Gdi"
] }

[target.'cfg(target_os = "macos")'.dependencies]
cocoa = "0.25"
objc = "0.2"`;

  const BUILD_SH = `#!/bin/bash
# 1. Install Tauri CLI if needed
npm install -g @tauri-apps/cli

# 2. Build web assets
npm run build

# 3. Build native lightweight binary (~10MB)
cargo tauri build

# Binary output:
# Windows: target/release/bundle/msi/GhostAssist_1.0.0_x64_en-US.msi
# macOS: target/release/bundle/dmg/GhostAssist_1.0.0_aarch64.dmg
# Linux: target/release/bundle/appimage/ghostassist_1.0.0_amd64.AppImage
`;

  const getCode = () => {
    switch (activeFile) {
      case 'main.rs':
        return MAIN_RS;
      case 'tauri.conf.json':
        return TAURI_CONF_JSON;
      case 'Cargo.toml':
        return CARGO_TOML;
      case 'build.sh':
        return BUILD_SH;
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBundle = () => {
    const blob = new Blob([getCode()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-black p-6 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono">
            <Package className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tauri v1.5 / v2 Lightweight Native Architecture</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            10MB Desktop App Packaging &amp; Rust Stealth Engine
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            By pairing our React UI with Rust via Tauri, GhostAssist produces an ultra-lightweight ~10MB native binary
            with zero Electron bloat, instantaneous launch, and native OS capture-exclusion APIs.
          </p>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2">
          <div className="flex items-center justify-between text-emerald-400 font-bold">
            <span>TAURI + REACT (GHOSTASSIST)</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/30">RECOMMENDED</span>
          </div>
          <div className="space-y-1.5 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Final Installer Size:</span>
              <span className="font-bold text-emerald-300">~8.5 MB - 11 MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Idle Memory Usage:</span>
              <span className="font-bold text-emerald-300">~24 MB RAM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cold Start Latency:</span>
              <span className="font-bold text-emerald-300">&lt; 15 ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Screen Exclusion:</span>
              <span className="font-bold text-emerald-300">Native OS Hooks (Win32/Cocoa)</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-4 space-y-2 opacity-75">
          <div className="flex items-center justify-between text-red-400 font-bold">
            <span>STANDARD ELECTRON APP</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20">BLOATED</span>
          </div>
          <div className="space-y-1.5 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Final Installer Size:</span>
              <span className="font-bold text-red-300">~180 MB - 250 MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Idle Memory Usage:</span>
              <span className="font-bold text-red-300">~220 MB - 350 MB RAM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cold Start Latency:</span>
              <span className="font-bold text-red-300">~800 ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Screen Exclusion:</span>
              <span className="text-slate-400">Requires C++ native addons</span>
            </div>
          </div>
        </div>
      </div>

      {/* Code Viewer & Exporter */}
      <div className="rounded-2xl border border-white/10 bg-[#070b13] overflow-hidden">
        {/* Code Tabs */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/60 border-b border-white/10 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <button
              onClick={() => setActiveFile('main.rs')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeFile === 'main.rs'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              src-tauri/src/main.rs
            </button>

            <button
              onClick={() => setActiveFile('tauri.conf.json')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeFile === 'tauri.conf.json'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              src-tauri/tauri.conf.json
            </button>

            <button
              onClick={() => setActiveFile('Cargo.toml')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeFile === 'Cargo.toml'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              src-tauri/Cargo.toml
            </button>

            <button
              onClick={() => setActiveFile('build.sh')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeFile === 'build.sh'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              build.sh
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-white/5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy File'}</span>
            </button>

            <button
              onClick={downloadBundle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-xs text-emerald-300 border border-emerald-500/30 font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {activeFile}</span>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-96 leading-relaxed bg-[#05080f]">
          <code>{getCode()}</code>
        </pre>
      </div>
    </div>
  );
};
