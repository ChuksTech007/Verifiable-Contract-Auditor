import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verifiable Contract Auditor",
  description:
    "AI-powered Solidity smart contract security auditor with cryptographic proof — every audit runs inside a TEE on 0G Compute Network.",
  openGraph: {
    title: "Verifiable Contract Auditor",
    description:
      "AI-powered Solidity smart contract security auditor with cryptographic proof — every audit runs inside a TEE on 0G Compute Network.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Verifiable Contract Auditor",
    description:
      "AI-powered Solidity smart contract security auditor with cryptographic proof — every audit runs inside a TEE on 0G Compute Network.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
