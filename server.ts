import express from "express";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { 
  extractJobDetails, 
  analyzeLinkedInContacts, 
  generateOutreachMessage, 
  handlePersonaChat,
  parseCV
} from "./src/api/gemini.ts";
import { extractJobOfferWithCascade } from "./src/api/jobExtractor.ts";

dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ extended: true, limit: "30mb" }));

  // API routes go here FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
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
    const { action, payload } = req.body;
    console.log(`[Server] Incoming action: ${action}`);
    if (!process.env.GEMINI_API_KEY) {
      console.warn("[Server] GEMINI_API_KEY is not defined");
    }
    try {
      if (!action) return res.status(400).json({ error: "Missing action" });
      
      switch (action) {
        case "extractJobOffer":
          // Nouvelle extraction haute précision avec cascade de modèles et fallback
          return res.json(await extractJobOfferWithCascade(payload.jobDescription, payload.sourceUrl));
        case "parseCV":
          return res.json(await parseCV(payload.cvText, payload.linkedinText));
        case "extractJobDetails":
          return res.json(await extractJobDetails(payload.jobDescription));
        case "analyzeLinkedIn":
          return res.json(await analyzeLinkedInContacts(payload.rawContacts, payload.profile));
        case "outreachMessage":
          return res.json({ message: await generateOutreachMessage(
            payload.contactName, payload.contactJob, payload.contactCompany, 
            payload.connectionPoints || [], payload.profile, payload.opportunityTitle,
            payload.format
          )});
        case "chat":
          return res.json({ 
            response: await handlePersonaChat(
              payload.personaId, 
              payload.messages, 
              payload.profile, 
              payload.activeFocus, 
              payload.contextSummary
            ) 
          });
        default:
          return res.status(400).json({ error: `Unknown action: ${action}` });
      }
    } catch (error: any) {
      console.error(`Error in /api/gemini:`, error);
      return res.status(500).json({ error: error.message || "Internal server error" });
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
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NACORA Server] Running at http://localhost:${PORT}`);
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
