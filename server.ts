import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Increase payload limit for base64 screenshots and audio chunks
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Google GenAI on server-side with User-Agent telemetry as required
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Server-side health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    hasServerGeminiKey: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

// Gemini generation endpoint (for built-in AI copilot & screenshot vision)
app.post('/api/ai/gemini/generate', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server. You can provide your own BYOK key in Settings.',
      });
    }

    const { prompt, systemInstruction, imageBase64, mimeType = 'image/png' } = req.body;

    if (!prompt && !imageBase64) {
      return res.status(400).json({ error: 'Prompt or image is required' });
    }

    const contents: any[] = [];

    if (imageBase64) {
      // Clean up base64 prefix if present
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      contents.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }

    if (prompt) {
      contents.push({ text: prompt });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: contents },
      config: {
        systemInstruction: systemInstruction || 'You are GhostAssist, an undetectable, ultra-sharp real-time interview and meeting copilot. Provide concise, high-impact, directly speakable answers with bullet points and code where appropriate.',
      },
    });

    const reply = response.text || '';
    res.json({ text: reply });
  } catch (err: any) {
    console.error('Server Gemini Error:', err);
    res.status(500).json({
      error: err.message || 'Failed to generate response with Gemini',
    });
  }
});

// Universal BYOK Proxy for CORS-sensitive AI providers (Groq, Anthropic, OpenAI, DeepSeek, Ollama)
app.post('/api/ai/proxy', async (req, res) => {
  try {
    const { endpoint, method = 'POST', headers = {}, body } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    // Security check: Allow standard and custom AI provider hostnames
    const url = new URL(endpoint);
    const allowedHosts = [
      'api.openai.com',
      'api.groq.com',
      'api.anthropic.com',
      'api.deepseek.com',
      'integrate.api.nvidia.com',
      'openrouter.ai',
      'api.together.xyz',
      'api.mistral.ai',
      'api.perplexity.ai',
      'api.x.ai',
      'generativelanguage.googleapis.com',
      'localhost',
      '127.0.0.1',
    ];

    const isAllowed =
      allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) ||
      url.protocol === 'http:' || // Allow local models (e.g. LM Studio, vLLM, Ollama on LAN)
      url.hostname.includes('nvidia') ||
      url.hostname.includes('together') ||
      url.hostname.includes('openrouter');

    if (!isAllowed) {
      return res.status(403).json({ error: `Host ${url.hostname} is not allowed via proxy` });
    }

    const proxyResponse = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });

    const responseData = await proxyResponse.text();
    let parsed: any;
    try {
      parsed = JSON.parse(responseData);
    } catch {
      parsed = responseData;
    }

    res.status(proxyResponse.status).json(parsed);
  } catch (err: any) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: err.message || 'Proxy request failed' });
  }
});

// Git Repository Status Endpoint
app.get('/api/git/status', async (_req, res) => {
  try {
    const { execSync } = await import('child_process');
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const commitMsg = execSync('git log -1 --pretty=%B').toString().trim();
    const isClean = execSync('git status --porcelain').toString().trim().length === 0;

    res.json({
      initialized: true,
      branch,
      commitHash,
      commitMsg,
      isClean,
      repoName: 'GhostAssist',
    });
  } catch (err: any) {
    res.json({
      initialized: false,
      error: err.message,
    });
  }
});

// Git Push Endpoint (Pushes local GhostAssist repo to GitHub)
app.post('/api/git/push', async (req, res) => {
  try {
    const { githubUsername, githubToken, repoName = 'GhostAssist', isPrivate = false } = req.body;

    if (!githubUsername || !githubToken) {
      return res.status(400).json({
        error: 'GitHub username and personal access token (PAT) are required to push to GitHub.',
      });
    }

    // 1. Attempt to create the repository on GitHub if it does not already exist
    try {
      const createRepoRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'GhostAssist-App',
        },
        body: JSON.stringify({
          name: repoName,
          description: 'GhostAssist - Undetectable Stealth AI Meeting & Interview Copilot with Tauri and Resume Grounding',
          private: Boolean(isPrivate),
          auto_init: false,
        }),
      });

      if (createRepoRes.status !== 201 && createRepoRes.status !== 422) {
        // 422 indicates repository already exists on GitHub, which is fine
        const errText = await createRepoRes.text();
        console.warn('GitHub repo creation note:', errText);
      }
    } catch (e) {
      console.warn('GitHub API repo check notice:', e);
    }

    // 2. Perform git push using credentials safely
    const { execSync } = await import('child_process');
    const remoteUrl = `https://${encodeURIComponent(githubUsername)}:${encodeURIComponent(githubToken)}@github.com/${githubUsername}/${repoName}.git`;

    // Ensure main branch
    execSync('git branch -M main');
    // Push branch main to remote URL
    const output = execSync(`git push -u "${remoteUrl}" main --force`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    res.json({
      success: true,
      repoUrl: `https://github.com/${githubUsername}/${repoName}`,
      output: output || 'Repository successfully pushed to GitHub!',
    });
  } catch (err: any) {
    console.error('Git push error:', err);
    const sanitizedError = (err.message || '').replace(new RegExp(req.body.githubToken || 'xxxx', 'g'), '••••');
    res.status(500).json({
      error: `Failed to push to GitHub: ${sanitizedError}`,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GhostAssist server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
});
