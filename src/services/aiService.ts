import { AIProvider, AnswerMode, AIAnswer, ResumeProfile } from '../types';
import { keyVault } from './keyVault';
import { dbService } from './db';

export const SYSTEM_PROMPTS: Record<AnswerMode, string> = {
  bullet: `You are GhostAssist, an invisible, ultra-sharp real-time interview & meeting copilot. 
The user is live on a call right now and needs an immediate, speakable answer.
RULES:
1. Provide 2 to 3 concise, punchy bullet points.
2. Written in first-person natural conversational tone ("I would approach this by...", "In my experience...").
3. Avoid generic filler words or robotic introductions.
4. Bold key terms or metrics for quick eye scanning. Maximum 75 words total.`,

  star: `You are GhostAssist, an interview coach. Provide a structured behavioral interview answer using the STAR method (Situation, Task, Action, Result).
Format with clear bold tags:
**Situation:** 1 sentence context & challenge.
**Task:** 1 sentence your specific responsibility.
**Action:** 2-3 specific actions you took (technologies, leadership, decision making).
**Result:** 1 quantifiable outcome or measurable impact.
Keep it realistic, senior-level, and conversational.`,

  code: `You are GhostAssist, a principal software engineer copilot. 
Solve the coding problem or technical question asked.
RULES:
1. State the optimal approach in 1 sentence.
2. Provide concise, clean, production-grade code (TypeScript/Python/Java depending on question).
3. State Time & Space Complexity (e.g. O(N) time, O(1) space).
4. Highlight 2 edge cases to mention out loud.`,

  architecture: `You are GhostAssist, a Principal Systems Architect copilot.
Provide a high-level system design breakdown:
1. **Core Architecture:** Components & data flow.
2. **Storage & DB Choice:** SQL vs NoSQL vs Cache and rationale.
3. **Scaling & Bottlenecks:** How to handle 100k+ QPS, partitioning, failover.
4. **Trade-offs:** Latency vs Consistency, Cost vs Availability.`,

  clarify: `You are GhostAssist. The user was just asked a question in an interview or meeting.
Generate 3 sharp, senior-level clarifying questions the user can ask back right now.
These questions must demonstrate deep domain understanding and buy the user 30 seconds to formulate thoughts.`,
};

class AIService {
  async generateAnswer(
    question: string,
    mode: AnswerMode = 'bullet',
    contextText?: string,
    forcedProvider?: AIProvider,
    customResume?: ResumeProfile | null
  ): Promise<AIAnswer> {
    const startTime = performance.now();
    const provider = forcedProvider || this.getActiveProvider();
    let systemPrompt = SYSTEM_PROMPTS[mode];

    // Check if resume context is available in DB or passed directly
    let resume = customResume;
    if (!resume) {
      try {
        resume = await dbService.getResumeProfile();
      } catch {}
    }

    const hasResume = Boolean(resume && resume.useResumeContext && resume.resumeText && resume.resumeText.trim());

    if (hasResume && resume) {
      systemPrompt += `\n\n--- CANDIDATE RESUME & CAREER CONTEXT ---
Candidate Name: ${resume.candidateName || 'Candidate'}
Target Role: ${resume.targetRole || 'Software Engineer'}
Years of Experience: ${resume.yearsOfExperience || 'Experienced'}
Candidate Skills: ${(resume.skills || []).join(', ')}

RESUME BODY & WORK HISTORY:
${resume.resumeText}

CRITICAL RESUME GROUNDING INSTRUCTION:
The candidate is answering questions about themselves in a live job interview. Whenever possible, ground your answer directly in the candidate's real work history, company projects, and quantifiable achievements from their resume above. Speak in first-person ("In my work at...", "I led...", "We achieved..."). Never fabricate fictitious companies if the candidate's resume provides relevant context.`;
    }

    let fullPrompt = `The interviewer or meeting participant asked/said:\n"${question}"`;
    if (contextText && contextText.trim()) {
      fullPrompt += `\n\nRecent meeting context:\n${contextText.slice(-1000)}`;
    }

    let responseContent = '';

    if (provider === 'gemini') {
      responseContent = await this.callGemini(fullPrompt, systemPrompt);
    } else {
      responseContent = await this.callBYOKProvider(provider, fullPrompt, systemPrompt);
    }

    const latencyMs = Math.round(performance.now() - startTime);

    return {
      id: 'ans_' + Math.random().toString(36).substring(2, 10),
      sessionId: 'current',
      timestamp: Date.now(),
      question,
      content: responseContent,
      mode,
      provider,
      bookmarked: false,
      latencyMs,
      usedResumeContext: hasResume,
    };
  }

