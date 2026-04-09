import OpenAI from "openai";

/**
 * aiService.js
 *
 * The ONLY place in the entire app that talks to OpenAI.
 * All other code (controllers, routes) imports from here.
 *
 * Why isolate it?
 *   - Easy to swap OpenAI for Gemini / Anthropic later
 *   - Easy to mock in tests
 *   - Single place to adjust model, temperature, system prompt
 */

// Lazy-initialise so missing API key only crashes at call-time, not on import
let openaiClient = null;

const getClient = () => {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set in .env");
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
};

// ── System prompt ────────────────────────────────────────────────────────────
// Defines Chatty AI's personality. Edit freely.
const SYSTEM_PROMPT = `You are Chatty AI, a friendly, helpful, and concise AI assistant 
embedded in a real-time chat application. 
- Keep replies short and conversational (1-4 sentences unless a longer answer is clearly needed).
- Use plain language — no markdown headers, no bullet lists unless specifically asked.
- Be warm and human-sounding.
- If you don't know something, say so honestly.`;

/**
 * getChattyResponse
 * Sends the user's message to OpenAI and returns the AI's reply as a plain string.
 *
 * @param {string} userMessage  - The text the user sent
 * @param {Array}  history      - Optional: [{role:"user"|"assistant", content:string}]
 *                                Pass recent messages for multi-turn context
 * @returns {Promise<string>}   - The AI reply text
 */
export const getChattyResponse = async (userMessage, history = []) => {
  const client = getClient();

  // Build the messages array: system prompt + optional history + latest user message
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-10), // keep last 10 exchanges to stay within token limits
    { role: "user", content: userMessage },
  ];

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini", // override in .env if needed
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  const reply = completion.choices[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error("OpenAI returned an empty response");
  }

  return reply;
};
