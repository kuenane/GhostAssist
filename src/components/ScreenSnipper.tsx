import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Crop,
  Sparkles,
  Copy,
  Check,
  X,
  RefreshCw,
  FileCode,
  Layers,
  Upload,
  ArrowRight,
} from 'lucide-react';
import { ScreenSnippet } from '../types';
import { aiService } from '../services/aiService';

interface ScreenSnipperProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSnippet: (snippet: ScreenSnippet) => void;
}

export const ScreenSnipper: React.FC<ScreenSnipperProps> = ({
  isOpen,
  onClose,
  onSaveSnippet,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState(
    'Analyze this interview question / code / system design diagram. Provide the optimal solution, clean code, Time/Space complexity, and 3 high-impact talking points.'
  );
  const [isCopied, setIsCopied] = useState(false);
  const [activeSample, setActiveSample] = useState<'leetcode' | 'system-design' | 'sql'>('leetcode');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sample mock interview canvases to test visual snippet analysis right away
  useEffect(() => {
    if (!selectedImage) {
      renderSampleCanvas(activeSample);
    }
  }, [activeSample, selectedImage]);

  const renderSampleCanvas = (type: 'leetcode' | 'system-design' | 'sql') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    if (type === 'leetcode') {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.fillText('146. LRU Cache (Hard/Medium)', 25, 45);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px "JetBrains Mono", monospace';
      ctx.fillText('Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.', 25, 80);
      ctx.fillText('Implement the LRUCache class:', 25, 105);
      ctx.fillText('• LRUCache(int capacity) Initialize the LRU cache with positive size capacity.', 35, 130);
      ctx.fillText('• int get(int key) Return the value of the key if the key exists, otherwise return -1.', 35, 155);
      ctx.fillText('• void put(int key, int value) Update or insert the value. Evict least recently used key if full.', 35, 180);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText('Constraints: get and put must each run in O(1) average time complexity.', 25, 220);

      ctx.fillStyle = '#34d399';
      ctx.fillText('Example 1: LRUCache lRUCache = new LRUCache(2); lRUCache.put(1, 1); lRUCache.put(2, 2);', 25, 260);
    } else if (type === 'system-design') {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('System Architecture: Global Real-Time Notification Service (100M Daily Active Users)', 25, 40);

      // Draw diagram boxes
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;

      // Clients
      ctx.strokeRect(30, 80, 100, 60);
      ctx.strokeRect(30, 160, 100, 60);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '12px "JetBrains Mono"';
      ctx.fillText('Web Sockets', 40, 115);
      ctx.fillText('Mobile Push', 40, 195);

      // Load Balancer
      ctx.strokeStyle = '#a855f7';
      ctx.strokeRect(180, 110, 110, 80);
      ctx.fillStyle = '#c084fc';
      ctx.fillText('HAProxy / ALB', 195, 145);
      ctx.fillText('TLS Offload', 200, 165);

      // Notification Workers
      ctx.strokeStyle = '#10b981';
      ctx.strokeRect(340, 70, 120, 60);
      ctx.strokeRect(340, 160, 120, 60);
      ctx.fillStyle = '#34d399';
      ctx.fillText('Redis Pub/Sub', 355, 105);
      ctx.fillText('Kafka Queue', 355, 195);

      // Database
      ctx.strokeStyle = '#f59e0b';
      ctx.strokeRect(510, 110, 120, 80);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('Cassandra / Scylla', 515, 145);
      ctx.fillText('Sharded DB', 535, 165);
    } else {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.fillText('SQL Query Optimization & Indexing Challenge', 25, 45);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px "JetBrains Mono", monospace';
      ctx.fillText('-- High Latency Report (2.8 seconds on 50M rows)', 25, 80);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('SELECT u.id, u.email, COUNT(o.id) as total_orders, SUM(o.amount) as total_spend', 25, 110);
      ctx.fillText('FROM users u', 25, 135);
      ctx.fillText('LEFT JOIN orders o ON u.id = o.user_id', 25, 160);
      ctx.fillText('WHERE o.created_at >= NOW() - INTERVAL 90 DAY', 25, 185);
      ctx.fillText('GROUP BY u.id, u.email HAVING SUM(o.amount) > 1000', 25, 210);
      ctx.fillText('ORDER BY total_spend DESC LIMIT 50;', 25, 235);
    }

    const dataUrl = canvas.toDataURL('image/png');
    setSelectedImage(dataUrl);
  };

  // Capture live screen via getDisplayMedia
  const captureLiveScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      const capturedUrl = canvas.toDataURL('image/png');
      setSelectedImage(capturedUrl);

      // Stop stream tracks
      stream.getTracks().forEach((t) => t.stop());
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        alert('Could not capture screen: ' + err.message);
      }
    }
  };

  // Upload image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Run AI Vision Analysis
  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await aiService.analyzeScreenSnippet(selectedImage, customPrompt);
      setAnalysisResult(result);

      // Save snippet to DB
      const snippet: ScreenSnippet = {
        id: 'snip_' + Math.random().toString(36).substring(2, 9),
        sessionId: 'current',
        timestamp: Date.now(),
        dataUrl: selectedImage,
        width: 650,
        height: 300,
        prompt: customPrompt,
        aiAnalysis: result,
      };
      onSaveSnippet(snippet);
    } catch (err: any) {
      setAnalysisResult(`Analysis Error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyResult = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#080d1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Screen Snippet &amp; AI Vision Solver
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Multimodal OCR
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Capture screen region, whiteboard, or LeetCode question for instant solving
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Source Switcher */}
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 text-xs">
              <button
                onClick={() => captureLiveScreen()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium hover:bg-cyan-500/30 transition"
                title="Select any active window or screen to capture"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Snip My Screen</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Image</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Test Presets */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-mono text-[11px]">Test Samples:</span>
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setActiveSample('leetcode');
                }}
                className={`px-2 py-1 rounded-lg border text-[11px] font-mono transition ${
                  activeSample === 'leetcode'
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                LeetCode 146
              </button>

              <button
                onClick={() => {
                  setSelectedImage(null);
                  setActiveSample('system-design');
                }}
                className={`px-2 py-1 rounded-lg border text-[11px] font-mono transition ${
                  activeSample === 'system-design'
                    ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                System Design
              </button>

              <button
                onClick={() => {
                  setSelectedImage(null);
                  setActiveSample('sql');
                }}
                className={`px-2 py-1 rounded-lg border text-[11px] font-mono transition ${
                  activeSample === 'sql'
                    ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                SQL Tuning
              </button>
            </div>
          </div>

          {/* Snippet Preview Canvas / Image Box */}
          <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 flex flex-col items-center justify-center min-h-[220px]">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt="Selected Screen Snippet"
                className="max-h-64 object-contain rounded-lg border border-white/5 shadow-md"
              />
            ) : (
              <canvas
                ref={canvasRef}
                width={650}
                height={290}
                className="max-h-64 w-full object-contain rounded-lg border border-white/5"
              />
            )}
          </div>

          {/* Custom Prompt Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>AI Analysis Objective</span>
              <span className="text-[10px] text-cyan-400">Customizable</span>
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition"
              placeholder="e.g. Solve this code with optimal Big-O complexity"
            />
          </div>

          {/* Analyze Action Button */}
          <div className="flex justify-end">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !selectedImage}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-xs shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing with Multimodal Vision...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Solve &amp; Analyze Snippet</span>
                </>
              )}
            </button>
          </div>

          {/* AI Analysis Result */}
          {analysisResult && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI VISION SOLUTION</span>
                </div>
                <button
                  onClick={copyResult}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white p-1 rounded bg-slate-900 border border-white/5"
                >
                  {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopied ? 'Copied' : 'Copy Solution'}</span>
                </button>
              </div>

              <div className="text-xs text-slate-200 leading-relaxed font-sans max-h-60 overflow-y-auto whitespace-pre-wrap">
                {analysisResult}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
