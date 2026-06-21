import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up json parsing with a generous size limit for webcam base64 frames
app.use(express.json({ limit: "15mb" }));

// Lazy init Gemini AI reference to avoid startup crash if key is loaded late
let aiInstance: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required to run grooming analysis.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// REST route for analyzing visual grooming attributes of the agent
app.post("/api/analyze-grooming", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Missing image in request body." });
    }

    // Extract base64 parts
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    let mimeType = "image/jpeg";
    let base64Data = image;

    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }

    const ai = getAI();
    const prompt = 
      "You are a Senior Aviation Training Inspector. Review this webcam photo of an airline agent. " +
      "Assess their compliance with strict aviation professional standards in 3 categories with specific questions:\n" +
      "1. Scarf/Tie: Is the airline scarf or tie centered, straight, and neatly tied? Is it missing or disheveled?\n" +
      "2. Name Badge: Is the name badge attached level/upright, clearly visible on the front torso, and readable? Or is it hidden/crooked?\n" +
      "3. Hair & Cap/Accessories: Is the hair style neat, professional, and matching aviation standard grooming (e.g. pulled back, tied neatly, no wild strands)?\n\n" +
      "Be constructive, brief, and authentic. Evaluate and output your findings in a JSON structure matches the schema.";

    const schema = {
      type: Type.OBJECT,
      properties: {
        scarfTieStatus: { 
          type: Type.STRING, 
          description: "Status and detail of the airline scarf or necktie. E.g. 'Straight, centered and compliant ✅' or 'Crooked, please straighten the knot ❌'." 
        },
        nameBadgeStatus: { 
          type: Type.STRING, 
          description: "Status and detail of the name badge. E.g. 'Visible and level ✅' or 'No badge visible. Please attach badge near left shoulder ❌'." 
        },
        hairStatus: { 
          type: Type.STRING, 
          description: "Status and detail of agent hair. E.g. 'Hair complies with aviation grooming standards ✅' or 'Stray hairs visible, please tie back or smoothen ❌'." 
        },
        overallScore: { 
          type: Type.INTEGER, 
          description: "Grooming score from 0 to 100 based on standard aviation strict checks." 
        },
        suggestions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "A short list of 1-3 useful, brief action items to correct errors. Leave empty if 100% perfect."
        }
      },
      required: ["scarfTieStatus", "nameBadgeStatus", "hairStatus", "overallScore", "suggestions"]
    };

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          { text: prompt }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.2
        }
      });

      const textOutput = response.text;
      if (!textOutput) {
        throw new Error("No response content from Gemini model.");
      }

      const result = JSON.parse(textOutput.trim());
      res.json(result);
    } catch (genAiError: any) {
      console.warn("Gemini API call failed, activating graceful simulator fallback mode:", genAiError.message);
      
      const randomScore = 85 + Math.floor(Math.random() * 12);
      const responseFallback = {
        scarfTieStatus: "Compliant and straight ✅ [Simulation Mode]",
        nameBadgeStatus: "Visible, level, and well-aligned ✅ [Simulation Mode]",
        hairStatus: "Neatly groomed and matches aviation standards ✅ [Simulation Mode]",
        overallScore: randomScore,
        suggestions: [
          "Interactive Simulation Active: Running offline visualization since Gemini API is offline/exhausted.",
          "Keep posture aligned. Ensure your corporate name tag remains clear of any jacket collar fold."
        ],
        isFallback: true
      };
      
      res.json(responseFallback);
    }

  } catch (error: any) {
    console.error("Grooming analysis failure:", error);
    res.status(500).json({ 
      error: "Failed to evaluate grooming. Make sure your GEMINI_API_KEY is configured.",
      details: error.message 
    });
  }
});

// Configure Vite or Serve static bundle based on NODE_ENV environment
async function start() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server loaded as middleware.");
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static file builds from dist folder.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Airline Agent Presence Trainer server active on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Express boot strap crash:", err);
});
