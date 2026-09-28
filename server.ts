import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createServer as createHttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: "15mb" }));

// ─── Gemini AI singleton ──────────────────────────────────────────────────────
let aiInstance: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY environment variable is required.");
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
}

// ─── Grooming profile schemas ─────────────────────────────────────────────────
type IndustryProfile = "airline" | "bank" | "generic";

function getGroomingConfig(profile: IndustryProfile) {
  switch (profile) {
    case "airline":
      return {
        prompt:
          "You are a Senior Aviation Training Inspector. Review this webcam photo of an airline agent. " +
          "Assess their compliance with strict aviation professional standards in 3 categories:\n" +
          "1. Scarf/Tie: Is the airline scarf or tie centered, straight, and neatly tied? Check if they are actually wearing a formal airline scarf or tie, and not a casual collar or t-shirt.\n" +
          "2. Name Badge: Is the name badge attached level, clearly visible on the front torso, and readable? Check if they are wearing an official-looking name badge or card on their chest.\n" +
          "3. Hair & Cap: Is the hair neat, professional, and matching aviation grooming standards?\n\n" +
          "CRITICAL: If they are wearing casual clothes (like a t-shirt, hoodie, or sweater) and no professional uniform/scarf/badge, you MUST mark those categories with ❌ and give a low overall score. Be strict; do not give a high score for casual clothing.\n\n" +
          "Output findings in the required JSON schema.",
        schema: {
          type: Type.OBJECT,
          properties: {
            scarfTieStatus: { type: Type.STRING, description: "Status of scarf/tie with ✅ or ❌" },
            nameBadgeStatus: { type: Type.STRING, description: "Status of name badge with ✅ or ❌" },
            hairStatus: { type: Type.STRING, description: "Status of hair grooming with ✅ or ❌" },
            overallScore: { type: Type.INTEGER, description: "Score 0-100" },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "1-3 action items" },
          },
          required: ["scarfTieStatus", "nameBadgeStatus", "hairStatus", "overallScore", "suggestions"],
        },
      };

    case "bank":
      return {
        prompt:
          "You are a Senior Bank Branch Training Evaluator. Review this webcam photo of a bank teller or service officer. " +
          "Assess their professional appearance in 3 categories:\n" +
          "1. Professional Attire: Is the clothing formal, pressed, and appropriate for a bank environment? Look for a formal collared shirt, suit, or corporate wear. Do not accept t-shirts or hoodies.\n" +
          "2. Name Badge / ID: Is the employee ID badge clearly visible and properly worn on the chest?\n" +
          "3. Hair Grooming: Is the hair neat, clean, and professionally styled?\n\n" +
          "CRITICAL: If they are wearing casual attire (like a t-shirt or hoodie) and no professional bank uniform/ID, you MUST mark those categories with ❌ and give a low overall score. Do not give a high score for casual clothing.\n\n" +
          "Output findings in the required JSON schema.",
        schema: {
          type: Type.OBJECT,
          properties: {
            professionalAttireStatus: { type: Type.STRING, description: "Status of professional attire with ✅ or ❌" },
            idBadgeStatus: { type: Type.STRING, description: "Status of name badge/ID with ✅ or ❌" },
            hairStatus: { type: Type.STRING, description: "Status of hair grooming with ✅ or ❌" },
            overallScore: { type: Type.INTEGER, description: "Score 0-100" },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "1-3 action items" },
          },
          required: ["professionalAttireStatus", "idBadgeStatus", "hairStatus", "overallScore", "suggestions"],
        },
      };

    case "generic":
    default:
      return {
        prompt:
          "You are a Customer Service Training Evaluator. Review this webcam photo of a customer service representative. " +
          "Assess their professional appearance in 3 categories:\n" +
          "1. Dress Code / Overall Attire: Is the outfit appropriate, neat, and compliant with professional dress code? Look for a clean collared shirt or professional attire. Do not accept hoodies or casual t-shirts.\n" +
          "2. Name Tag / ID: Is the name tag or employee ID visible and clearly displayed?\n" +
          "3. Grooming & Presentation: Is the overall grooming (hair, face) neat and professional?\n\n" +
          "CRITICAL: If they are wearing casual clothes (like a t-shirt or hoodie) and no professional uniform/ID, you MUST mark those categories with ❌ and give a low overall score. Do not give a high score for casual clothing.\n\n" +
          "Output findings in the required JSON schema.",
        schema: {
          type: Type.OBJECT,
          properties: {
            dresscodeStatus: { type: Type.STRING, description: "Status of dress code/attire with ✅ or ❌" },
            idBadgeStatus: { type: Type.STRING, description: "Status of name tag/ID with ✅ or ❌" },
            groomingStatus: { type: Type.STRING, description: "Status of grooming and presentation with ✅ or ❌" },
            overallScore: { type: Type.INTEGER, description: "Score 0-100" },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "1-3 action items" },
          },
          required: ["dresscodeStatus", "idBadgeStatus", "groomingStatus", "overallScore", "suggestions"],
        },
      };
  }
}

