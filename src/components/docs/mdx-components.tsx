import { Callout } from "fumadocs-ui/components/callout";
import { Card, Cards } from "fumadocs-ui/components/card";
import { Step, Steps } from "fumadocs-ui/components/steps";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { DocsHero } from "./docs-hero";
import { IconCard } from "./icon-card";
import { StatusBadge } from "./status-badge";
import { StatusReferenceTable } from "./status-reference-table";

// Single component map handed to every docs MDX page. Themed Fumadocs
// primitives (Card/Cards/Callout/Steps) plus the brand-specific components.
export const docsMdxComponents: MDXComponents = {
  ...defaultMdxComponents,
  Card,
  Cards,
  Callout,
  Step,
  Steps,
  DocsHero,
  IconCard,
  StatusBadge,
  StatusReferenceTable,
};
