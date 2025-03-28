import "./global.css";
import { RootProvider } from "fumadocs-ui/provider";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layout";
import { docsOptions } from "./layout.config";
import { Footer } from "@/components/footer";


const inter = Inter({
  subsets: ["latin"],
});

export default function Layout({ children }: { children: ReactNode }) {
  const repoBase = "https://github.com/username/repo/edit/main/";
  const filePath = "content";
  const githubUrl = `${repoBase}${filePath}`;

  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <link rel="icon" href="/favicon/favicon.ico" sizes="any" />
      <body>
        <RootProvider
          theme={{
            enabled: true,
            defaultTheme: "dark",
          }}
        >
          <DocsLayout {...docsOptions}>{children}</DocsLayout>
        </RootProvider>
        <Footer />
      </body>
    </html>
  );
}
