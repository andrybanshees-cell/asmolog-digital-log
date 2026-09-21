import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Aperture } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { inputCls } from "@/components/Shell";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — asmolog" },
      { name: "description", content: "Sign in to asmolog to sync your camera logs across devices." },
      { property: "og:title", content: "Sign in — asmolog" },
      { property: "og:description", content: "Sign in to sync your camera reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      void navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="surface w-full max-w-md p-7">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Aperture className="size-6" />
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
          {mode === "in" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Logs are always saved on this device first. Sign in to sync them to the cloud.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={inputCls}
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className={inputCls}
          />
          <button
            type="submit"
            disabled={busy}
            className="h-14 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-60"
          >
            {mode === "in" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button
          onClick={() => void google()}
          className="mt-3 h-14 w-full rounded-2xl border border-border bg-card text-base font-bold"
        >
          Continue with Google
        </button>

        <div className="mt-5 flex items-center justify-between text-sm">
          <button
            onClick={() => setMode(mode === "in" ? "up" : "in")}
            className="font-semibold text-primary"
          >
            {mode === "in" ? "Create an account" : "I already have an account"}
          </button>
          <button
            onClick={() => void navigate({ to: "/" })}
            className="font-semibold text-muted-foreground"
          >
            Work offline
          </button>
        </div>
      </div>
    </div>
  );
}
