import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Github,
  UploadCloud,
  Check,
  AlertCircle,
  Copy,
  ExternalLink,
  X,
  Lock,
  Globe,
  RefreshCw,
  Terminal,
} from 'lucide-react';

interface GitHubPushModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubPushModal: React.FC<GitHubPushModalProps> = ({ isOpen, onClose }) => {
  const [gitStatus, setGitStatus] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [repoName, setRepoName] = useState('GhostAssist');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ success: boolean; repoUrl?: string; error?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'instant' | 'terminal'>('instant');
  const [copiedCmd, setCopiedCmd] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/git/status')
        .then((res) => res.json())
        .then((data) => setGitStatus(data))
        .catch(() => {});
    }
  }, [isOpen]);

  const handlePush = async () => {
    if (!username.trim() || !token.trim()) {
      alert('Please provide your GitHub username and Personal Access Token (PAT).');
      return;
    }

    setIsPushing(true);
    setPushResult(null);

    try {
      const res = await fetch('/api/git/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubUsername: username.trim(),
          githubToken: token.trim(),
          repoName: repoName.trim() || 'GhostAssist',
          isPrivate,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPushResult({ success: true, repoUrl: data.repoUrl });
      } else {
        setPushResult({ success: false, error: data.error || 'Failed to push to GitHub.' });
      }
    } catch (err: any) {
      setPushResult({ success: false, error: err.message || 'Network request failed' });
    } finally {
      setIsPushing(false);
    }
  };

  const terminalCommands = `# 1. Add your GitHub remote repository
git remote add origin https://github.com/${username || '<YOUR_USERNAME>'}/${repoName || 'GhostAssist'}.git

# 2. Push all code to main branch
git branch -M main
git push -u origin main

# OR with GitHub CLI (Instant 1-liner):
gh repo create ${repoName || 'GhostAssist'} --${isPrivate ? 'private' : 'public'} --source=. --remote=origin --push`;

  const copyCommands = () => {
    navigator.clipboard.writeText(terminalCommands);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#080d1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Push GhostAssist to GitHub
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Ready to Push
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Commit: <span className="font-mono text-cyan-400">{gitStatus?.commitHash || '8d03f4f'}</span> on <span className="font-mono text-white">main</span> branch
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

        {/* Tab Switcher */}
        <div className="px-5 pt-3 flex items-center gap-2 border-b border-white/5 text-xs font-medium">
          <button
            onClick={() => setActiveTab('instant')}
            className={`pb-2 px-1 border-b-2 transition ${
              activeTab === 'instant'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1-Click Automated Push
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            className={`pb-2 px-1 border-b-2 transition ${
              activeTab === 'terminal'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            CLI Terminal Commands
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {activeTab === 'instant' ? (
            <div className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-slate-300 space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-purple-400" />
                  Automatic GitHub Repository Creation &amp; Push
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  GhostAssist will create the <code className="text-cyan-300 font-mono">GhostAssist</code> repo on your GitHub account and push all code (including Tauri Rust scaffolding, React HUD, and audio engine).
                </p>
              </div>

              {/* GitHub Username */}
              <div className="space-y-1">
                <label className="font-mono text-slate-400 text-[11px]">GitHub Username:</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. lebohangkuenane"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* GitHub PAT */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>GitHub Personal Access Token (PAT):</span>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=GhostAssist+Push"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <span>Generate token (repo scope)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Repo Name & Privacy */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono text-slate-400 text-[11px]">Repo Name:</label>
                  <input
                    type="text"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-slate-400 text-[11px]">Visibility:</label>
                  <button
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-mono flex items-center justify-center gap-2 transition ${
                      isPrivate
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                        : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    {isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                    <span>{isPrivate ? 'Private Repo' : 'Public Repo'}</span>
                  </button>
                </div>
              </div>

              {/* Push Action Button */}
              <button
                onClick={handlePush}
                disabled={isPushing}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPushing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Pushing to GitHub (Creating &amp; Uploading)...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Create &amp; Push to GitHub Now</span>
                  </>
                )}
              </button>

              {/* Push Result Banner */}
              {pushResult && (
                <div
                  className={`p-3.5 rounded-xl border ${
                    pushResult.success
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-950/20 border-red-500/30 text-red-300'
                  } space-y-1.5`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    {pushResult.success ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Successfully pushed to GitHub!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span>Push failed</span>
                      </>
                    )}
                  </div>

                  {pushResult.success && pushResult.repoUrl && (
                    <div className="pt-1">
                      <a
                        href={pushResult.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition"
                      >
                        <span>Open {pushResult.repoUrl}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {!pushResult.success && (
                    <p className="text-[11px] text-slate-300 font-mono whitespace-pre-wrap">
                      {pushResult.error}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
                <span>Copy and paste these commands into your terminal:</span>
                <button
                  onClick={copyCommands}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                >
                  {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCmd ? 'Copied' : 'Copy Commands'}</span>
                </button>
              </div>

              <pre className="p-3.5 rounded-xl bg-slate-950 border border-white/10 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed">
                <code>{terminalCommands}</code>
              </pre>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Your local git repository is already initialized on branch <span className="font-mono text-cyan-300">main</span> with all files and initial commit ready.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
