import { NextRequest, NextResponse } from "next/server";
import { generateText, GeminiNotConfiguredError } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { name, category, location, eventDate, description, platform } = await req.json();
    const platformLabel = platform === "instagram" ? "Instagram" : "Facebook";

    const prompt = `Tu es community manager. Rédige une publication ${platformLabel} en français pour promouvoir cet événement et vendre des billets.
Nom : ${name || "non précisé"}
Catégorie : ${category || "non précisée"}
Lieu : ${location || "non précisé"}
Date : ${eventDate || "non précisée"}
Description : ${description || "non précisée"}

Consignes : ton dynamique adapté à ${platformLabel}, emojis pertinents mais pas excessifs, se termine par 5 à 8 hashtags pertinents en français, longueur adaptée à la plateforme, réponds uniquement avec le texte du post (pas de titre, pas d'explication).`;

    const text = await generateText(prompt);
    return NextResponse.json({ post: text });
  } catch (err: any) {
    if (err instanceof GeminiNotConfiguredError) {
      return NextResponse.json({ error: "GEMINI_API_KEY non configurée dans .env.local" }, { status: 501 });
    }
    console.error("[ai/generate-social-post]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
