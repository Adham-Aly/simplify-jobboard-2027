import { ChevronRight, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import type { CellNode } from "@/lib/readme/types";

interface RenderContext {
  onLinkOpen?: (href: string, label: string) => void;
}

function isWhitespace(node: CellNode): boolean {
  return node.type === "text" && node.text.trim() === "";
}

/** A link whose only content is an image (the README's "Apply" / "Simplify" buttons). */
function imageOnlyLabel(children: CellNode[]): string | null {
  const meaningful = children.filter((c) => !isWhitespace(c));
  if (meaningful.length === 0 || !meaningful.every((c) => c.type === "image")) return null;
  return meaningful.map((c) => (c.type === "image" ? c.alt : "")).join(" ").trim() || "Open link";
}

function buttonClass(label: string): string {
  const base =
    "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[12.5px] font-medium whitespace-nowrap transition-colors";
  if (/^apply$/i.test(label)) {
    return `${base} bg-accent text-white shadow-sm hover:bg-accent-strong`;
  }
  return `${base} border border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-paper hover:text-ink`;
}

function renderNodes(nodes: CellNode[], ctx: RenderContext, keyPrefix = ""): ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}${i}`;
    switch (node.type) {
      case "text":
        return node.text;
      case "break":
        return <br key={key} />;
      case "image":
        return node.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote images straight from the README
          <img key={key} src={node.src} alt={node.alt} className="inline-block max-h-6 align-middle" />
        ) : (
          node.alt
        );
      case "link": {
        const label = imageOnlyLabel(node.children);
        const onClick = () =>
          ctx.onLinkOpen?.(node.href, label ?? "");
        if (label) {
          return (
            <a
              key={key}
              href={node.href}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass(label)}
              onClick={onClick}
              onAuxClick={onClick}
              title={node.href}
            >
              {label}
              <ExternalLink aria-hidden className="size-3 opacity-70" />
            </a>
          );
        }
        return (
          <a
            key={key}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            className="decoration-line-strong underline-offset-[3px] hover:text-accent hover:underline"
            onClick={onClick}
            onAuxClick={onClick}
            title={node.href}
          >
            {renderNodes(node.children, ctx, `${key}.`)}
          </a>
        );
      }
      case "details":
        return (
          <details key={key} className="cell-details">
            <summary className="inline-flex items-center gap-1 rounded text-ink-soft hover:text-ink">
              <ChevronRight aria-hidden className="chevron size-3.5 text-faint transition-transform" />
              {renderNodes(node.summary, ctx, `${key}s.`)}
            </summary>
            <div className="mt-1 border-l-2 border-line pl-2.5 text-[13px] leading-5 text-ink-soft">
              {renderNodes(node.children, ctx, `${key}.`)}
            </div>
          </details>
        );
      case "format": {
        const children = renderNodes(node.children, ctx, `${key}.`);
        switch (node.tag) {
          case "strong":
            return (
              <strong key={key} className="font-semibold">
                {children}
              </strong>
            );
          case "em":
            return <em key={key}>{children}</em>;
          case "code":
            return (
              <code key={key} className="font-mono text-[0.92em]">
                {children}
              </code>
            );
          case "sub":
            return <sub key={key}>{children}</sub>;
          case "sup":
            return <sup key={key}>{children}</sup>;
          case "del":
            return <del key={key}>{children}</del>;
          case "u":
            return <u key={key}>{children}</u>;
          case "div":
            return (
              <div key={key} className="flex flex-wrap items-center gap-1.5">
                {children}
              </div>
            );
          default:
            return <span key={key}>{children}</span>;
        }
      }
    }
  });
}

/** Renders a README table cell with every link and piece of text intact. */
export function CellContent({
  nodes,
  onLinkOpen,
}: {
  nodes: CellNode[];
  onLinkOpen?: (href: string, label: string) => void;
}) {
  return <>{renderNodes(nodes, { onLinkOpen })}</>;
}