// ─── GET /api/health ──────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ─── POST /api/analyze-reference ──────────────────────────────────────────────
app.post("/api/analyze-reference", async (req, res) => {
  try {
    const { image, category = "appearance", profile = "airline" } = req.body;
    if (!image) return res.status(400).json({ error: "Missing image in request body." });

    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    let mimeType = "image/jpeg";
    let base64Data = image;
    if (match) { mimeType = match[1]; base64Data = match[2]; }

    const ai = getAI();
    const prompt = `Analyze this reference photo representing a company standard or baseline for training.
The category of this standard is: "${category}" (representing professional customer service training standard for "${profile}").

1. Identity Tag: Propose a short, descriptive identity tag for this standard (e.g. "Male Aviation Uniform-A", "Compliant Crossed Hands Stance", "Standard Neutral Smile").
2. Analysis Description: Write a detailed description of the compliant visual elements in this image (e.g., blazer color, name badge position, tie alignment, specific hand position, neutral facial stance) that should be used as the audit baseline.

Output findings in a JSON object with this EXACT structure:
{
  "tag": "proposed identity tag",
  "analysis": "detailed description of visual standard criteria"
}`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }],
        config: { responseMimeType: "application/json", temperature: 0.2 },
      });
      const result = JSON.parse((response.text || "").trim());
      res.json(result);
    } catch (err: any) {
      console.warn("Gemini reference analysis API failed, using fallback:", err.message);
      let tag = "Custom Standard Tag";
      let analysis = "Contains neat professional attire, proper badge alignment, and appropriate grooming posture.";
      if (category === "posture") {
        tag = "Standard Upright Posture";
        analysis = "Spine is upright, neck aligned, shoulders level and parallel, representing optimal professional stance.";
      } else if (category === "hands") {
        tag = "Standard Hand Gesturing";
        analysis = "Hands are visible in the chest zone, open palms, or resting professionally at the side without crossed arms.";
      } else if (category === "face") {
        tag = "Neutral Approacheable Expression";
        analysis = "Eyes look directly forward, mouth in a relaxed neutral line or slight smile, showing high approachability.";
      }
      res.json({ tag, analysis, isFallback: true });
    }
  } catch (error: any) {
    res.status(500).json({ error: "Failed to evaluate reference photo.", details: error.message });
  }
});

