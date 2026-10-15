import React, { useState } from 'react';
import {
  EyeOff,
  Eye,
  ShieldAlert,
  CheckCircle2,
  Tv,
  Monitor,
  Video,
  Layers,
  Terminal,
  Cpu,
  Lock,
  ArrowRight,
  Maximize,
} from 'lucide-react';

export const StealthLab: React.FC = () => {
  const [selectedMeetingApp, setSelectedMeetingApp] = useState<'zoom' | 'meet' | 'teams' | 'obs'>('zoom');
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [opacityPreview, setOpacityPreview] = useState(0.7);

  // Live Screen Share Invisibility Test using browser getDisplayMedia
  const startLiveScreenShareTest = async () => {
    try {
      setStreamError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const videoElement = document.getElementById('live-screen-feed') as HTMLVideoElement;
      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.play();
        setScreenShareActive(true);
      }

      // Handle user stopping screen share from browser banner
      stream.getVideoTracks()[0].onended = () => {
        setScreenShareActive(false);
      };
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        setStreamError('Could not start screen capture test: ' + err.message);
      }
    }
  };

  const stopScreenShareTest = () => {
    const videoElement = document.getElementById('live-screen-feed') as HTMLVideoElement;
    if (videoElement && videoElement.srcObject) {
      const stream = videoElement.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoElement.srcObject = null;
    }
    setScreenShareActive(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-black p-6 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono">
            <EyeOff className="w-3.5 h-3.5 text-purple-400" />
            <span>Zero-Footprint Capture Exclusion Technology</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Stealth Screen-Share Invisibility Lab
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Verify how GhostAssist remains completely invisible when sharing your full desktop or window
            in Zoom, Google Meet, Microsoft Teams, Slack, and OBS recordings.
          </p>
        </div>
      </div>

      {/* Interactive Dual-Monitor Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monitor View 1: What You See */}
        <div className="rounded-2xl border border-white/10 bg-[#070b13] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Your Physical Monitor</h3>
                <p className="text-[11px] text-slate-400">What your eyes see in real life</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              100% VISIBLE TO YOU
            </span>
          </div>

          {/* Simulated Desktop Screen with Ghost HUD visible */}
          <div className="relative rounded-xl border border-white/10 bg-slate-950 h-72 overflow-hidden shadow-inner flex flex-col justify-between p-4">
            {/* Background simulated IDE */}
            <div className="absolute inset-0 p-4 font-mono text-[11px] text-slate-500 space-y-1 select-none pointer-events-none opacity-40">
              <p><span className="text-purple-400">class</span> <span className="text-yellow-300">DistributedPaymentService</span> &#123;</p>
              <p className="pl-4"><span className="text-cyan-400">async</span> <span className="text-blue-400">executeSaga</span>(transactionId: <span className="text-emerald-400">string</span>) &#123;</p>
              <p className="pl-8"><span className="text-slate-400">// Step 1: Idempotency reservation</span></p>
              <p className="pl-8"><span className="text-purple-400">const</span> lock = <span className="text-cyan-400">await</span> this.redisCluster.acquireLock(transactionId);</p>
              <p className="pl-8"><span className="text-purple-400">if</span> (!lock) <span className="text-purple-400">throw new</span> <span className="text-red-400">LockError</span>();</p>
              <p className="pl-4">&#125;</p>
              <p>&#125;</p>
            </div>

            {/* Ghost Overlay Window (Translucent on top) */}
            <div
              style={{ opacity: opacityPreview }}
              className="relative z-10 w-72 rounded-xl border border-cyan-400/40 bg-[#070b14]/90 p-3 shadow-2xl backdrop-blur-md space-y-2"
            >
              <div className="flex items-center justify-between text-[10px] font-mono border-b border-white/10 pb-1 text-slate-300">
                <span className="flex items-center gap-1 text-cyan-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  GHOSTASSIST HUD
                </span>
                <span className="text-slate-500">{Math.round(opacityPreview * 100)}% Opacity</span>
              </div>
              <p className="text-[11px] text-slate-200 leading-snug">
                &bull; <strong className="text-cyan-300">Answer:</strong> Emphasize the Outbox pattern with Debezium CDC to guarantee zero lost transactions.
              </p>
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1 border-t border-white/5">
                <span>Latency: 340ms</span>
                <span className="text-emerald-400">Eye-level aligned</span>
              </div>
            </div>

            {/* Bottom Status bar */}
            <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-white/5">
              <span>Resolution: 2560x1440</span>
              <span className="text-cyan-400">Always on Top: ENABLED</span>
            </div>
          </div>

          {/* Test Opacity Slider */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>Test Translucency:</span>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={opacityPreview}
              onChange={(e) => setOpacityPreview(parseFloat(e.target.value))}
              className="w-48 accent-cyan-400"
            />
            <span className="font-mono text-cyan-300">{Math.round(opacityPreview * 100)}%</span>
          </div>
        </div>

        {/* Monitor View 2: What Zoom / Meet Sees */}
        <div className="rounded-2xl border border-white/10 bg-[#070b13] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Screen Share Stream</h3>
                <p className="text-[11px] text-slate-400">What interviewers and Zoom participants see</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              100% INVISIBLE
            </span>
          </div>

          {/* Simulated Screen Broadcast (Ghost HUD completely stripped) */}
          <div className="relative rounded-xl border border-white/10 bg-slate-950 h-72 overflow-hidden shadow-inner flex flex-col justify-between p-4">
            {/* The same IDE code, but NO GHOST HUD anywhere! */}
            <div className="absolute inset-0 p-4 font-mono text-[11px] text-slate-400 space-y-1 select-none">
              <p><span className="text-purple-400">class</span> <span className="text-yellow-300">DistributedPaymentService</span> &#123;</p>
              <p className="pl-4"><span className="text-cyan-400">async</span> <span className="text-blue-400">executeSaga</span>(transactionId: <span className="text-emerald-400">string</span>) &#123;</p>
              <p className="pl-8"><span className="text-slate-500">// Step 1: Idempotency reservation</span></p>
              <p className="pl-8"><span className="text-purple-400">const</span> lock = <span className="text-cyan-400">await</span> this.redisCluster.acquireLock(transactionId);</p>
              <p className="pl-8"><span className="text-purple-400">if</span> (!lock) <span className="text-purple-400">throw new</span> <span className="text-red-400">LockError</span>();</p>
              <p className="pl-4">&#125;</p>
              <p>&#125;</p>
            </div>

            {/* Invisible Zone Marker (Watermark demonstrating exclusion) */}
            <div className="relative z-10 m-auto px-4 py-2 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-200 text-xs font-mono text-center max-w-xs backdrop-blur-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <p className="font-bold">GhostAssist Stripped via OS API</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                No overlay, no border, no flicker, no recording trace.
              </p>
            </div>

            {/* Bottom Status bar */}
            <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-white/5">
              <span>Zoom Capture Stream</span>
              <span className="text-emerald-400">Exclusion Active: WDA_EXCLUDE</span>
            </div>
          </div>

          {/* Test Live Browser Share */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400">Live Screen Test:</span>
            {screenShareActive ? (
              <button
                onClick={stopScreenShareTest}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 font-semibold"
              >
                Stop Live Test
              </button>
            ) : (
              <button
                onClick={startLiveScreenShareTest}
                className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold hover:bg-purple-500/30 transition flex items-center gap-1.5"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Test with Browser Screen Share</span>
              </button>
            )}
          </div>
          {streamError && <p className="text-[11px] text-red-400">{streamError}</p>}
        </div>
      </div>

      {/* Hidden live video feed if user tests browser screen share */}
      {screenShareActive && (
        <div className="rounded-2xl border border-white/10 bg-black/60 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
            <span>LIVE BROWSER GETDISPLAYMEDIA STREAM PREVIEW:</span>
            <span className="text-emerald-400">STREAMING</span>
          </div>
          <video
            id="live-screen-feed"
            autoPlay
            playsInline
            muted
            className="w-full max-h-72 rounded-xl border border-white/10 bg-black"
          />
        </div>
      )}

      {/* How the Native OS Exclusion Works */}
      <div className="rounded-2xl border border-white/10 bg-[#070b13] p-6 space-y-4">
        <div className="flex items-center gap-2 text-white">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold">How GhostAssist Achieves 100% Invisibility in Native Tauri</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Windows API */}
          <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center justify-between font-mono text-cyan-400 font-bold">
              <span>Windows 10 / 11</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20">Win32 API</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              GhostAssist calls <code className="text-cyan-300 bg-black/50 px-1 py-0.5 rounded font-mono">SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)</code>.
            </p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Windows hardware compositor renders the window on your physical GPU framebuffer, but the Desktop Duplication API and Windows Graphics Capture (used by Zoom, Teams, Meet) receive a completely transparent empty alpha channel.
            </p>
          </div>

          {/* macOS API */}
          <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center justify-between font-mono text-purple-400 font-bold">
              <span>macOS (Apple Silicon &amp; Intel)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20">Cocoa API</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              In macOS, the native Rust bridge sets <code className="text-purple-300 bg-black/50 px-1 py-0.5 rounded font-mono">[NSWindow setSharingType: NSWindowSharingNone]</code>.
            </p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              This signals the macOS WindowServer that no other process (including ScreenCaptureKit, QuickTime, Zoom, or Google Meet) is permitted to read pixels from the window layer.
            </p>
          </div>

          {/* Linux */}
          <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center justify-between font-mono text-emerald-400 font-bold">
              <span>Linux (X11 &amp; Wayland)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20">X11 / Compositor</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              On X11, uses <code className="text-emerald-300 bg-black/50 px-1 py-0.5 rounded font-mono">_NET_WM_BYPASS_COMPOSITOR</code> and override-redirect unmanaged window flags.
            </p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              PipeWire portal capture ignores layers marked as overlay-exclusive or isolated rendering contexts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
