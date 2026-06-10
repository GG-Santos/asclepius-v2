"use client";

import { mergeAttributes, Node } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { Youtube } from "@tiptap/extension-youtube";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Box,
  Code,
  Heading2,
  Heading3,
  ImagePlus,
  Info,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Square,
  Strikethrough,
  Table as TableIcon,
  Undo2,
  Video,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ModelPicker } from "@/components/dashboard/model-picker";
import { cn } from "@/lib/utils";

const lowlight = createLowlight(common);

// Callout: a highlighted note box wrapping block content. Toggled with the
// core toggleWrap command; round-trips via the data-callout marker.
const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-callout": "",
        class: "blog-callout",
      }),
      0,
    ];
  },
});

// Embeds an uploaded 3D model by slug. Serializes to a placeholder div that the
// public post page hydrates into an interactive viewer (islands pattern).
const Model3DNode = Node.create({
  name: "model3d",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      slug: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-model3d") ?? "",
        renderHTML: (attrs) => ({ "data-model3d": attrs.slug }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-model3d]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "blog-model-embed" }),
    ];
  },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.className = "blog-model-embed";
      dom.setAttribute("data-model3d", node.attrs.slug);
      dom.textContent = `🧊 3D model: ${node.attrs.slug || "(set a slug)"}`;
      return { dom };
    };
  },
});

function Btn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        "rounded p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-40",
        active && "bg-accent/10 text-accent",
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-outline-variant/60" />;
}

export function RichTextEditor({
  name = "content",
  defaultValue = "",
}: {
  name?: string;
  defaultValue?: string;
}) {
  const [html, setHtml] = useState(defaultValue);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false, link: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener nofollow", target: "_blank" },
      }),
      Image.configure({ HTMLAttributes: { class: "blog-img" } }),
      Placeholder.configure({
        placeholder:
          "Write your post… select text to format, or use the toolbar above.",
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: { class: "blog-embed" },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({ lowlight }),
      Callout,
      Model3DNode,
    ],
    content: defaultValue,
    editorProps: {
      attributes: {
        class: "blog-prose min-h-[320px] px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });

  function addImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !editor) return;
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload/blog-image", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        toast.error("Image upload failed.");
        return;
      }
      const { url } = (await res.json()) as { url: string };
      editor.chain().focus().setImage({ src: url }).run();
    };
    input.click();
  }

  function addLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function addYoutube() {
    if (!editor) return;
    const url = window.prompt("YouTube or video URL");
    if (url) editor.commands.setYoutubeVideo({ src: url });
  }

  function addModel() {
    setModelPickerOpen(true);
  }

  if (!editor) {
    return (
      <div className="rounded-lg border border-outline-variant bg-card p-4 text-sm text-on-surface-variant">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-outline-variant bg-card focus-within:border-accent">
      <div className="flex flex-wrap items-center gap-0.5 border-outline-variant/60 border-b px-2 py-1.5">
        <Btn
          title="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="size-4" />
        </Btn>
        <Btn
          title="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className="size-4" />
        </Btn>
        <Sep />
        <Btn
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </Btn>
        <Btn
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </Btn>
        <Btn
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-4" />
        </Btn>
        <Sep />
        <Btn
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </Btn>
        <Btn
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </Btn>
        <Btn
          title="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </Btn>
        <Btn
          title="Code block"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Square className="size-4" />
        </Btn>
        <Btn
          title="Divider"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="size-4" />
        </Btn>
        <Btn
          title="Callout"
          active={editor.isActive("callout")}
          onClick={() => editor.chain().focus().toggleWrap("callout").run()}
        >
          <Info className="size-4" />
        </Btn>
        <Sep />
        <Btn title="Link" active={editor.isActive("link")} onClick={addLink}>
          <LinkIcon className="size-4" />
        </Btn>
        <Btn title="Image" onClick={addImage}>
          <ImagePlus className="size-4" />
        </Btn>
        <Btn
          title="Table"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          <TableIcon className="size-4" />
        </Btn>
        <Btn title="Video embed" onClick={addYoutube}>
          <Video className="size-4" />
        </Btn>
        <Btn title="3D model" onClick={addModel}>
          <Box className="size-4" />
        </Btn>
        <Sep />
        <Btn
          title="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="size-4" />
        </Btn>
        <Btn
          title="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="size-4" />
        </Btn>
      </div>

      <FloatingMenu
        editor={editor}
        className="flex flex-wrap items-center gap-0.5 rounded-lg border border-outline-variant/60 bg-card p-1 shadow-[var(--shadow-clinical-md)]"
      >
        <Btn
          title="Heading 2"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="size-4" />
        </Btn>
        <Btn
          title="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </Btn>
        <Btn
          title="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </Btn>
        <Btn
          title="Quote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </Btn>
        <Btn
          title="Callout"
          onClick={() => editor.chain().focus().toggleWrap("callout").run()}
        >
          <Info className="size-4" />
        </Btn>
        <Btn
          title="Code block"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Square className="size-4" />
        </Btn>
        <Btn title="Image" onClick={addImage}>
          <ImagePlus className="size-4" />
        </Btn>
        <Btn
          title="Table"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          <TableIcon className="size-4" />
        </Btn>
        <Btn title="Video embed" onClick={addYoutube}>
          <Video className="size-4" />
        </Btn>
      </FloatingMenu>

      <BubbleMenu
        editor={editor}
        className="flex items-center gap-0.5 rounded-lg border border-outline-variant/60 bg-card p-1 shadow-[var(--shadow-clinical-md)]"
      >
        <Btn
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </Btn>
        <Btn
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </Btn>
        <Btn
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-4" />
        </Btn>
        <Btn
          title="Inline code"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="size-4" />
        </Btn>
        <Btn title="Link" active={editor.isActive("link")} onClick={addLink}>
          <LinkIcon className="size-4" />
        </Btn>
      </BubbleMenu>

      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} readOnly />

      <ModelPicker
        open={modelPickerOpen}
        onOpenChange={setModelPickerOpen}
        onPick={(slug) =>
          editor
            .chain()
            .focus()
            .insertContent({ type: "model3d", attrs: { slug } })
            .run()
        }
      />
    </div>
  );
}
