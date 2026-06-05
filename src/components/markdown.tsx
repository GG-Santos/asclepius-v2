// Minimal, dependency-free markdown rendering shared by the blog and LMS
// lessons: headings, list items, and paragraphs.
export function Markdown({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        const key = `${i}:${trimmed.slice(0, 16)}`;
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={key} className="mt-8 text-xl font-bold text-on-surface">
              {trimmed.slice(3)}
            </h2>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={key} className="mt-8 text-2xl font-bold text-on-surface">
              {trimmed.slice(2)}
            </h2>
          );
        }
        if (trimmed.split("\n").every((l) => l.trim().startsWith("- "))) {
          return (
            <ul
              key={key}
              className="my-4 list-disc space-y-1 pl-6 text-on-surface-variant"
            >
              {trimmed.split("\n").map((l) => (
                <li key={l}>{l.trim().slice(2)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p
            key={key}
            className="my-4 whitespace-pre-line leading-7 text-on-surface-variant"
          >
            {trimmed}
          </p>
        );
      })}
    </>
  );
}
