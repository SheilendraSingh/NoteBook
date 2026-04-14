import { redirect } from "next/navigation";

import { ProfileSettings } from "@/components/profile-settings";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <ProfileSettings initialUser={user} />;
}
