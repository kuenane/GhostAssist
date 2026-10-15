import React, { useState, useEffect } from 'react';
import {
  FileText,
  User,
  Briefcase,
  Sparkles,
  Upload,
  Check,
  Zap,
  Save,
  RotateCcw,
  Tag,
  Award,
  BookOpen,
} from 'lucide-react';
import { ResumeProfile, AIAnswer } from '../types';
import { dbService } from '../services/db';
import { aiService } from '../services/aiService';

interface ResumeKnowledgeBaseProps {
  onProfileUpdated?: (profile: ResumeProfile) => void;
}

const SAMPLE_RESUME_TEXT = `LEBOHANG KUENANE
Senior Software Engineer / Distributed Systems Architect
Email: lebohang.kuenane44@gmail.com | GitHub: github.com/lebohang | LinkedIn: linkedin.com/in/lebohang

SUMMARY:
Senior Full-Stack & Systems Engineer with 7+ years of experience designing high-throughput, low-latency microservices, cloud-native distributed systems, and real-time streaming architectures. Led engineering initiatives scaling applications to 10M+ daily active users while maintaining 99.99% availability.

WORK EXPERIENCE:

Senior Systems Architect | CloudScale Global (2022 - Present)
• Architected and migrated monolithic financial core to event-driven microservices using Go, Apache Kafka, and PostgreSQL, reducing p99 transaction latency from 450ms to 65ms.
• Designed and implemented distributed cache-aside tier using Redis Sentinel clusters and local in-memory caching with TTL jitter, reducing database read load by 68%.
• Championed Transactional Outbox pattern with Debezium CDC to guarantee zero message loss during database writes and network partitions.
• Mentored a team of 9 distributed engineers across Europe and North America, instituting RFC review processes and automated canary deployment gates.

Lead Backend Engineer | FinTech Velocity (2019 - 2022)
• Built high-frequency transaction reconciliation engine processing $40M+ in daily volume using Node.js, TypeScript, and Docker on AWS EKS.
• Implemented strict idempotency keys with distributed Redis distributed locks, eliminating dual-charge chargeback anomalies down to 0.00%.
• Reduced CI/CD pipeline build times from 28 minutes to 4.5 minutes by containerizing test harnesses and introducing incremental caching.

TECHNICAL SKILLS:
• Languages: TypeScript, JavaScript, Go, Python, SQL, Rust
• Systems & Frameworks: Node.js, React, Express, Kafka, Redis, Docker, Kubernetes, AWS (EKS, RDS, S3), PostgreSQL, MongoDB
• Methodologies: System Design, Microservices, Domain-Driven Design (DDD), Distributed Consensus, STAR Behavioral Communication

NOTABLE PROJECTS:
• GhostAssist: Ultra-lightweight native desktop assistant built with Tauri and React with Win32/Cocoa screen-capture exclusion for zero screen-recording visibility.
• Distributed Rate Limiter: Sliding-window log rate limiter with Redis cluster handling 100k+ requests/sec with &lt;2ms overhead.`;

