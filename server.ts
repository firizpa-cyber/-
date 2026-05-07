import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Logic handled on the server to protect API Key
  const ai = new GoogleGenAI(process.env.GEMINI_API_KEY || "");
  const model = ai.getGenerativeModel({ model: "gemini-3-flash-preview" });

  app.post("/api/ai/translate", async (req, res) => {
    const { text, from, to } = req.body;
    const prompt = `Translate the following text from ${from} to ${to}: "${text}". Provide only the translation without any additional context.`;
    
    try {
      const result = await model.generateContent(prompt);
      res.json({ translation: result.response.text().trim() });
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ error: "Failed to translate" });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    const { message, history } = req.body;
    
    try {
      const result = await model.generateContent({
        contents: [
          ...history.map((h: any) => ({ role: h.role, parts: h.parts })),
          { role: 'user', parts: [{ text: message }] }
        ],
        generationConfig: {
          maxOutputTokens: 2048,
        },
        systemInstruction: "Шумо ассистенти донишманди забони тоҷикӣ ҳастед. Ҳамеша бо забони тоҷикӣ ҷавоб диҳед.",
      });
      res.json({ response: result.response.text() });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Assistant failed" });
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
