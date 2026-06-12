import { Callout } from "fumadocs-ui/components/callout";
import { Card, Cards } from "fumadocs-ui/components/card";
import { Step, Steps } from "fumadocs-ui/components/steps";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { DocNote } from "./doc-note";
import { OpenRoute } from "./open-route";
import { StatusBadge } from "./status-badge";
import { StatusReferenceTable } from "./status-reference-table";
import { WorkflowMedia } from "./workflow-media";

// Keep docs pages close to product truth: standard Fumadocs primitives plus
// small references that mirror real app states.
export const docsMdxComponents: MDXComponents = {
  ...defaultMdxComponents,
  Card,
  Cards,
  Callout,
  DocNote,
  OpenRoute,
  Step,
  Steps,
  StatusBadge,
  StatusReferenceTable,
  WorkflowMedia,
};
