"use client";
import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Mot de passe oublié</h1>
        {sent ? (
          <div className="card">
            <p className="text-sm text-slate-700">
              Si un compte existe avec l'adresse <strong>{email}</strong>, un email contenant un lien de
              réinitialisation vient de t'être envoyé. Pense à vérifier tes spams.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <p className="text-sm text-slate-500">
              Indique ton adresse email, on t'envoie un lien pour choisir un nouveau mot de passe.
            </p>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Envoi..." : "Envoyer le lien de réinitialisation"}
            </button>
          </form>
        )}
        <p className="mt-4 text-sm text-gray-500">
          <Link href="/login" className="text-navy underline">Retour à la connexion</Link>
        </p>
      </div>
    </main>
  );
}
