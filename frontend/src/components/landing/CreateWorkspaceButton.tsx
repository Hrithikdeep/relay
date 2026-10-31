"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useAuth, useClerk } from "@clerk/nextjs";
import { SIGN_UP_PATH } from "./links";

// Modal appearance for Clerk's sign-up popup, chosen at click time so it
// matches whichever theme the landing page is showing right now.
function modalAppearance(light: boolean) {
  return light
    ? {
        variables: {
          colorPrimary: "#2563eb",
          colorBackground: "#ffffff",
          colorForeground: "#14161f",
          colorMutedForeground: "#5b6178",
          colorBorder: "#e4e6ef",
          fontFamily: "inherit",
        },
      }
    : {
        variables: {
          colorPrimary: "#4cb5ff",
          colorPrimaryForeground: "#04111f",
          colorBackground: "#121420",
          colorForeground: "#eceef2",
          colorMutedForeground: "#9aa0b5",
          colorMuted: "#191c2b",
          colorInputForeground: "#eceef2",
          colorBorder: "#2b2f42",
          fontFamily: "inherit",
        },
      };
}

interface CreateWorkspaceButtonProps {
  className: string;
  children: ReactNode;
}

// Opens Clerk's sign-up form as a popup instead of navigating to /sign-up.
// Signed-in visitors skip it and go straight to the dashboard; if Clerk
// hasn't finished loading yet, a click falls back to the /sign-up page.
export function CreateWorkspaceButton({ className, children }: CreateWorkspaceButtonProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();

  if (isSignedIn) {
    return (
      <Link href="/dashboard" className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (!isLoaded) {
          window.location.href = SIGN_UP_PATH;
          return;
        }
        clerk.openSignUp({
          appearance: modalAppearance(document.documentElement.classList.contains("light")),
          fallbackRedirectUrl: "/dashboard",
          signInFallbackRedirectUrl: "/dashboard",
        });
      }}
    >
      {children}
    </button>
  );
}

export default CreateWorkspaceButton;
