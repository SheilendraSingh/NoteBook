"use client";

import { ArrowLeft, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/theme-toggle";
import type { UserProfile } from "@/types/app";

type Props = {
  initialUser: UserProfile;
};

type ProfileResponse = {
  user: UserProfile;
  error?: string;
};

export function ProfileSettings({ initialUser }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialUser.name);
  const [email, setEmail] = useState(initialUser.email);
  const [reminderLeadMinutes, setReminderLeadMinutes] = useState(String(initialUser.reminderLeadMinutes));
  const [themePreference, setThemePreference] = useState(initialUser.themePreference);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          reminderLeadMinutes: Number(reminderLeadMinutes),
          themePreference,
        }),
      });

      const data = (await response.json()) as ProfileResponse;

      if (!response.ok) {
        toast.error(data.error ?? "Unable to update profile.");
        return;
      }

      toast.success("Profile updated.");
      router.refresh();
    } catch (error) {
      console.error("Profile submit error:", error);
      toast.error("Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8">
      <div className="notebook-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to tasks
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        <h1 className="mt-6 text-3xl font-semibold text-ink">Profile Settings</h1>
        <p className="mt-2 text-sm text-muted">
          Update your account info, reminder defaults, and theme preference.
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Name</span>
            <input
              className="field"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={80}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Email</span>
            <input
              className="field"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Due-date reminder window (minutes)</span>
            <input
              className="field"
              type="number"
              min={5}
              max={43200}
              value={reminderLeadMinutes}
              onChange={(event) => setReminderLeadMinutes(event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Theme preference</span>
            <select
              className="field"
              value={themePreference}
              onChange={(event) => setThemePreference(event.target.value as UserProfile["themePreference"])}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Saving..." : "Save profile"}
          </button>
        </form>
      </div>
    </main>
  );
}
