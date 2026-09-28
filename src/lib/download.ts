import { marked } from "marked";
import DOMPurify from "dompurify";

const render = (md: string) => DOMPurify.sanitize(marked.parse(md, { async: false }));

export function downloadFile(name: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const docStyles = `body{font-family:"Times New Roman",serif;font-size:12pt;line-height:2;margin:1in}h1,h2,h3{text-align:center;font-size:12pt}p{margin:0 0 12pt}`;

/** Word opens HTML files saved as .doc, which keeps formatting without extra dependencies. */
export function downloadDoc(name: string, markdown: string) {
  const body = render(markdown);
  downloadFile(`${name}.doc`, `<html><head><meta charset="utf-8"><style>${docStyles}</style></head><body>${body}</body></html>`, "application/msword");
}

export function printMarkdown(title: string, markdown: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<html><head><title>${title.replace(/</g, "&lt;")}</title><style>${docStyles}</style></head><body>${render(markdown)}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "document";
