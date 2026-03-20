type MedicineInfo = {
  uses: string[];
  sideEffects: string[];
  disclaimer: string;
  source: string;
};

const DEFAULT_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 7000;

function sanitizeMedicineName(name: string) {
  return name
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 120);
}

function asStringArray(value: unknown, maxItems = 6) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.replace(/[\u0000-\u001F\u007F]/g, "").trim())
    .filter((v) => v.length > 0)
    .slice(0, maxItems);
}

function extractTextResponse(payload: unknown) {
  const candidates = (payload as { candidates?: Array<unknown> })?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";

  const first = candidates[0] as {
    content?: { parts?: Array<{ text?: string }> };
  };
  const parts = first.content?.parts;
  if (!Array.isArray(parts)) return "";

  return parts
    .map((p) => (typeof p.text === "string" ? p.text : ""))
    .join("\n")
    .trim();
}

export async function getMedicineInfoFromGemini(
  medicineName: string,
): Promise<MedicineInfo | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const safeName = sanitizeMedicineName(medicineName);
  if (!safeName) return null;

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const prompt = [
    "You are assisting medicine verification users.",
    `Medicine: ${safeName}`,
    "Return only strict JSON with this exact shape:",
    '{"uses":["..."],"sideEffects":["..."],"disclaimer":"..."}',
    "Rules:",
    "- Keep each bullet short and plain language.",
    "- Do not give diagnosis or dosage.",
    "- Include a disclaimer to consult a licensed doctor/pharmacist.",
    "- If uncertain, say uncertainty clearly.",
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 350,
        },
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) return null;

    const payload = (await res.json()) as unknown;
    const text = extractTextResponse(payload);
    if (!text) return null;

    const parsed = JSON.parse(text) as {
      uses?: unknown;
      sideEffects?: unknown;
      disclaimer?: unknown;
    };

    const uses = asStringArray(parsed.uses, 6);
    const sideEffects = asStringArray(parsed.sideEffects, 8);
    const disclaimer =
      typeof parsed.disclaimer === "string"
        ? parsed.disclaimer
            .replace(/[\u0000-\u001F\u007F]/g, "")
            .trim()
            .slice(0, 220)
        : "Educational information only. Consult a licensed doctor or pharmacist.";

    if (uses.length === 0 && sideEffects.length === 0) return null;

    return {
      uses,
      sideEffects,
      disclaimer:
        disclaimer ||
        "Educational information only. Consult a licensed doctor or pharmacist.",
      source: model,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
