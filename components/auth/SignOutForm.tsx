"use client";

import type { ReactNode } from "react";
import { signOut } from "@/app/actions/auth";

// Must match `PAGES_CACHE` in public/sw.js. Cleared on sign-out so a shared
// device (e.g. a gym tablet) can't serve the previous user's cached session
// pages to whoever signs in next while offline.
const PAGES_CACHE = "meredian-pages-v1";

export function SignOutForm({ children }: { children: ReactNode }) {
  return (
    <form
      action={signOut}
      onSubmit={() => {
        if (typeof caches !== "undefined") {
          caches.delete(PAGES_CACHE).catch(() => {});
        }
      }}
    >
      {children}
    </form>
  );
}
