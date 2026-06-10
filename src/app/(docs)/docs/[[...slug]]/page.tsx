import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { docsMdxComponents } from "@/components/docs/mdx-components";
import { source } from "@/lib/source";

// Admin-gated in the (docs) layout — render per request, never statically cache.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) return {};
  return {
    title: page.data.title,
    description: page.data.description,
    robots: { index: false, follow: false },
  };
}

export default async function DocsPageRoute(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;
  // The index renders as a full-width branded landing (hero supplies the H1);
  // inner pages keep the standard title/description/TOC/breadcrumb chrome.
  const isLanding = !slug || slug.length === 0;

  return (
    <DocsPage
      toc={page.data.toc}
      full={isLanding}
      tableOfContent={{ enabled: !isLanding }}
      breadcrumb={{ enabled: !isLanding }}
    >
      {!isLanding && <DocsTitle>{page.data.title}</DocsTitle>}
      {!isLanding && <DocsDescription>{page.data.description}</DocsDescription>}
      <DocsBody>
        <MDX components={docsMdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}
