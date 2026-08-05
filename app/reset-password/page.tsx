"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // Le lien de réinitialisation authentifie automatiquement une session "recovery".
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Nouveau mot de passe</h1>

        {!ready && !success && (
          <div className="card">
            <p className="text-sm text-slate-500">
              Ce lien n'est plus valide ou a expiré. Redemande un lien depuis la page{" "}
              <a href="/forgot-password" className="text-navy underline">mot de passe oublié</a>.
            </p>
          </div>
        )}

        {ready && !success && (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label className="label">Nouveau mot de passe</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="label">Confirmer le mot de passe</label>
              <input
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer le nouveau mot de passe"}
            </button>
          </form>
        )}

        {success && (
          <div className="card">
            <p className="text-sm text-green-700">Mot de passe mis à jour ! Redirection...</p>
          </div>
        )}
      </div>
    </main>
  );
}
