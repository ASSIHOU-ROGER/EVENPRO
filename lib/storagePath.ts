// Construit une clé de stockage Supabase sûre à partir d'un fichier choisi par l'utilisateur.
// Supabase Storage refuse certaines clés (espaces, caractères unicode comme "…", accents, etc.)
// avec une erreur "Invalid key" peu explicite pour l'utilisateur — on évite le problème en ne
// réutilisant jamais le nom de fichier d'origine, seulement son extension.
export function safeUploadPath(prefix: string, file: File): string {
  const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  const ext = /^[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : "jpg";
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}/${Date.now()}-${random}.${ext}`;
}
