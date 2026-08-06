"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";

type Mode = "loading" | "invalid" | "auth" | "mismatch" | "success" | "confirm_email";

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [mode, setMode] = useState<Mode>("loading");
  const [invitedEmail, setInvitedEmail] = useState("");
  const [eventName, setEventName] = useState("");
  const [acceptedEventId, setAcceptedEventId] = useState<string | null>(null);

  const [authTab, setAuthTab] = useState<"signup" | "login">("signup");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function tryAccept() {
    if (!token) return;
    const supabase = createClient();
    const { data, error: acceptError } = await supabase.rpc("accept_staff_invite", { p_token: token });
    if (acceptError) {
      setError(acceptError.message);
      setMode("invalid");
      return;
    }
    setAcceptedEventId(data.event_id);
    setEventName(data.event_name);
    setMode("success");
  }

  useEffect(() => {
    if (!token) {
      setMode("invalid");
      return;
    }
    const supabase = createClient();

    async function init() {
      const { data: info, error: infoError } = await supabase.rpc("get_staff_invite_info", { p_token: token });
      if (infoError || !info) {
        setMode("invalid");
        return;
      }
      setInvitedEmail(info.email);
      setEventName(info.event_name);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        if (user.email?.toLowerCase() !== info.email.toLowerCase()) {
          setMode("mismatch");
        } else {
          await tryAccept();
        }
      } else {
        setMode("auth");
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({ email: invitedEmail, password });
    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }
    if (!data.session) {
      setMode("confirm_email");
      setSubmitting(false);
      return;
    }
    await tryAccept();
    setSubmitting(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: invitedEmail, password });
    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }
    await tryAccept();
    setSubmitting(false);
  }

  async function handleLogoutAndRetry() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMode("auth");
  }

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-md px-4 py-16">
        {mode === "loading" && <p className="text-center text-gray-500">Chargement...</p>}

        {mode === "invalid" && (
          <div className="card text-center">
            <h1 className="text-xl font-bold text-navy dark:text-white">Invitation invalide</h1>
            <p className="mt-2 text-sm text-gray-500">
              {error === "invalid_or_expired_invite" || !error
                ? "Ce lien d'invitation n'est plus valide — il a peut-être déjà été utilisé ou révoqué. Demande à l'organisateur de t'en renvoyer un."
                : error}
            </p>
          </div>
        )}

        {mode === "mismatch" && (
          <div className="card text-center">
            <h1 className="text-xl font-bold text-navy dark:text-white">Mauvais compte</h1>
            <p className="mt-2 text-sm text-gray-500">
              Cette invitation est destinée à <strong>{invitedEmail}</strong>, mais tu es connecté avec un
              autre compte. Déconnecte-toi pour continuer.
            </p>
            <button onClick={handleLogoutAndRetry} className="btn-primary mt-4">
              Se déconnecter
            </button>
          </div>
        )}

        {mode === "confirm_email" && (
          <div className="card text-center">
            <h1 className="text-xl font-bold text-navy dark:text-white">Vérifie ta boîte mail</h1>
            <p className="mt-2 text-sm text-gray-500">
              Compte créé pour <strong>{invitedEmail}</strong>. Confirme ton adresse via l'email reçu, puis
              reviens sur ce même lien pour finaliser ton accès au scanner.
            </p>
          </div>
        )}

        {mode === "success" && (
          <div className="card text-center">
            <h1 className="text-xl font-bold text-navy dark:text-white">Accès activé</h1>
            <p className="mt-2 text-sm text-gray-500">
              Tu peux maintenant scanner les billets pour <strong>{eventName}</strong>.
            </p>
            <Link href={`/dashboard/events/${acceptedEventId}/scan`} className="btn-primary mt-4 inline-block">
              Ouvrir le scanner
            </Link>
          </div>
        )}

        {mode === "auth" && (
          <>
            <h1 className="mb-2 text-2xl font-bold text-navy dark:text-white">Rejoindre l'équipe</h1>
            <p className="mb-6 text-sm text-gray-500">
              Invitation pour <strong>{invitedEmail}</strong> — scanner les billets de{" "}
              <strong>{eventName}</strong>.
            </p>

            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setAuthTab("signup")}
                className={authTab === "signup" ? "btn-primary py-1.5 px-4 text-[11px]" : "btn-secondary py-1.5 px-4 text-[11px]"}
              >
                Créer un compte
              </button>
              <button
                onClick={() => setAuthTab("login")}
                className={authTab === "login" ? "btn-primary py-1.5 px-4 text-[11px]" : "btn-secondary py-1.5 px-4 text-[11px]"}
              >
                J'ai déjà un compte
              </button>
            </div>

            {authTab === "signup" ? (
              <form onSubmit={handleSignup} className="card space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input className="input" value={invitedEmail} disabled />
                </div>
                <div>
                  <label className="label">Mot de passe</label>
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
                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? "Création..." : "Créer mon compte et accéder au scanner"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="card space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input className="input" value={invitedEmail} disabled />
                </div>
                <div>
                  <label className="label">Mot de passe</label>
                  <input
                    type="password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? "Connexion..." : "Se connecter et accéder au scanner"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<p className="text-center text-gray-500 py-16">Chargement...</p>}>
      <AcceptInviteContent />
    </Suspense>
  );
}
