import { docs } from "@/lib/ariadocs";

type Props = { params: Promise<{ path?: string[] }> };

export async function generateStaticParams() {
  const paths = await docs.getPagePaths();
  const seen = new Set<string>();
  const out: { path: string[] }[] = [];

  for (const raw of paths) {
    const normalized = raw.replace(/^\/+/, "").replace(/\/+$/, "") || "index";
    const key = normalized === "index" ? "" : normalized;
    if (seen.has(key)) continue;
    seen.add(key);
    if (normalized === "index") {
      out.push({ path: [] });
    } else {
      out.push({ path: normalized.split("/").filter(Boolean) });
    }
  }
  return out;
}

export default async function DocPage({ params }: Props) {
  const { path } = await params;
  const slug = !path?.length ? "index" : path.join("/");
  const { MDX, frontmatter, toc } = await docs.parse({ slug });

  const title = typeof frontmatter.title === "string" ? frontmatter.title : slug;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-8">
      <article className="prose prose-zinc max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-a:text-blue-600 dark:prose-a:text-blue-400">
        <h1>{title}</h1>
        {toc.length > 0 ? (
          <nav aria-label="On this page" className="not-prose mb-8 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">On this page</p>
            <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
              {toc.map((item) => (
                <li key={item.href}>
                  <a href={item.href}>{item.value}</a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        {MDX}
      </article>
    </main>
  );
}
