import React, { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  Clock,
  MessageSquare,
  Sparkles,
  Bookmark,
  Trash2,
  Download,
  Search,
  ExternalLink,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { SessionRecord, AIAnswer, TranscriptItem } from '../types';
import { dbService } from '../services/db';

export const SessionHistory: React.FC = () => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionAnswers, setSessionAnswers] = useState<AIAnswer[]>([]);
  const [sessionTranscripts, setSessionTranscripts] = useState<TranscriptItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await dbService.getSessions();
      setSessions(data);
      if (data.length > 0 && !selectedSessionId) {
        selectSession(data[0].id);
      }
    } catch (e) {
      console.error('Error loading sessions:', e);
    } finally {
      setLoading(false);
    }
  };

  const selectSession = async (id: string) => {
    setSelectedSessionId(id);
    const [answers, transcripts] = await Promise.all([
      dbService.getAnswers(id),
      dbService.getTranscripts(id),
    ]);
    setSessionAnswers(answers);
    setSessionTranscripts(transcripts);
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this interview session log?')) {
      await dbService.deleteSession(id);
      await loadSessions();
      if (selectedSessionId === id) {
        setSelectedSessionId(null);
        setSessionAnswers([]);
        setSessionTranscripts([]);
      }
    }
  };

  const exportMarkdown = () => {
    const session = sessions.find((s) => s.id === selectedSessionId);
    if (!session) return;

    let md = `# GhostAssist Interview Debrief: ${session.title}\n`;
    md += `**Role:** ${session.role} | **Company:** ${session.company}\n`;
    md += `**Date:** ${new Date(session.startTime).toLocaleString()}\n\n`;

    md += `## Key Questions & AI Talking Points\n\n`;
    sessionAnswers.forEach((ans, idx) => {
      md += `### ${idx + 1}. ${ans.question}\n`;
      md += `*Mode: ${ans.mode.toUpperCase()}*\n\n`;
      md += `${ans.content}\n\n---\n\n`;
    });

    md += `## Meeting Transcript\n\n`;
    sessionTranscripts.forEach((t) => {
      const time = new Date(t.timestamp).toLocaleTimeString();
      md += `**[${time}] ${t.speaker.toUpperCase()}:** ${t.text}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview_debrief_${session.company || 'session'}_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredSessions = sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            Interview &amp; Meeting Archive
          </h1>
          <p className="text-xs text-slate-400">
            Offline persistent records of questions asked, AI answer talking points, and full audio transcripts
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search past interviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 w-56"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Sessions List */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            Saved Sessions ({filteredSessions.length})
          </h2>

          {loading ? (
            <div className="p-6 text-center text-xs text-slate-500">Loading sessions...</div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 rounded-xl border border-dashed border-white/10 bg-slate-900/30">
              No recorded sessions found. Real-time meetings will auto-save here in IndexedDB.
            </div>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {filteredSessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => selectSession(s.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    selectedSessionId === s.id
                      ? 'border-cyan-500/40 bg-cyan-950/20 shadow-md'
                      : 'border-white/5 bg-[#070b13] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-white leading-tight">{s.title}</h3>
                      <p className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        {s.role} &bull; {s.company}
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteSession(s.id, e)}
                      className="text-slate-600 hover:text-red-400 p-1"
                      title="Delete session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mt-3 text-[10px] font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(s.startTime).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      {s.answerCount} answers
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Session Detail & AI Answers View */}
        <div className="md:col-span-2 rounded-2xl border border-white/10 bg-[#070b13] p-5 space-y-4">
          {selectedSessionId ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h2 className="text-sm font-bold text-white">Interview Debrief &amp; Solutions</h2>
                  <p className="text-xs text-slate-400">
                    {sessionAnswers.length} AI talking points &bull; {sessionTranscripts.length} transcript logs
                  </p>
                </div>

                <button
                  onClick={exportMarkdown}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-500/30 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Markdown</span>
                </button>
              </div>

              {/* Answers */}
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {sessionAnswers.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-6 text-center">
                    No generated answers in this session yet.
                  </p>
                ) : (
                  sessionAnswers.map((ans, idx) => (
                    <div
                      key={ans.id}
                      className="rounded-xl border border-white/5 bg-slate-900/60 p-4 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between font-mono text-[11px] text-cyan-400 border-b border-white/5 pb-1">
                        <span className="font-bold">Q{idx + 1}: &ldquo;{ans.question}&rdquo;</span>
                        <span className="uppercase text-[10px] px-1.5 rounded bg-black/40">
                          {ans.mode}
                        </span>
                      </div>
                      <div className="text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                        {ans.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-xs text-slate-500">
              Select an interview session on the left to inspect questions and answers.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
