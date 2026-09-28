import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

export function Markdown({ text }: { text: string }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(text, { async: false, gfm: true, breaks: true })), [text]);
  return <div className="md" dangerouslySetInnerHTML={{ __html: html }} />;
}
