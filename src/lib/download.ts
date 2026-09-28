import { marked } from "marked";
import DOMPurify from "dompurify";
import { isNative, saveFile } from "./native";

const render = (md: string) => DOMPurify.sanitize(marked.parse(md, { async: false }));

/** Downloads a file in the browser; on phones opens the share sheet to save or send it. */
export function downloadFile(name: string, content: string, type = "text/plain") {
  saveFile(name, content, type).catch((e) => console.error("Could not save file", e));
}

const docStyles = `body{font-family:"Times New Roman",serif;font-size:12pt;line-height:2;margin:1in}h1,h2,h3{text-align:center;font-size:12pt}p{margin:0 0 12pt}`;
const docHtml = (markdown: string) => `<html><head><meta charset="utf-8"><style>${docStyles}</style></head><body>${render(markdown)}</body></html>`;

/** Word opens HTML files saved as .doc, which keeps formatting without extra dependencies. */
export function downloadDoc(name: string, markdown: string) {
  downloadFile(`${name}.doc`, docHtml(markdown), "application/msword");
}

/** Prints in the browser. Phones can't print from the app, so the document is shared instead (print it from Word or Drive). */
export function printMarkdown(title: string, markdown: string) {
  if (isNative()) {
    downloadDoc(slug(title), markdown);
    return;
  }
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<html><head><title>${title.replace(/</g, "&lt;")}</title><style>${docStyles}</style></head><body>${render(markdown)}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "document";
