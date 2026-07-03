import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trailmark — Knowledge Board",
  description:
    "Sequence what to learn next. Build a board per subject and order your knowledge cards as a learning path.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
