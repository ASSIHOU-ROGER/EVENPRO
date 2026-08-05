import { NextRequest, NextResponse } from "next/server";
import { generateImage, GeminiNotConfiguredError } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { name, category, location, eventDate, style } = await req.json();

    const prompt = `Crée une affiche promotionnelle professionnelle et visuellement percutante pour un événement, au format portrait.
Nom de l'événement (à intégrer lisiblement dans le design) : ${name || "Événement"}
Catégorie : ${category || "non précisée"}
Lieu : ${location || ""}
Date : ${eventDate || ""}
Style souhaité : ${style || "moderne, coloré, professionnel"}
L'affiche doit donner envie d'assister à l'événement, avec une composition équilibrée et un bon contraste pour le texte.`;

    const imageDataUrl = await generateImage(prompt);
    return NextResponse.json({ image: imageDataUrl });
  } catch (err: any) {
    if (err instanceof GeminiNotConfiguredError) {
      return NextResponse.json({ error: "GEMINI_API_KEY non configurée dans .env.local" }, { status: 501 });
    }
    console.error("[ai/generate-poster]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