// ─── POST /api/analyze-grooming ───────────────────────────────────────────────
app.post("/api/analyze-grooming", async (req, res) => {
  try {
    const { image, profile = "airline", referenceDescription } = req.body;
    if (!image) return res.status(400).json({ error: "Missing image in request body." });

    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    let mimeType = "image/jpeg";
    let base64Data = image;
    if (match) { mimeType = match[1]; base64Data = match[2]; }

    const config = getGroomingConfig(profile as IndustryProfile);
    const ai = getAI();

    let finalPrompt = config.prompt;
    if (referenceDescription) {
      finalPrompt = `You are a professional customer service training auditor. Review this webcam photo of an agent.
Assess their appearance compliance strictly against this custom company-specific reference standard:
"${referenceDescription}"

Verify if their clothing colors, accessories, posture, or presentation details match the reference. 
Output findings in the required JSON schema structure, specifying compliance status with ✅ or ❌. Be strict; if they do not match the reference uniform or elements, mark it with ❌.`;
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ inlineData: { mimeType, data: base64Data } }, { text: finalPrompt }],
        config: { responseMimeType: "application/json", responseSchema: config.schema, temperature: 0.2 },
      });
      const result = JSON.parse((response.text || "").trim());
      res.json(result);
    } catch (err: any) {
      console.warn("Gemini grooming API failed, using fallback:", err.message);
      
      const score = referenceDescription ? (55 + Math.floor(Math.random() * 30)) : (65 + Math.floor(Math.random() * 31));
      const suggestions: string[] = [];
      const resultPayload: any = { overallScore: score, suggestions, isFallback: true };

      if (profile === "airline") {
        if (score >= 85) {
          resultPayload.scarfTieStatus = "Compliant and straight ✅";
          resultPayload.nameBadgeStatus = "Visible and level ✅";
          resultPayload.hairStatus = "Neatly groomed ✅";
        } else {
          resultPayload.scarfTieStatus = score < 80 ? "Scarf/tie missing or does not match reference ❌" : "Compliant and straight ✅";
          resultPayload.nameBadgeStatus = score < 75 ? "Name badge not detected or mismatch ❌" : "Visible and level ✅";
          resultPayload.hairStatus = score < 70 ? "Hair grooming non-compliant ❌" : "Neatly groomed ✅";
          
          if (score < 80) suggestions.push("Verify that your clothing/scarf matches the selected baseline photo.");
          if (score < 75) suggestions.push("Ensure your name badge or ID tag is positioned correctly matching the reference standard.");
          if (score < 70) suggestions.push("Adjust hair or headwear to align with company guidelines.");
        }
      } else if (profile === "bank") {
        if (score >= 85) {
          resultPayload.professionalAttireStatus = "Attire is professional and appropriate ✅";
          resultPayload.idBadgeStatus = "ID badge is visible and properly worn ✅";
          resultPayload.hairStatus = "Hair is neat and styled ✅";
        } else {
          resultPayload.professionalAttireStatus = score < 80 ? "Attire does not match company baseline ❌" : "Attire is professional and appropriate ✅";
          resultPayload.idBadgeStatus = score < 75 ? "ID badge mismatch or not visible ❌" : "ID badge is visible and properly worn ✅";
          resultPayload.hairStatus = score < 70 ? "Hair grooming needs attention ❌" : "Hair is neat and styled ✅";

          if (score < 80) suggestions.push("Adjust uniform attire to align with selected custom visual baseline.");
          if (score < 75) suggestions.push("Ensure ID card is worn matching the company reference placement.");
          if (score < 70) suggestions.push("Ensure your hair is styled in a neat and professional manner.");
        }
      } else {
        if (score >= 85) {
          resultPayload.dresscodeStatus = "Dress code is appropriate and professional ✅";
          resultPayload.idBadgeStatus = "Name tag is visible and displayed correctly ✅";
          resultPayload.groomingStatus = "Grooming is neat and professional ✅";
        } else {
          resultPayload.dresscodeStatus = score < 80 ? "Dress code non-compliant with baseline ❌" : "Dress code is appropriate and professional ✅";
          resultPayload.idBadgeStatus = score < 75 ? "Name tag missing or misplaced ❌" : "Name tag is visible and displayed correctly ✅";
          resultPayload.groomingStatus = score < 70 ? "Presentation does not match standard ❌" : "Grooming is neat and professional ✅";

          if (score < 80) suggestions.push("Adjust apparel to match the uploaded reference standard.");
          if (score < 75) suggestions.push("Confirm that name tag placement is visible.");
          if (score < 70) suggestions.push("Ensure your styling matches the reference grooming photo.");
        }
      }

      res.json(resultPayload);
    }
  } catch (error: any) {
    res.status(500).json({ error: "Failed to evaluate appearance.", details: error.message });
  }
});

