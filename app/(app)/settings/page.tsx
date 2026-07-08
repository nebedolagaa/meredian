import { redirect } from "next/navigation";

// Settings has been reworked into the Profile page.
export default function SettingsPage() {
  redirect("/profile");
}
