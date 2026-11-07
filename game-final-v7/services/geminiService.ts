// Client-side Gemini service calling server API routes and WebSocket Live API
// All Gemini SDK calls run securely on the server via process.env.GEMINI_API_KEY

const FALLBACK_LORE = [
  "The fog thickens...",
  "They smell your fear.",
  "Fetch me their souls...",
  "Don't look back.",
  "The dead are rising...",
  "No one is coming to save you.",
  "Run while you still can.",
  "The bus is late...",
  "Is that a light in the distance?",
  "Stay out of the fire.",
  "A cold wind blows from the east.",
  "They are closer than you think.",
  "The town is silent. Too silent.",
  "The bank is empty, but not abandoned.",
  "Can you hear the scratching at the door?",
  "The shadows are moving on their own.",
  "Keep your eyes on the rooftops.",
  "The air tastes like copper.",
  "Every corner holds a secret.",
  "The silence is heavier than the dark."
];

let apiDisabledUntil = 0;

/**
 * Fetches round lore from the server-side Gemini API endpoint.
 * Gracefully falls back to atmospheric lore if offline or rate limited.
 */
export const getRoundLore = async (round: number): Promise<string> => {
  const now = Date.now();
  
  if (now < apiDisabledUntil) {
    return FALLBACK_LORE[Math.floor(Math.random() * FALLBACK_LORE.length)];
  }

  try {
    const response = await fetch('/api/gemini/lore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ round }),
    });

    if (response.status === 429) {
      apiDisabledUntil = now + 300000; // 5 minute cooldown
      console.warn("Gemini API quota exhausted on server. Switched to fallback lore.");
      const data = await response.json().catch(() => null);
      return data?.lore || FALLBACK_LORE[Math.floor(Math.random() * FALLBACK_LORE.length)];
    }

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      if (data?.lore) return data.lore;
      return FALLBACK_LORE[Math.floor(Math.random() * FALLBACK_LORE.length)];
    }

    const data = await response.json();
    const text = data?.lore?.trim();
    if (text) {
      return text;
    }

    return FALLBACK_LORE[Math.floor(Math.random() * FALLBACK_LORE.length)];
  } catch (error: any) {
    console.warn("Gemini lore server request failed, using fallback:", error);
    return FALLBACK_LORE[Math.floor(Math.random() * FALLBACK_LORE.length)];
  }
};

/**
 * Streams Gemini text via the server's SSE streaming endpoint
 */
export const streamGeminiText = async (
  prompt: string,
  onChunk: (text: string) => void,
  onComplete?: () => void,
  onError?: (err: any) => void
): Promise<void> => {
  try {
    const response = await fetch('/api/gemini/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Streaming failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') {
            if (onComplete) onComplete();
            return;
          }
          try {
            const parsed = JSON.parse(raw);
            if (parsed.text) onChunk(parsed.text);
          } catch {
            // ignore malformed chunks
          }
        }
      }
    }
    if (onComplete) onComplete();
  } catch (err) {
    if (onError) onError(err);
    else console.warn("Gemini stream error:", err);
  }
};
