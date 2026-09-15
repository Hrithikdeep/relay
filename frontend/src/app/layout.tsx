import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/theme/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Relay",
};

// Deliberately minimal - the dashboard's Sidebar/TopBar chrome (AppShell)
// lives only in app/(app)/layout.tsx now, so the marketing landing page at
// "/" can render standalone instead of inheriting the app shell.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} antialiased`} suppressHydrationWarning>
      <body>
        {/* Runs before hydration so the stored theme applies with no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
