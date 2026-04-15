// ============================================================
// SafeRoute AI — Express Server
// ============================================================
// Serves the static frontend and proxies Gemini API calls
// so the API key never leaves the server.
// ============================================================

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

// ── Security Headers (Helmet) ──
// CSP allows Google Maps, Fonts, and our own resources
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
          "https://*.ggpht.com",
        ],
        connectSrc: [
          "'self'",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
        ],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ── CORS — restrict to same origin ──
app.use(cors({ origin: false }));

// ── Parse JSON bodies (for POST /api/briefing) ──
app.use(express.json({ limit: "10kb" }));

// ── Rate Limiting ──
// General: 100 requests per 15 min per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  })
);

// Stricter limit for Gemini proxy: 20 requests per 15 min per IP
const geminiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI briefing rate limit exceeded. Try again in a few minutes." },
});

// ── API: Return Maps API key to client ──
// The Maps JS API key MUST be client-side (Google requires it).
// We serve it from an endpoint so it's never hardcoded in source.
app.get("/api/config", (_req, res) => {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsKey) {
    return res.status(500).json({ error: "Maps API key not configured" });
  }
  res.json({ mapsApiKey: mapsKey });
});

// ── API: Gemini Safety Briefing Proxy ──
// Client sends route context → server calls Gemini → returns text.
app.post("/api/briefing", geminiLimiter, async (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({ error: "Gemini API key not configured" });
  }

  const { prompt } = req.body;

  // Input validation
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'prompt' field" });
  }
  if (prompt.length > 3000) {
    return res.status(400).json({ error: "Prompt too long (max 3000 chars)" });
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200,
          topP: 0.9,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      return res.status(502).json({ error: "Gemini API request failed" });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(502).json({ error: "Empty response from Gemini" });
    }

    res.json({ briefing: text.trim() });
  } catch (err) {
    console.error("Gemini proxy error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Serve Static Files ──
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: "1h",
  etag: true,
}));

// ── SPA Fallback ──
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Start Server ──
app.listen(PORT, () => {
  console.log(`SafeRoute AI server running on port ${PORT}`);
  console.log(`Maps API key: ${process.env.GOOGLE_MAPS_API_KEY ? "✓ configured" : "✗ MISSING"}`);
  console.log(`Gemini API key: ${process.env.GEMINI_API_KEY ? "✓ configured" : "✗ MISSING"}`);
});

module.exports = app;
