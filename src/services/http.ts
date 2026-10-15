export const isDesktop = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/** POST JSON to an AI provider. Desktop: direct (CORS-free). Web: via the Express proxy. */
export async function proxyPost(
  endpoint: string,
  headers: Record<string, string>,
  body: unknown
): Promise<Response> {
  if (isDesktop()) {
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
    return tauriFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  }
  return fetch('/api/ai/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, headers, body }),
  });
}

interface GeminiArgs {
  apiKey?: string;
  model?: string;
  prompt?: string;
  systemInstruction?: string;
  imageBase64?: string;
}

/** Gemini call. Desktop: direct REST with the user's key. Web: server-side key. */
export async function geminiGenerate(args: GeminiArgs): Promise<string> {
  const { apiKey, model = 'gemini-3.8-flash', prompt, systemInstruction, imageBase64 } = args;

  if (!isDesktop()) {
    const res = await fetch('/api/ai/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemInstruction, imageBase64 }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server error (${res.status})`);
    }
    return (await res.json()).text || '';
  }

  if (!apiKey) throw new Error('Gemini API key missing. Add one in Settings.');

  const parts: any[] = [];
  if (imageBase64) {
    parts.push({
      inlineData: { mimeType: 'image/png', data: imageBase64.replace(/^data:image\/\w+;base64,/, '') },
    });
  }
  if (prompt) parts.push({ text: prompt });

  const res = await proxyPostRaw(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    { 'x-goog-api-key': apiKey },
    {
      contents: [{ role: 'user', parts }],
      ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini error (${res.status})`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
}

async function proxyPostRaw(url: string, headers: Record<string, string>, body: unknown) {
  const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
  return tauriFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}
