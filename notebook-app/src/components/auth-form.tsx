"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Mode = "login" | "register";

type Props = {
  mode: Mode;
};

type AuthResponse = {
  error?: string;
};

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isRegister ? { name } : {}),
          email,
          password,
        }),
      });

      const data = (await response.json()) as AuthResponse;

      if (!response.ok) {
        toast.error(data.error ?? "Authentication failed.");
        return;
      }

      toast.success(isRegister ? "Account created." : "Signed in successfully.");
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Auth submit error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="notebook-panel w-full max-w-md p-7">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">Task Notebook</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">{isRegister ? "Create Account" : "Welcome Back"}</h1>
        <p className="mt-2 text-sm text-muted">
          {isRegister
            ? "Register to start creating and organizing your tasks."
            : "Sign in to manage your tasks, reminders, and profile settings."}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {isRegister ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Name</span>
              <input
                className="field"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                maxLength={80}
                placeholder="Your full name"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Email</span>
            <input
              className="field"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Password</span>
            <input
              className="field"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              maxLength={128}
              placeholder="At least 8 characters"
            />
          </label>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {isRegister ? "Already have an account?" : "Need an account?"}{" "}
          <Link href={isRegister ? "/login" : "/register"} className="font-semibold text-accent hover:underline">
            {isRegister ? "Log in" : "Register"}
          </Link>
        </p>
      </div>
    </main>
  );
}
