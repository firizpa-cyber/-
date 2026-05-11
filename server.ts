import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Groq from "groq-sdk";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Service logic on backend
  let groqInstance: Groq | null = null;
  function getGroq() {
    if (!groqInstance) {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("GROQ_API_KEY is not set.");
      groqInstance = new Groq({ apiKey });
    }
    return groqInstance;
  }

  // API Routes
  app.post("/api/ai/translate", async (req, res) => {
    try {
      const { text, from, to } = req.body;
      const groq = getGroq();
      const response = await groq.chat.completions.create({
        model: "mixtral-8x7b-32768",
        messages: [{ role: "user", content: `Translate from ${from} to ${to}: "${text}". Provide only the translation.` }],
        max_tokens: 500,
        temperature: 0.3,
      });
      const content = response.choices[0].message.content || "Хатогӣ дар тарҷума";
      res.json({ text: content });
    } catch (error) {
      console.error("Server Translation Error:", error);
      res.status(500).json({ text: "Хатогӣ дар тарҷума", error: String(error) });
    }
  });

  app.post("/api/ai/analysis", async (req, res) => {
    try {
      const { text, from, to } = req.body;
      const groq = getGroq();
      const response = await groq.chat.completions.create({
        model: "mixtral-8x7b-32768",
        messages: [{
          role: "user",
          content: `You are a language expert. Translate and analyze deeply.
Translate from ${from} to ${to}: "${text}"
Provide JSON response with:
- translation: main translation
- explanation: grammatical or semantic explanation
- examples: usage examples (array)
- synonyms: synonyms (array)
- culturalContext: cultural notes (string)
Return ONLY valid JSON, no extra text.`
        }],
        max_tokens: 1500,
        temperature: 0.5,
      });
      const content = response.choices[0].message.content || "{}";
      const parsed = JSON.parse(content);
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
      const groq = getGroq();

      const messages = history.map((h: any) => ({
        role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user' as const,
        content: h.content || h.parts?.[0]?.text || ''
      }));
      messages.push({ role: 'user' as const, content: message });

      const response = await groq.chat.completions.create({
        model: "mixtral-8x7b-32768",
        messages,
        system: `You are "Хирад" - an extremely intelligent, thoughtful AI assistant specializing in languages and linguistics. You think deeply, provide accurate analysis, and explain complex concepts clearly. Respond in Tajik when appropriate.`,
        max_tokens: 2000,
        temperature: 0.7,
      });

      const content = response.choices[0].message.content || "Бубахшед, ман ҷавоб дода натавонистам.";
      res.json({ text: content });
    } catch (error) {
      console.error("Server Assistant Error:", error);
      res.status(500).json({ text: "Бубахшед, мушкили техникӣ пеш омад.", error: String(error) });
    }
  });

  app.post("/api/ai/morphology", async (req, res) => {
    try {
      const { word } = req.body;
      const groq = getGroq();
      const response = await groq.chat.completions.create({
        model: "mixtral-8x7b-32768",
        messages: [{
          role: "user",
          content: `Analyze the Tajik word: "${word}". 
Return JSON with: root, suffixes, base, part_of_speech, meaning.
Return ONLY valid JSON.`
        }],
        max_tokens: 500,
        temperature: 0.3,
      });
      const content = response.choices[0].message.content || "{}";
      const parsed = JSON.parse(content);
      res.json(parsed);
    } catch (error) { 
      console.error("Morphology error:", error);
      res.status(500).json({ error: "Morphology failed" }); 
    }
  });

  app.post("/api/ai/spelling", async (req, res) => {
    try {
      const { text } = req.body;
      const groq = getGroq();
      const response = await groq.chat.completions.create({
        model: "mixtral-8x7b-32768",
        messages: [{
          role: "user",
          content: `Check spelling and grammar for this Tajik text: "${text}".
Return JSON with: errors (array of {word, correction, reason}), score (0-100).
Return ONLY valid JSON.`
        }],
        max_tokens: 800,
        temperature: 0.2,
      });
      const content = response.choices[0].message.content || "{}";
      const parsed = JSON.parse(content);
      res.json(parsed);
    } catch (error) { 
      console.error("Spelling error:", error);
      res.status(500).json({ error: "Spelling failed" }); 
    }
  });

  app.post("/api/ai/parse-dict", async (req, res) => {
    try {
      const { sources } = req.body;
      const groq = getGroq();
      const context = sources.map((s:any) => `FILE: ${s.name}\nCONTENT:\n${s.content.substring(0, 5000)}`).join('\n\n');
      const response = await groq.chat.completions.create({
        model: "mixtral-8x7b-32768",
        messages: [{
          role: "user",
          content: `Extract dictionary entries from these files:\n${context}
Return JSON with: entries (array of {word, definition, examples, pos}).
Return ONLY valid JSON.`
        }],
        max_tokens: 2000,
        temperature: 0.3,
      });
      const content = response.choices[0].message.content || "{}";
      const parsed = JSON.parse(content);
      res.json(parsed);
    } catch (error) { 
      console.error("Parse dict error:", error);
      res.status(500).json({ error: "Parsing failed" }); 
    }
  });

  app.post("/api/ai/academic", async (req, res) => {
    try {
      const { word } = req.body;
      const groq = getGroq();
      const response = await groq.chat.completions.create({
        model: "mixtral-8x7b-32768",
        messages: [{
          role: "user",
          content: `Find academic definition for Tajik word: "${word}".
Return JSON with: definition, etymology, examples (array), synonyms (array), source.
Return ONLY valid JSON.`
        }],
        max_tokens: 1000,
        temperature: 0.4,
      });
      const content = response.choices[0].message.content || "{}";
      const parsed = JSON.parse(content);
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