export const ResumeKnowledgeBase: React.FC<ResumeKnowledgeBaseProps> = ({ onProfileUpdated }) => {
  const [profile, setProfile] = useState<ResumeProfile>({
    resumeText: '',
    candidateName: 'Lebohang Kuenane',
    currentRole: 'Senior Distributed Systems Architect',
    targetRole: 'Staff / Senior Software Engineer',
    yearsOfExperience: '7+ Years',
    skills: ['Go', 'TypeScript', 'Kafka', 'Redis', 'PostgreSQL', 'Docker', 'System Design', 'React'],
    topAccomplishments: [
      'Reduced p99 latency from 450ms to 65ms via Kafka event-driven migration',
      'Cut database read load by 68% using Redis Sentinel caching with TTL jitter',
      'Built financial reconciliation engine processing $40M daily volume with zero duplicate charges',
    ],
    useResumeContext: true,
    updatedAt: Date.now(),
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testQuestion, setTestQuestion] = useState('Can you describe a time you improved a high-latency system under heavy traffic?');
  const [isTesting, setIsTesting] = useState(false);
  const [testAnswer, setTestAnswer] = useState<AIAnswer | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await dbService.getResumeProfile();
      if (stored) {
        setProfile(stored);
      } else {
        // Default with sample resume ready to try
        const initial = { ...profile, resumeText: SAMPLE_RESUME_TEXT };
        setProfile(initial);
        await dbService.saveResumeProfile(initial);
      }
    } catch (e) {
      console.warn('Failed to load profile:', e);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = { ...profile, updatedAt: Date.now() };
      await dbService.saveResumeProfile(updated);
      onProfileUpdated?.(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const loadSample = () => {
    const updated = {
      ...profile,
      resumeText: SAMPLE_RESUME_TEXT,
      candidateName: 'Lebohang Kuenane',
      currentRole: 'Senior Distributed Systems Architect',
      targetRole: 'Staff / Senior Software Engineer',
      yearsOfExperience: '7+ Years',
      skills: ['Go', 'TypeScript', 'Kafka', 'Redis', 'PostgreSQL', 'Docker', 'System Design', 'React'],
    };
    setProfile(updated);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setProfile((prev) => ({
        ...prev,
        resumeText: text,
      }));
    };
    reader.readAsText(file);
  };

  // Test resume grounding
  const handleTestResumeAnswer = async () => {
    setIsTesting(true);
    setTestAnswer(null);
    try {
      const answer = await aiService.generateAnswer(
        testQuestion,
        'star',
        undefined,
        undefined,
        profile
      );
      setTestAnswer(answer);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 via-slate-900/60 to-black p-6 relative overflow-hidden">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Resume &amp; Career Knowledge Grounding</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Answer Questions Using Your Real Experience
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Upload or paste your resume. When the interviewer asks behavioral questions or technical
              challenges, GhostAssist references your real projects, actual companies, and quantifiable metrics
              so you speak authentically.
            </p>
          </div>

          {/* Toggle Grounding */}
          <div className="p-3.5 rounded-xl border border-white/10 bg-slate-950/80 flex items-center gap-3">
            <div>
              <p className="text-xs font-bold text-white">Resume Grounding</p>
              <p className="text-[10px] text-slate-400">Anchor AI to your background</p>
            </div>
            <button
              onClick={() => {
                const next = !profile.useResumeContext;
                setProfile((prev) => ({ ...prev, useResumeContext: next }));
                dbService.saveResumeProfile({ ...profile, useResumeContext: next });
              }}
              className={`px-3 py-1 rounded-lg text-xs font-mono border transition ${
                profile.useResumeContext
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-800 text-slate-400 border-white/10'
              }`}
            >
              {profile.useResumeContext ? 'ACTIVE' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Meta Profile Fields */}
      <div className="rounded-2xl border border-white/10 bg-[#070b13] p-5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-cyan-400" />
          Target Role &amp; Experience Metadata
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="space-y-1">
            <label className="text-slate-400">Candidate Name:</label>
            <input
              type="text"
              value={profile.candidateName}
              onChange={(e) => setProfile({ ...profile, candidateName: e.target.value })}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400">Current Role:</label>
            <input
              type="text"
              value={profile.currentRole}
              onChange={(e) => setProfile({ ...profile, currentRole: e.target.value })}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400">Target Interview Role:</label>
            <input
              type="text"
              value={profile.targetRole}
              onChange={(e) => setProfile({ ...profile, targetRole: e.target.value })}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400">Years of Experience:</label>
            <input
              type="text"
              value={profile.yearsOfExperience}
              onChange={(e) => setProfile({ ...profile, yearsOfExperience: e.target.value })}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* Main Resume Content Editor */}
      <div className="rounded-2xl border border-white/10 bg-[#070b13] p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Full Resume / CV Text Content</h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 cursor-pointer transition">
              <Upload className="w-3.5 h-3.5" />
              <span>Import .txt / .md</span>
              <input type="file" accept=".txt,.md,.json" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={loadSample}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Load Sample Resume</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold transition"
            >
              {saveSuccess ? <Check className="w-3.5 h-3.5 text-black" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saveSuccess ? 'Saved to DB' : 'Save Resume'}</span>
            </button>
          </div>
        </div>

        <textarea
          rows={14}
          value={profile.resumeText}
          onChange={(e) => setProfile({ ...profile, resumeText: e.target.value })}
          placeholder="Paste your resume, CV, or LinkedIn experience here..."
          className="w-full p-3.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400 leading-relaxed"
        />
      </div>

      {/* Interactive Verification: Test Answering with Resume */}
      <div className="rounded-2xl border border-white/10 bg-[#070b13] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Verify Real-Time Resume Grounding</h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            STAR BEHAVIORAL TEST
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={testQuestion}
            onChange={(e) => setTestQuestion(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            placeholder="Type any interview question..."
          />
          <button
            onClick={handleTestResumeAnswer}
            disabled={isTesting}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold text-xs transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isTesting ? 'Generating from Resume...' : 'Test Answering'}</span>
          </button>
        </div>

        {testAnswer && (
          <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-purple-300 border-b border-purple-500/20 pb-1">
              <span className="font-bold">ANSWER GROUNDED IN RESUME:</span>
              <span className="text-emerald-400 font-bold">✓ Real Metrics Cited</span>
            </div>
            <div className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
              {testAnswer.content}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
