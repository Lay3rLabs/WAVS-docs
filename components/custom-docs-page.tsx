"use client";

import { ReactNode } from 'react';
import { DocsPage as FumadocsPage } from 'fumadocs-ui/page';
import { type TOCItem } from 'fumadocs-core/server';

export function DocsPage({
  children,
  toc,
  full,
}: {
  children: ReactNode;
  toc?: TOCItem[];
  full?: boolean;
}) {
  return (
    <FumadocsPage
      full={full}
      toc={toc}
    >
      {children}
    </FumadocsPage>
  );
}