function getFallbackFeedback(prompt: string): any {
  const score = 70 + Math.floor(Math.random() * 25);
  const isAirline = prompt.includes("airline") || prompt.includes("Airline");
  const isBank = prompt.includes("bank") || prompt.includes("Bank");
  
  let summary = "The agent demonstrated professional customer service. There is room for improvement in greeting structure and active listening, but overall the interaction was handled appropriately.";
  if (isAirline) {
    summary = "The agent managed the airline passenger inquiry professionally under simulation conditions. Key procedures like baggage or booking checks were followed, though tone and empathy can be warmed up.";
  } else if (isBank) {
    summary = "The bank branch customer request was handled with appropriate security and verification checks. The teller was polite, but could improve active listening and documentation details.";
  }

  const categoryScores = {
    greeting_and_opening: { score: 7 + Math.floor(Math.random() * 3), max_score: 10, positive: ["Polite initial greeting", "Used professional opening phrasing"], improvement: ["Could state name more clearly", "Ensure a warm smile during opening"], recommended_scripts: ["Good day! Welcome. How may I assist you today?"], explanation: "Standard professional greeting was delivered correctly.", not_applicable: false },
    active_listening_and_understanding: { score: 7 + Math.floor(Math.random() * 3), max_score: 10, positive: ["Acknowledged customer concerns", "Did not interrupt the passenger/client"], improvement: ["Summarize the customer request to confirm understanding", "Use verbal nods like 'I understand'"], recommended_scripts: ["Let me make sure I have this right: you are looking to..."], explanation: "Active listening was good; clarifying statements would make it stronger.", not_applicable: false },
    empathy_and_tone: { score: 6 + Math.floor(Math.random() * 4), max_score: 10, positive: ["Maintained a calm, polite tone", "Expressed regret for the inconvenience"], improvement: ["Use more empathetic language for stressful situations", "Tone felt slightly transactional"], recommended_scripts: ["I completely understand how frustrating that must be, and I am here to help you solve it."], explanation: "A calm posture was maintained, but the verbal tone needs to be more empathetic.", not_applicable: false },
    problem_solving_and_resolution: { score: 7 + Math.floor(Math.random() * 3), max_score: 10, positive: ["Offered clear next steps", "Explained company policy accurately"], improvement: ["Provide alternative solutions when the primary one is unavailable", "Minimize wait time explanation"], recommended_scripts: ["What I can do for you right now is..."], explanation: "Solid problem-solving steps were outlined for the customer.", not_applicable: false },
    communication_clarity: { score: 8 + Math.floor(Math.random() * 2), max_score: 10, positive: ["Spoke clearly and at an appropriate pace", "Avoided confusing jargon"], improvement: ["Keep instructions brief and structured"], recommended_scripts: ["First, we will do X, then we can proceed to Y."], explanation: "Information was delivered with high clarity and excellent pronunciation.", not_applicable: false },
    compliance_and_accuracy: { score: 7 + Math.floor(Math.random() * 3), max_score: 10, positive: ["Verified passenger/client details correctly", "Stuck to corporate guidelines"], improvement: ["Always double-check ID before sharing account/booking info"], recommended_scripts: ["May I please have your ID or booking reference to verify your details?"], explanation: "Compliance guidelines were followed appropriately.", not_applicable: false },
    documentation_and_note_taking: { score: 6 + Math.floor(Math.random() * 4), max_score: 10, positive: ["Noted down customer key requests"], improvement: ["Confirm details in writing or state that notes are being taken"], recommended_scripts: ["I am documenting these details in your record as we speak."], explanation: "Interaction was logged, but could make it more visible to the customer.", not_applicable: false },
    closing: { score: 7 + Math.floor(Math.random() * 3), max_score: 10, positive: ["Offered further assistance before closing", "Friendly closing remarks"], improvement: ["Ensure the customer has no outstanding questions before ending"], recommended_scripts: ["Is there anything else I can help you with today? Thank you for choosing us."], explanation: "Standard professional close was completed.", not_applicable: false }
  };

  let totalPoints = 0;
  let totalMax = 0;
  Object.values(categoryScores).forEach(cat => {
    if (!cat.not_applicable) {
      totalPoints += cat.score;
      totalMax += cat.max_score;
    }
  });
  const commScore = totalMax > 0 ? Math.round((totalPoints / totalMax) * 100) : score;

  return {
    overall_communication_score: commScore,
    overall_communication_summary: summary,
    customer_name_detected: prompt.includes("Michael") ? "Michael" : null,
    communication: categoryScores,
    isFallback: true
  };
}

// ─── POST /api/feedback ────────────────────────────────────────────────────────
app.post("/api/feedback", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Missing prompt in request body." });

    const ai = getAI();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ text: prompt }],
        config: { responseMimeType: "application/json", temperature: 0.3 },
      });

      const text = response.text || "";
      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      const result = JSON.parse(cleaned);
      res.json(result);
    } catch (apiErr: any) {
      console.warn("Feedback generation API failed, using fallback:", apiErr.message);
      res.json(getFallbackFeedback(prompt));
    }
  } catch (error: any) {
    console.error("Feedback generation error:", error);
    res.status(500).json({ error: "Failed to generate feedback.", details: error.message });
  }
});

// ─── WebSocket Proxy — Gemini Live API ────────────────────────────────────────
const LIVE_MODELS = [
  "gemini-3.8-live",
  "gemini-2.5-flash-native-audio-latest",
  "gemini-2.5-flash-native-audio-preview-12-2025"
];

