import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { HfInference } from "@huggingface/inference";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Service logic on backend
  let hfInstance: HfInference | null = null;
  function getHF() {
    if (!hfInstance) {
      const apiKey = process.env.HUGGING_FACE_API_KEY;
      if (!apiKey) throw new Error("HUGGING_FACE_API_KEY is not set.");
      hfInstance = new HfInference(apiKey);
    }
    return hfInstance;
  }

  // API Routes
  app.post("/api/ai/translate", async (req, res) => {
    try {
      const { text, from, to } = req.body;
      const hf = getHF();
      const result = await hf.translation({
        model: "Helsinki-NLP/opus-mt-mul-en",
        inputs: text
      });
      const translatedText = Array.isArray(result) ? result[0].translation_text : result.translation_text;
      res.json({ text: translatedText });
    } catch (error) {
      console.error("Server Translation Error:", error);
      res.status(500).json({ text: "Хатогӣ дар тарҷума", error: String(error) });
    }
  });

  app.post("/api/ai/analysis", async (req, res) => {
    try {
      const { text, from, to } = req.body;
      const hf = getHF();
      
      const prompt = `You are a language expert. Translate and analyze deeply.
Translate from ${from} to ${to}: "${text}"
Provide JSON response with:
- translation: main translation
- explanation: grammatical or semantic explanation
- examples: usage examples (array, max 2)
- synonyms: synonyms (array, max 3)
- culturalContext: cultural notes (string)

Return ONLY valid JSON, no extra text. No markdown formatting.`;

      const result = await hf.textGeneration({
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.5,
          top_p: 0.9
        }
      });

      const content = result.generated_text.replace(prompt, "").trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        translation: content.substring(0, 100),
        explanation: "Analysis provided",
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
      const hf = getHF();

      const conversationText = history.map((h: any) => {
        const content = h.content || h.parts?.[0]?.text || '';
        const role = h.role === 'model' || h.role === 'assistant' ? 'Assistant' : 'User';
        return `${role}: ${content}`;
      }).join('\n');

      const prompt = `You are "Хирад" - an extremely intelligent, thoughtful AI assistant specializing in languages and linguistics. You think deeply, provide accurate analysis, and explain complex concepts clearly. Respond in Tajik when appropriate.

${conversationText}
User: ${message}
Assistant:`;

      const result = await hf.textGeneration({
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        inputs: prompt,
        parameters: {
          max_new_tokens: 800,
          temperature: 0.7,
          top_p: 0.95
        }
      });

      const content = result.generated_text.split('Assistant:').pop()?.trim() || "Бубахшед, ман ҷавоб дода натавонистам.";
      res.json({ text: content });
    } catch (error) {
      console.error("Server Assistant Error:", error);
      res.status(500).json({ text: "Бубахшед, мушкили техникӣ пеш омад.", error: String(error) });
    }
  });

  app.post("/api/ai/morphology", async (req, res) => {
    try {
      const { word } = req.body;
      const hf = getHF();
      const prompt = `Analyze the Tajik word: "${word}". 
Return JSON with: root, suffixes, base, part_of_speech, meaning.
Return ONLY valid JSON, no markdown.`;

      const result = await hf.textGeneration({
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        inputs: prompt,
        parameters: {
          max_new_tokens: 300,
          temperature: 0.3
        }
      });
      
      const content = result.generated_text.replace(prompt, "").trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
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
      const hf = getHF();
      const prompt = `Check spelling and grammar for this Tajik text: "${text}".
Return JSON with: errors (array of {word, correction, reason}), score (0-100).
Return ONLY valid JSON, no markdown.`;

      const result = await hf.textGeneration({
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        inputs: prompt,
        parameters: {
          max_new_tokens: 400,
          temperature: 0.2
        }
      });
      
      const content = result.generated_text.replace(prompt, "").trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
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
      const hf = getHF();
      const context = sources.map((s:any) => `FILE: ${s.name}\nCONTENT:\n${s.content.substring(0, 3000)}`).join('\n\n');
      const prompt = `Extract dictionary entries from these files:\n${context}
Return JSON with: entries (array of {word, definition, examples, pos}).
Return ONLY valid JSON, no markdown.`;

      const result = await hf.textGeneration({
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        inputs: prompt,
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.3
        }
      });
      
      const content = result.generated_text.replace(prompt, "").trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
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
      const hf = getHF();
      const prompt = `Find academic definition for Tajik word: "${word}".
Return JSON with: definition, etymology, examples (array, max 2), synonyms (array, max 3), source.
Return ONLY valid JSON, no markdown.`;

      const result = await hf.textGeneration({
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        inputs: prompt,
        parameters: {
          max_new_tokens: 600,
          temperature: 0.4
        }
      });
      
      const content = result.generated_text.replace(prompt, "").trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
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