  async analyzeScreenSnippet(
    imageBase64: string,
    userQuery: string = 'Analyze this screen snippet. If it is a coding question, solve it with optimal code. If it is system design or text, summarize key points and provide winning talking points.'
  ): Promise<string> {
    const activeProvider = this.getActiveProvider();

    // Prefer Gemini for visual analysis if available, or OpenAI GPT-4o if configured
    if (activeProvider === 'openai' && keyVault.getConfig('openai')?.apiKey) {
      return this.callOpenAIVision(imageBase64, userQuery);
    }

    // Default to server Gemini vision
    try {
      const res = await fetch('/api/ai/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userQuery,
          imageBase64,
          systemInstruction:
            'You are GhostAssist Vision, an undetectable desktop copilot. Extract text/code from this screenshot, identify the problem, and provide an immediate, structured solution that the candidate can explain out loud.',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Gemini Vision error (${res.status})`);
      }

      const data = await res.json();
      return data.text || 'No response generated from visual analysis.';
    } catch (err: any) {
      console.error('Vision analysis error:', err);
      return `Visual Analysis Error: ${err.message}. You can switch providers or verify your API keys in Settings.`;
    }
  }

  private getActiveProvider(): AIProvider {
    const configs = keyVault.getAllConfigs();
    for (const c of configs) {
      if (c.enabled && (c.apiKey || c.id === 'gemini')) {
        return c.id;
      }
    }
    return 'gemini';
  }

  private async callGemini(prompt: string, systemInstruction: string): Promise<string> {
    try {
      const res = await fetch('/api/ai/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemInstruction }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error (${res.status})`);
      }

      const data = await res.json();
      return data.text || 'No response returned from Gemini.';
    } catch (err: any) {
      return `GhostAssist AI Error: ${err.message}. Please configure a BYOK key in Settings or check server status.`;
    }
  }

  private async callBYOKProvider(
    provider: AIProvider,
    prompt: string,
    systemInstruction: string
  ): Promise<string> {
    const config = keyVault.getConfig(provider);
    if (!config || (!config.apiKey && provider !== 'ollama')) {
      throw new Error(`API key for ${provider.toUpperCase()} is missing. Please add it in Settings.`);
    }

    switch (provider) {
      case 'nvidia':
        return this.callOpenAICompatible(
          (config.baseUrl || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '') + '/chat/completions',
          config.apiKey,
          config.model || 'meta/llama-3.3-70b-instruct',
          prompt,
          systemInstruction
        );

      case 'groq':
        return this.callOpenAICompatible(
          'https://api.groq.com/openai/v1/chat/completions',
          config.apiKey,
          config.model || 'llama-3.3-70b-versatile',
          prompt,
          systemInstruction
        );

      case 'openai':
        return this.callOpenAICompatible(
          'https://api.openai.com/v1/chat/completions',
          config.apiKey,
          config.model || 'gpt-4o',
          prompt,
          systemInstruction
        );

      case 'deepseek':
        return this.callOpenAICompatible(
          'https://api.deepseek.com/v1/chat/completions',
          config.apiKey,
          config.model || 'deepseek-chat',
          prompt,
          systemInstruction
        );

      case 'ollama':
        return this.callOpenAICompatible(
          (config.baseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '') + '/chat/completions',
          'ollama',
          config.model || 'llama3.2',
          prompt,
          systemInstruction
        );

      case 'custom':
        return this.callOpenAICompatible(
          (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/chat/completions',
          config.apiKey,
          config.model || 'gpt-4o',
          prompt,
          systemInstruction
        );

      case 'anthropic':
        return this.callAnthropic(
          config.apiKey,
          config.model || 'claude-3-7-sonnet-20250219',
          prompt,
          systemInstruction
        );

      default:
        return this.callGemini(prompt, systemInstruction);
    }
  }

  private async callOpenAICompatible(
    url: string,
    apiKey: string,
    model: string,
    prompt: string,
    systemInstruction: string
  ): Promise<string> {
    const payload = {
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 750,
    };

    // Try direct fetch first; if blocked by CORS or mixed content, route via backend proxy
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content || 'No answer generated.';
      }
    } catch {
      // Direct call failed, fall back to proxy
    }

    // Call server proxy
    const proxyRes = await fetch('/api/ai/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: url,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: payload,
      }),
    });

    if (!proxyRes.ok) {
      const err = await proxyRes.json().catch(() => ({}));
      throw new Error(err.error || `Provider API returned status ${proxyRes.status}`);
    }

    const data = await proxyRes.json();
    return data.choices?.[0]?.message?.content || 'No response content.';
  }

  private async callAnthropic(
    apiKey: string,
    model: string,
    prompt: string,
    systemInstruction: string
  ): Promise<string> {
    const payload = {
      model,
      system: systemInstruction,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 700,
      temperature: 0.3,
    };

    const proxyRes = await fetch('/api/ai/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'https://api.anthropic.com/v1/messages',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: payload,
      }),
    });

    if (!proxyRes.ok) {
      const err = await proxyRes.json().catch(() => ({}));
      throw new Error(err.error || `Anthropic API error (${proxyRes.status})`);
    }

    const data = await proxyRes.json();
    return data.content?.[0]?.text || 'No response content.';
  }

  private async callOpenAIVision(imageBase64: string, prompt: string): Promise<string> {
    const config = keyVault.getConfig('openai');
    const apiKey = config?.apiKey || '';
    const payload = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}` },
            },
          ],
        },
      ],
      max_tokens: 600,
    };

    const proxyRes = await fetch('/api/ai/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'https://api.openai.com/v1/chat/completions',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: payload,
      }),
    });

    const data = await proxyRes.json();
    return data.choices?.[0]?.message?.content || 'Unable to analyze image.';
  }
}

export const aiService = new AIService();
