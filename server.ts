import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { 
  extractJobDetails, 
  analyzeLinkedInContacts, 
  generateOutreachMessage, 
  handlePersonaChat,
  parseCV,
  generateDailyBrief,
  parseContactsFromText,
  enrichCompanyWithWebSearch,
  evaluateContactStrategicInterests,
  parseProspectingQuery,
  generateConversationReply
} from "./src/api/gemini.ts";
import { executeWebProspectingSearch } from "./src/api/webProspectingEngine.ts";
import { 
  optimizeExperienceWithFramework, 
  auditProfileAgainstFramework, 
  computeOpportunityMatch 
} from "./src/api/cvFramework.ts";
import { 
  recommendNetworkingStrategy, 
  generateOutreachMessageWithFramework, 
  generateFollowUpMessageWithFramework 
} from "./src/api/networkingFramework.ts";
import { extractJobOfferWithCascade } from "./src/api/jobExtractor.ts";
import { adminRouter } from "./src/server/adminRoutes.ts";
import { checkCredits, consumeCredits } from "./src/server/creditsEngine.ts";
import { recordUserSession } from "./src/server/sessionEngine.ts";

dotenv.config();

async function startServer() {
  const app = express();

  // Force HTTPS redirect in production if behind HTTP proxy
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === "production" && req.headers["x-forwarded-proto"] === "http") {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });

  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ extended: true, limit: "30mb" }));

  // API routes go here FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Dedicated Administrative API (Guarded by requireAdmin token verification)
  app.use("/api/admin", adminRouter);

  // User session activity tracking endpoint
  app.post("/api/sessions/record", async (req, res) => {
    const { userId, userEmail, userName, sessionId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId requis" });
    const userAgent = (req.headers["user-agent"] as string) || "";
    const rawIp = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "").split(",")[0].trim();
    const session = await recordUserSession({ userId, userEmail, userName, userAgent, ip: rawIp, sessionId });
    return res.json({ success: true, session });
  });

  // Autonomous NACORA B2B Web Prospecting Engine (Search real public web and enterprise registries)
  app.post("/api/prospecting/search-web", async (req, res) => {
    const { query, target, filters } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Requête de recherche requise" });
    }

    try {
      console.log(`[NACORA Web Prospecting] Searching for: "${query}" (target: ${target || 'auto'})`);
      const results = await executeWebProspectingSearch({ query, target, filters });
      return res.json({
        success: true,
        ...results
      });
    } catch (err: any) {
      console.error("[NACORA Web Prospecting Error]", err);
      return res.status(500).json({
        success: false,
        error: "Recherche indisponible : " + (err.message || "Erreur de communication avec le moteur de prospection Web")
      });
    }
  });

  // URL Scraping route with bot-detection handling
  app.post("/api/scrape-url", async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL requise" });
    }

    try {
      console.log(`[Server] Scraping URL: ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
        }
      });
      clearTimeout(timeoutId);

      if (response.status === 403 || response.status === 401 || response.status === 429) {
        return res.status(403).json({
          error: "Le site bloque le scraping automatique (protection anti-bot Cloudflare/WAF). Veuillez utiliser le copier-coller direct du texte de l'offre pour une analyse instantanée."
        });
      }

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Impossible de charger la page (code ${response.status}). Veuillez utiliser le copier-coller du texte.`
        });
      }

      const html = await response.text();

      // Check if Cloudflare or captcha challenge returned 200
      if (html.includes("cf-browser-verification") || html.includes("challenge-running") || html.includes("Cloudflare")) {
        return res.status(403).json({
          error: "Le site nécessite une vérification humaine (Cloudflare). Veuillez copier et coller directement le texte de l'offre."
        });
      }

      // Extract main text by removing scripts, styles and HTML tags
      let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
      clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
      clean = clean.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "");
      clean = clean.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "");
      clean = clean.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "");
      clean = clean.replace(/<[^>]+>/g, "\n");
      clean = clean.replace(/&nbsp;/g, " ")
                   .replace(/&amp;/g, "&")
                   .replace(/&lt;/g, "<")
                   .replace(/&gt;/g, ">");
      
      const lines = clean.split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0);

      const resultText = lines.join("\n");

      if (resultText.length < 50) {
        return res.status(400).json({
          error: "Contenu textuel trop court extrait de l'URL. Le site utilise probablement un rendu dynamique (SPA). Veuillez copier-coller le texte directement."
        });
      }

      return res.json({
        success: true,
        text: resultText,
        url: url
      });
    } catch (err: any) {
      console.error("[Server] Erreur scraping URL:", err);
      const isTimeout = err.name === "AbortError";
      return res.status(500).json({
        error: isTimeout 
          ? "Le serveur distant a mis trop de temps à répondre. Utilisez le copier-coller direct."
          : "Erreur lors de la récupération de la page. Utilisez le copier-coller direct."
      });
    }
  });

  // Document parsing (PDF & Word DOCX)
  app.post("/api/parse-document", async (req, res) => {
    const { base64Data, fileName, fileType } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: "Données de fichier manquantes" });
    }

    try {
      const buffer = Buffer.from(base64Data, "base64");
      const ext = (fileName || "").split(".").pop()?.toLowerCase() || "";

      if (ext === "docx" || fileType?.includes("wordprocessingml")) {
        const mammoth = await import("mammoth");
        const docResult = await mammoth.extractRawText({ buffer });
        return res.json({
          success: true,
          text: docResult.value,
          fileName
        });
      } else if (ext === "pdf" || fileType === "application/pdf") {
        try {
          // Utilisation de pdfjs-dist pour extraire le texte
          const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
          const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
          const doc = await loadingTask.promise;
          let fullText = "";

          for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(" ");
            fullText += pageText + "\n\n";
          }

          return res.json({
            success: true,
            text: fullText.trim(),
            fileName
          });
        } catch (pdfErr: any) {
          console.error("PDF parsing error:", pdfErr);
          return res.status(500).json({
            error: "Impossible d'extraire le texte de ce PDF. Vous pouvez copier-coller directement le texte de l'offre."
          });
        }
      } else if (ext === "txt") {
        return res.json({
          success: true,
          text: buffer.toString("utf-8"),
          fileName
        });
      } else {
        return res.status(400).json({
          error: "Format de fichier non supporté. Veuillez importer un fichier PDF (.pdf), Word (.docx) ou texte (.txt)."
        });
      }
    } catch (error: any) {
      console.error("Document parsing error:", error);
      return res.status(500).json({
        error: "Erreur de traitement du document. Utilisez le copier-coller direct."
      });
    }
  });

  app.post("/api/gemini", async (req, res) => {
    const { action, payload, userId, idempotencyKey } = req.body;
    console.log(`[Server] Incoming action: ${action}`);
    if (!process.env.GEMINI_API_KEY) {
      console.warn("[Server] GEMINI_API_KEY is not defined");
    }

    // 1. Centralized credit check before calling Gemini AI
    if (userId) {
      const creditCheck = await checkCredits(userId, 1);
      if (!creditCheck.allowed) {
        return res.status(402).json({
          success: false,
          error: creditCheck.reason || "Crédits insuffisants pour effectuer cette opération IA.",
          code: "CREDITS_INSUFFICIENT",
          balanceRemaining: creditCheck.currentBalance
        });
      }
    }

    try {
      if (!action) return res.status(400).json({ error: "Missing action" });
      
      let resultData: any;
      switch (action) {
        case "extractJobOffer":
          resultData = await extractJobOfferWithCascade(payload.jobDescription, payload.sourceUrl);
          break;
        case "parseCV":
          resultData = await parseCV(payload.cvText, payload.linkedinText);
          break;
        case "generateDailyBrief":
          resultData = await generateDailyBrief(payload);
          break;
        case "extractJobDetails":
          resultData = await extractJobDetails(payload.jobDescription);
          break;
        case "analyzeLinkedIn":
          resultData = await analyzeLinkedInContacts(payload.rawContacts, payload.profile);
          break;
        case "parseContactsFromText":
          resultData = await parseContactsFromText(payload.text, payload.profile);
          break;
        case "outreachMessage":
          resultData = { message: await generateOutreachMessage(
            payload.contactName, payload.contactJob, payload.contactCompany, 
            payload.connectionPoints || [], payload.profile, payload.opportunityTitle,
            payload.format
          )};
          break;
        case "enrichCompany":
          resultData = await enrichCompanyWithWebSearch(payload.companyName);
          break;
        case "evaluateContactStrategicInterests":
          resultData = await evaluateContactStrategicInterests(payload.contact, payload.profile);
          break;
        case "optimizeCVExperience":
          resultData = await optimizeExperienceWithFramework(payload.experience, payload.profile, payload.targetOfferTitle);
          break;
        case "auditCV":
          resultData = await auditProfileAgainstFramework(payload.profile);
          break;
        case "matchOpportunity":
          resultData = computeOpportunityMatch(payload.profile, payload.opportunity, payload.documents || []);
          break;
        case "recommendNetworkingStrategy":
          resultData = recommendNetworkingStrategy(payload.contact, payload.profile, payload.goal, payload.preferredChannel);
          break;
        case "generateNetworkingOutreach":
          resultData = await generateOutreachMessageWithFramework(payload.contact, payload.profile, payload.options);
          break;
        case "generateNetworkingFollowUp":
          resultData = generateFollowUpMessageWithFramework(payload.contact, payload.profile, payload.followUpNumber, payload.options);
          break;
        case "generateConversationReply":
          resultData = await generateConversationReply(payload);
          break;
        case "parseProspectingQuery": {
          const parsed = await parseProspectingQuery(payload.query);
          console.log(`[Prospecting] Query parsed: "${payload.query}"`);
          resultData = { response: parsed, ...parsed };
          break;
        }
        case "chat":
          resultData = { 
            response: await handlePersonaChat(
              payload.personaId,
              payload.messages,
              payload.profile,
              payload.activeFocus,
              payload.contextSummary,
              payload.intent
            ) 
          };
          break;
        default:
          return res.status(400).json({ error: `Unknown action: ${action}` });
      }

      // 2. Consume credits upon successful completion with idempotency key
      if (userId) {
        await consumeCredits({
          userId,
          creditsToDeduct: 1,
          feature: action,
          model: "gemini-2.5-flash",
          tokens: { input: 350, output: 250, total: 600 },
          costEuro: 0.0003,
          idempotencyKey
        }).catch(err => console.warn("[Server] Credit consume error:", err));
      }

      return res.json(resultData);
    } catch (error: any) {
      console.error(`Error in /api/gemini:`, error);
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Explicit API 404 handler: guarantees /api/* requests ALWAYS return application/json and NEVER index.html
  app.all("/api/*", (req, res) => {
    return res.status(404).json({
      success: false,
      error: `Route API introuvable : ${req.method} ${req.path}`,
      code: "API_ROUTE_NOT_FOUND"
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    console.log(`[NACORA Server] Serving production static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NACORA Server] Listening on 0.0.0.0:${PORT}`);
    console.log(`[NACORA Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      const isAIza = key.startsWith("AIza");
      console.log(`[NACORA Server] Gemini Key configured (length: ${key.length}, prefix: ${key.substring(0, 4)}..., starts with AIza: ${isAIza})`);
      if (!isAIza) {
        console.warn("[NACORA Server] NOTE: Gemini API Key does not start with standard 'AIza' prefix. Automatic cascading & deterministic fallbacks are enabled for all AI endpoints.");
      }
    } else {
      console.warn("[NACORA Server] Gemini Key is not set. Deterministic local heuristics and mock generators will handle all requests.");
    }
  });
}

startServer();
