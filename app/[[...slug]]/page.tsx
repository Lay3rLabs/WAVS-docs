import { getPage, getPages } from "@/app/source";
import type { Metadata } from "next";
import { DocsBody, DocsPage as FumadocsPage } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { OpenInLLM } from "@/components/open-in-llm";

export default async function Page({
  params,
}: {
  params: { slug?: string[] };
}) {
  const page = getPage(params.slug);

  if (page == null) {
    notFound();
  }

  const MDX = page.data.exports.default;

  let isFull = false;

  const updatedToc = (page.data.exports.toc ?? []).filter(item => item && typeof item.title === 'string').map(item => {
    const title = String(item.title); // Ensure title is always a string
    if (title.includes('!!steps')) {
      isFull = true;
      return { ...item, title: title.replace('!!steps ', '') };
    }
    return item;
  });

  return (
    <FumadocsPage full={isFull} toc={updatedToc}>
      <DocsBody>
        <div className="flex justify-end mb-6">
          <OpenInLLM />
        </div>
        <h1>{page.data.title}</h1>
        <MDX />
      </DocsBody>
    </FumadocsPage>
  );
}

export async function generateStaticParams() {
  return getPages().map((page) => ({
    slug: page.slugs,
  }));
}

export function generateMetadata({ params }: { params: { slug?: string[] } }) {
  const page = getPage(params.slug);

  if (page == null) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  } satisfies Metadata;
}
