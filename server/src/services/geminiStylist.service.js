const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

function clampWords(s, maxWords) {
  if (!s) return "";
  const words = String(s).trim().split(/\s+/);
  return words.length <= maxWords ? words.join(" ") : words.slice(0, maxWords).join(" ");
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const maybe = text.slice(start, end + 1);
      return JSON.parse(maybe);
    }
    throw new Error("Gemini returned non-JSON output");
  }
}

async function getStylistAdvice(outfits, context = {}) {
  const { occasion = "casual", weather = null } = context;
  const city = weather?.city || context.city || "Unknown";
  const temp = typeof weather?.temp === "number" ? weather.temp : null;
  const conditions = weather?.description || "current conditions";

  const prompt = `
You are "Wardrobe AI" — a premium futuristic fashion stylist.
Tone: confident, crisp, modern. No disclaimers, no uncertainty.

WEATHER (MUST reference in explanation + rankings + weatherAlternative):
City: ${city}
Temperature: ${temp !== null ? `${temp}°C` : "Unknown"}
Conditions: ${conditions}

OCCASION:
${occasion}

OUTFITS (JSON array, indexes matter):
${JSON.stringify(outfits, null, 2)}

TASK:
A) Review EVERY outfit index with a short verdict + reason.
B) Pick ONE best outfit.

STRICT RULES:
- Return STRICT JSON ONLY (no markdown, no extra text).
- rankings: array length MUST equal outfits.length.
- rankings[i].index MUST equal i.
- rankings[i].verdict MUST be one of ["pass","good","best"] and ONLY ONE "best" total.
- rankings[i].reason: max 16 words. MUST include the temperature (e.g. "${temp !== null ? `${temp}°C` : "°C"}").
- explanation: max 2 sentences. MUST include temperature and conditions.
- tips: exactly 3 strings, each max 12 words, all different.
- weatherAlternative: exactly 1 sentence, max 18 words, MUST mention temperature.
- Do NOT say "insufficient" / "won't cut it" / "however". Keep it constructive.
- Do NOT say "appears/seems/looks like". No uncertainty.
- Ignore any shoe-label mismatch; style the outfit as given.

OUTPUT JSON SHAPE:
{
  "bestIndex": number,
  "rankings": [
    { "index": number, "verdict": "pass"|"good"|"best", "reason": string }
  ],
  "explanation": string,
  "tips": [string, string, string],
  "weatherAlternative": string
}
`;

  const result = await model.generateContent(prompt);
  let text = result.response.text();
  text = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const parsed = safeJsonParse(text);

  if (!Array.isArray(parsed.rankings)) {
    parsed.rankings = [];
  }

  while (parsed.rankings.length < outfits.length) {
    parsed.rankings.push({
      index: parsed.rankings.length,
      verdict: "pass",
      reason: `${temp !== null ? `${temp}°C` : ""} tuned for ${occasion}.`
    });
  }

  parsed.rankings = parsed.rankings.slice(0, outfits.length);

  for (let i = 0; i < parsed.rankings.length; i++) {
    if (!parsed.rankings[i]) {
      parsed.rankings[i] = {
        index: i,
        verdict: "pass",
        reason: `${temp !== null ? `${temp}°C` : ""} tuned for ${occasion}.`
      };
    }
    parsed.rankings[i].index = i;
    const v = parsed.rankings[i].verdict;
    if (!["pass", "good", "best"].includes(v)) {
      parsed.rankings[i].verdict = "pass";
    }
    parsed.rankings[i].reason = clampWords(
      parsed.rankings[i].reason || `${temp !== null ? `${temp}°C` : ""} tuned for ${occasion}.`,
      16
    );
  }

  const bestCount = parsed.rankings.filter((r) => r?.verdict === "best").length;
  if (bestCount !== 1) {
    parsed.rankings.forEach((r) => {
      if (r) r.verdict = r.verdict === "best" ? "good" : "pass";
    });
    const bi = Number.isFinite(parsed.bestIndex) ? parsed.bestIndex : 0;
    const safeBest = bi >= 0 && bi < outfits.length ? bi : 0;
    parsed.bestIndex = safeBest;
    if (parsed.rankings[safeBest]) {
      parsed.rankings[safeBest].verdict = "best";
    }
  }

  parsed.bestIndex = Number.isFinite(parsed.bestIndex) ? parsed.bestIndex : 0;
  parsed.explanation = clampWords(parsed.explanation, 28);
  if (!Array.isArray(parsed.tips)) parsed.tips = [];
  parsed.tips = parsed.tips.slice(0, 3).map((t) => clampWords(t, 12));
  while (parsed.tips.length < 3) {
    parsed.tips.push("Add one clean layer to sharpen the silhouette.");
  }
  parsed.weatherAlternative = clampWords(parsed.weatherAlternative, 18);

  return parsed;
}

module.exports = { getStylistAdvice };
