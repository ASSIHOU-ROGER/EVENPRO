import { NextRequest, NextResponse } from "next/server";
import { generateText, GeminiNotConfiguredError } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { name, category, location, eventDate, keywords } = await req.json();

    const prompt = `Tu es un rédacteur spécialisé dans la communication événementielle en français.
Rédige une description accrocheuse et professionnelle (120 à 180 mots) pour cet événement, à publier sur sa page de billetterie.
Nom de l'événement : ${name || "non précisé"}
Catégorie : ${category || "non précisée"}
Lieu : ${location || "non précisé"}
Date : ${eventDate || "non précisée"}
Mots-clés / infos complémentaires : ${keywords || "aucun"}

Consignes : ton engageant, phrases courtes, donne envie d'acheter un billet, pas de titre ni de formules d'introduction type "Voici", réponds uniquement avec le texte de la description.`;

    const text = await generateText(prompt);
    return NextResponse.json({ description: text });
  } catch (err: any) {
    if (err instanceof GeminiNotConfiguredError) {
      return NextResponse.json({ error: "GEMINI_API_KEY non configurée dans .env.local" }, { status: 501 });
    }
    console.error("[ai/generate-description]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