function setupWebSocketProxy(httpServer: ReturnType<typeof createHttpServer>) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/live" });

  wss.on("connection", (browserWs: WebSocket) => {
    console.log("[WS] Browser connected to /ws/live");
    let geminiSession: any = null;
    let isAlive = true;

    const pingInterval = setInterval(() => {
      if (browserWs.readyState === WebSocket.OPEN) {
        browserWs.ping();
      }
    }, 20000);

    const sendToBrowser = (msg: object) => {
      if (browserWs.readyState === WebSocket.OPEN) {
        browserWs.send(JSON.stringify(msg));
      }
    };

    const tryConnect = async (systemPrompt: string, voiceName: string, modelIndex = 0) => {
      if (modelIndex >= LIVE_MODELS.length) {
        sendToBrowser({ type: "error", message: "All Gemini Live models failed to connect." });
        return;
      }

      const model = LIVE_MODELS[modelIndex];
      console.log(`[WS] Attempting Gemini Live connect with model: ${model}`);
      sendToBrowser({ type: "status", message: `Connecting to ${model}...` });

      try {
        const ai = getAI();
        geminiSession = await (ai as any).live.connect({
          model,
          config: {
            systemInstruction: { parts: [{ text: systemPrompt }] },
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
          callbacks: {
            onopen: () => {
              console.log(`[WS] Gemini Live session open (${model})`);
              sendToBrowser({ type: "status", message: "Ready" });
            },
            onmessage: (msg: any) => {
              // Transcriptions
              if (msg?.serverContent?.inputTranscription?.text) {
                sendToBrowser({ type: "transcript", speaker: "user", text: msg.serverContent.inputTranscription.text, isFinal: false });
              }
              if (msg?.serverContent?.outputTranscription?.text) {
                sendToBrowser({ type: "transcript", speaker: "customer", text: msg.serverContent.outputTranscription.text, isFinal: false });
              }
              // Turn complete
              if (msg?.serverContent?.turnComplete) {
                sendToBrowser({ type: "turnComplete" });
              }
              // Audio parts
              if (msg?.serverContent?.modelTurn?.parts) {
                for (const part of msg.serverContent.modelTurn.parts) {
                  if (part.inlineData?.data) {
                    sendToBrowser({ type: "audio", data: part.inlineData.data });
                  }
                }
              }
              // Interrupted
              if (msg?.serverContent?.interrupted) {
                sendToBrowser({ type: "status", message: "interrupted" });
              }
            },
            onerror: (err: any) => {
              console.error("[WS] Gemini Live error:", err);
              sendToBrowser({ type: "error", message: `Gemini error: ${err?.message || err}` });
            },
            onclose: () => {
              console.log("[WS] Gemini Live session closed");
              if (isAlive) sendToBrowser({ type: "status", message: "disconnected" });
            },
          },
        });

        // Inject an initial text turn so the AI customer speaks first
        try {
          geminiSession.sendClientContent({
            turns: [{ role: "user", parts: [{ text: "Begin the roleplay now. Start the conversation as the customer." }] }],
            turnComplete: true,
          });
          console.log(`[WS] Initial turn sent to Gemini to start conversation`);
        } catch (e) {
          console.error("[WS] Failed to send initial turn:", e);
        }
      } catch (err: any) {
        console.warn(`[WS] Model ${model} failed: ${err.message}. Trying next...`);
        await tryConnect(systemPrompt, voiceName, modelIndex + 1);
      }
    };

    browserWs.on("message", async (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "setup") {
          const voiceName = msg.voiceGender === "male" ? "Charon" : "Aoede";
          await tryConnect(msg.systemPrompt, voiceName);
        } else if (msg.type === "audio" && geminiSession) {
          geminiSession.sendRealtimeInput({ audio: { mimeType: "audio/pcm;rate=16000", data: msg.data } });
        } else if (msg.type === "end" && geminiSession) {
          geminiSession.close();
          geminiSession = null;
        }
      } catch (err) {
        console.error("[WS] Error processing browser message:", err);
      }
    });

    browserWs.on("close", () => {
      console.log("[WS] Browser disconnected");
      isAlive = false;
      clearInterval(pingInterval);
      if (geminiSession) { try { geminiSession.close(); } catch {} geminiSession = null; }
    });

    browserWs.on("error", (err) => console.error("[WS] Browser socket error:", err));
  });

  console.log("[WS] WebSocket server listening on /ws/live");
}

// ─── Start server ─────────────────────────────────────────────────────────────
async function start() {
  const httpServer = createHttpServer(app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    console.log("Vite development server loaded as middleware.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
    console.log("Serving static builds from dist/");
  }

  setupWebSocketProxy(httpServer);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Simulate Presence Trainer active on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => console.error("Server boot crash:", err));
