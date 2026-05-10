import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Service logic on backend
  let aiInstance: GoogleGenerativeAI | null = null;
  function getAI() {
    if (!aiInstance) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
      aiInstance = new GoogleGenerativeAI(apiKey);
    }
    return aiInstance;
  }

  // API Routes
  app.post("/api/ai/translate", async (req, res) => {
    try {
      const { text, from, to } = req.body;
      const ai = getAI();
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const response = await model.generateContent(`Translate from ${from} to ${to}: "${text}". Provide only the translation.`);
      res.json({ text: response.response.text() });
    } catch (error) {
      console.error("Server Translation Error:", error);
      res.status(500).json({ text: "Хатогӣ дар тарҷума", error: String(error) });
    }
  });

  app.post("/api/ai/analysis", async (req, res) => {
    try {
      const { text, from, to } = req.body;
      const ai = getAI();
      const model = ai.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });
      const prompt = `Шумо "Хирад" ҳастед, коршиноси забонҳо. 
      Матни зеринро аз ${from} ба ${to} тарҷума кунед ва сипас таҳлили амиқ диҳед:
      Матн: "${text}"
      Ҷавоби шумо бояд дар формати JSON бошад бо ин майдонҳо:
      - translation: тарҷумаи асосӣ
      - explanation: шарҳи муфассали грамматикӣ ё маъноӣ
      - examples: намунаҳои истифода (массив)
      - synonyms: синонимҳо (массив)
      - culturalContext: шарҳи кӯтоҳ дар бораи истифодаи ин калима ё ҷумла дар фарҳанг`;
      
      const response = await model.generateContent(prompt);
      res.json(JSON.parse(response.response.text()));
    } catch (error) {
      console.error("Server Analysis Error:", error);
      res.status(500).json({ 
        translation: "Хатогӣ", 
        explanation: "Дарёфти шарҳ имконнопазир шуд",
        examples: [],
        synonyms: [],
        culturalContext: ""
      });
    }
  });

  app.post("/api/ai/assistant", async (req, res) => {
    try {
      const { message, history } = req.body;
      const ai = getAI();
      const model = ai.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: `Шумо "Хирад" ҳастед - ассистенти зеҳни сунъии ниҳоят донишманд...`
      });

      const chat = model.startChat({
        history: history.map((h: any) => ({
          role: h.role === 'model' || h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content || h.parts?.[0]?.text || '' }]
        }))
      });

      const response = await chat.sendMessage(message);
      res.json({ text: response.response.text() });
    } catch (error) {
      console.error("Server Assistant Error:", error);
      res.status(500).json({ text: "Бубахшед, мушкили техникӣ пеш омад.", error: String(error) });
    }
  });

  app.post("/api/ai/morphology", async (req, res) => {
    try {
      const { word } = req.body;
      const ai = getAI();
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
      const prompt = `Analyze the Tajik word: "${word}". System: Tajik linguistics expert specializing in morphology. Return data about root, suffixes, base, and part of speech.`;
      const response = await model.generateContent(prompt);
      res.json(JSON.parse(response.response.text()));
    } catch (error) { res.status(500).json({ error: "Morphology failed" }); }
  });

  app.post("/api/ai/spelling", async (req, res) => {
    try {
      const { text } = req.body;
      const ai = getAI();
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
      const prompt = `Check spelling and grammar for this Tajik text: "${text}". System: Professional Tajik editor.`;
      const response = await model.generateContent(prompt);
      res.json(JSON.parse(response.response.text()));
    } catch (error) { res.status(500).json({ error: "Spelling failed" }); }
  });

  app.post("/api/ai/parse-dict", async (req, res) => {
    try {
      const { sources } = req.body;
      const ai = getAI();
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
      const context = sources.map((s:any) => `FILE: ${s.name}\nCONTENT:\n${s.content.substring(0, 10000)}`).join('\n\n');
      const prompt = `Extract dictionary entries from these files:\n${context}`;
      const response = await model.generateContent(prompt);
      res.json(JSON.parse(response.response.text()));
    } catch (error) { res.status(500).json({ error: "Parsing failed" }); }
  });

  app.post("/api/ai/academic", async (req, res) => {
    try {
      const { word } = req.body;
      const ai = getAI();
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
      const prompt = `Ҷустуҷӯи калимаи академикӣ: "${word}". System: Tajik linguistics expert. Return definition, etymology, examples, synonyms.`;
      const response = await model.generateContent(prompt);
      res.json(JSON.parse(response.response.text()));
    } catch (error) { res.status(500).json({ error: "Academic search failed" }); }
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
