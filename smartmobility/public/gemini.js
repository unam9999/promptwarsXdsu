// ============================================================
// SafeRoute AI — Gemini API Integration
// ============================================================
// Sends route context to our server-side proxy (/api/briefing)
// which forwards to Gemini. The API key never leaves the server.
// ============================================================

const GeminiAI = (() => {

  async function generateSafetyBriefing(routeData) {
    const { origin, destination, duration, distance, safetyScore, warnings, isSafest, allRoutes } = routeData;

    // Build crime summary for prompt
    const crimeList = warnings.length > 0
      ? warnings.slice(0, 5).map(w => `- ${w.label}: "${w.description}" (${w.distanceFromRoute}m from route)`).join("\n")
      : "No significant crime incidents detected near this route.";

    // Build alternatives context
    let alternativesContext = "";
    if (allRoutes && allRoutes.length > 1) {
      alternativesContext = `\n\nRoute alternatives analyzed:\n` +
        allRoutes.map((r, i) => `  Route ${i + 1} (${r.summary}): Safety ${r.safetyScore}/100, ${r.duration}, ${r.distance}`).join("\n");
    }

    const prompt = `You are SafeRoute AI, an urban commute safety advisor for Bengaluru, India. 
Generate a concise 2-3 sentence safety briefing for the following route.

ROUTE:
- From: ${origin}
- To: ${destination}
- Duration: ${duration}
- Distance: ${distance}
- Safety Score: ${safetyScore}/100
- This is ${isSafest ? "the SAFEST route found" : "NOT the safest route available"}
${alternativesContext}

CRIME INCIDENTS NEAR THIS ROUTE:
${crimeList}

RULES:
- Be specific about which areas to watch out for
- If safety score < 50, strongly recommend the safer alternative
- If safety score > 80, be reassuring but still mention any warnings
- Mention time-of-day advice if relevant (many crimes happen at night)
- Keep it to 2-3 sentences, actionable and clear
- Do NOT use markdown formatting, just plain text`;

    try {
      // Call our server-side proxy instead of Google directly
      const response = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error("Briefing API error:", err);
        return getFallbackBriefing(safetyScore, warnings);
      }

      const data = await response.json();
      return data.briefing || getFallbackBriefing(safetyScore, warnings);
    } catch (err) {
      console.error("Briefing fetch error:", err);
      return getFallbackBriefing(safetyScore, warnings);
    }
  }

  // Fallback if Gemini fails
  function getFallbackBriefing(safetyScore, warnings) {
    if (safetyScore >= 80) {
      return `This route is relatively safe with a safety score of ${safetyScore}/100. No major incidents were detected along your path. Standard precautions recommended.`;
    }
    if (safetyScore >= 50) {
      const topWarning = warnings[0]?.label || "incidents";
      return `Moderate risk detected (${safetyScore}/100). ${topWarning} has been reported near your route. Stay alert and prefer well-lit roads, especially after dark.`;
    }
    const topWarnings = warnings.slice(0, 2).map(w => w.label).join(" and ");
    return `High risk detected (${safetyScore}/100). ${topWarnings} reported along this route. Consider using the safest alternative route or avoid traveling at night.`;
  }

  return { generateSafetyBriefing };
})();
