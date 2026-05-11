import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // OpenRouter API helper
  async function callOpenRouter(messages: any[], model: string, systemPrompt?: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set.");

    const payload: any = {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1500,
    };

    if (systemPrompt) {
      payload.system = systemPrompt;
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Language Assistant"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // API Routes
  app.post("/api/ai/translate", async (req, res) => {
    try {
      const { text, from, to } = req.body;
      const response = await callOpenRouter(
        [{ role: "user", content: `Translate from ${from} to ${to}: "${text}". Provide only the translation.` }],
        "meta-llama/llama-2-70b-chat"
      );
      res.json({ text: response });
    } catch (error) {
      console.error("Server Translation Error:", error);
      res.status(500).json({ text: "Хатогӣ дар тарҷума", error: String(error) });
    }
  });

  app.post("/api/ai/analysis", async (req, res) => {
    try {
      const { text, from, to } = req.body;
      const prompt = `You are a language expert. Translate and analyze deeply.
Translate from ${from} to ${to}: "${text}"
Provide JSON response with:
- translation: main translation
- explanation: grammatical or semantic explanation
- examples: usage examples (array, max 2)
- synonyms: synonyms (array, max 3)
- culturalContext: cultural notes (string)

Return ONLY valid JSON, no markdown, no explanation text before or after.`;

      const response = await callOpenRouter(
        [{ role: "user", content: prompt }],
        "meta-llama/llama-2-70b-chat"
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        translation: text,
        explanation: response,
        examples: [],
        synonyms: [],
        culturalContext: ""
      };
      res.json(parsed);
    } catch (error) {
      console.error("Server Analysis Error:", error);
      res.status(500).json({ 
        translation: "Хатогӣ", 
        explanation: "Analysis failed",
        examples: [],
        synonyms: [],
        culturalContext: ""
      });
    }
  });

  app.post("/api/ai/assistant", async (req, res) => {
    try {
      const { message, history } = req.body;

      const messages = history.map((h: any) => ({
        role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user' as const,
        content: h.content || h.parts?.[0]?.text || ''
      }));
      messages.push({ role: 'user' as const, content: message });

      const systemPrompt = `You are "Хирад" - an extremely intelligent, thoughtful AI assistant specializing in languages and linguistics. You think deeply, provide accurate analysis, and explain complex concepts clearly. Respond in Tajik when appropriate. Be concise but thorough.`;

      const response = await callOpenRouter(
        messages as any[],
        "meta-llama/llama-2-70b-chat",
        systemPrompt
      );

      res.json({ text: response });
    } catch (error) {
      console.error("Server Assistant Error:", error);
      res.status(500).json({ text: "Бубахшед, мушкили техникӣ пеш омад.", error: String(error) });
    }
  });

  app.post("/api/ai/morphology", async (req, res) => {
    try {
      const { word } = req.body;
      const prompt = `Analyze the Tajik word: "${word}". 
Return JSON with: root, suffixes, base, part_of_speech, meaning.
Return ONLY valid JSON.`;

      const response = await callOpenRouter(
        [{ role: "user", content: prompt }],
        "meta-llama/llama-2-70b-chat"
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      res.json(parsed);
    } catch (error) { 
      console.error("Morphology error:", error);
      res.status(500).json({ error: "Morphology failed" }); 
    }
  });

  app.post("/api/ai/spelling", async (req, res) => {
    try {
      const { text } = req.body;
      const prompt = `Check spelling and grammar for this Tajik text: "${text}".
Return JSON with: errors (array of {word, correction, reason}), score (0-100).
Return ONLY valid JSON.`;

      const response = await callOpenRouter(
        [{ role: "user", content: prompt }],
        "meta-llama/llama-2-70b-chat"
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { errors: [], score: 100 };
      res.json(parsed);
    } catch (error) { 
      console.error("Spelling error:", error);
      res.status(500).json({ error: "Spelling failed" }); 
    }
  });

  app.post("/api/ai/parse-dict", async (req, res) => {
    try {
      const { sources } = req.body;
      const context = sources.map((s:any) => `FILE: ${s.name}\nCONTENT:\n${s.content.substring(0, 3000)}`).join('\n\n');
      const prompt = `Extract dictionary entries from these files:\n${context}
Return JSON with: entries (array of {word, definition, examples, pos}).
Return ONLY valid JSON.`;

      const response = await callOpenRouter(
        [{ role: "user", content: prompt }],
        "meta-llama/llama-2-70b-chat"
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { entries: [] };
      res.json(parsed);
    } catch (error) { 
      console.error("Parse dict error:", error);
      res.status(500).json({ error: "Parsing failed" }); 
    }
  });

  app.post("/api/ai/academic", async (req, res) => {
    try {
      const { word } = req.body;
      const prompt = `Find academic definition for Tajik word: "${word}".
Return JSON with: definition, etymology, examples (array, max 2), synonyms (array, max 3), source.
Return ONLY valid JSON.`;

      const response = await callOpenRouter(
        [{ role: "user", content: prompt }],
        "meta-llama/llama-2-70b-chat"
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      res.json(parsed);
    } catch (error) { 
      console.error("Academic error:", error);
      res.status(500).json({ error: "Academic search failed" }); 
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
