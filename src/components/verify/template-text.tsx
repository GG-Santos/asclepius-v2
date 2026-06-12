// Live SVG text for an overridden template text element. Rendered at the
// suppressed static layer's depth so stacking order is preserved exactly.
import { ARTIFACT_CANVAS } from "@/lib/artifact-template/defaults";
import type { ResolvedTextOverride } from "@/lib/artifact-template/resolve";

export function TemplateTextLayer({
  override,
}: {
  override: ResolvedTextOverride;
}) {
  const { spec, color, fontSize, lines } = override;
  const canvas = ARTIFACT_CANVAS[spec.artifact];
  const lineHeight = spec.multiline?.lineHeight ?? fontSize * 1.15;
  return (
    <svg
      viewBox={`0 0 ${canvas.w} ${canvas.h}`}
      className="absolute inset-0 h-full w-full"
      fill="none"
      role="presentation"
      aria-hidden="true"
    >
      <text
        fill={color}
        fontFamily={spec.fontFamily}
        fontSize={fontSize}
        fontWeight={spec.fontWeight}
        fontStyle={spec.fontStyle}
        textAnchor={spec.align}
      >
        {lines.map((line, i) => (
          <tspan
            key={`${spec.id}-${i}-${line}`}
            x={spec.anchor.x}
            y={spec.anchor.y + i * lineHeight}
          >
            {line}
          </tspan>
        ))}
      </text>
    </svg>
  );
}
