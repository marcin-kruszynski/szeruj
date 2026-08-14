import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { MarkdownCodeBlock } from "./MarkdownCodeBlock";

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

function codeBlock(children: ReactNode) {
  const child = Children.toArray(children).find(isValidElement);
  if (!isValidElement<{ children?: ReactNode; className?: string }>(child)) {
    return { code: nodeText(children).replace(/\n$/, ""), language: undefined };
  }
  const language = /(?:^|\s)language-([^\s]+)/.exec(child.props.className ?? "")?.[1];
  return { code: nodeText(child.props.children).replace(/\n$/, ""), language };
}

export function MarkdownDocument({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        skipHtml
        components={{
          a: ({ children, ...props }) => <a {...props} target="_blank" rel="noreferrer noopener">{children}</a>,
          table: ({ children, ...props }) => <div className="markdown-table-wrap"><table {...props}>{children}</table></div>,
          pre: ({ children }) => {
            const block = codeBlock(children);
            return <MarkdownCodeBlock code={block.code} language={block.language}>{children}</MarkdownCodeBlock>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
