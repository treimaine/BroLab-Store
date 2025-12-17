/**
 * HTML Sanitization Utility
 * Uses DOMPurify to prevent XSS attacks when rendering HTML content
 */

import DOMPurify from "dompurify";

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html - Raw HTML string to sanitize
 * @returns Sanitized HTML string safe for dangerouslySetInnerHTML
 */
export function sanitizeHtml(html: string | undefined | null): string {
  if (!html) {
    return "";
  }
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "b",
      "i",
      "u",
      "s",
      "strike",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "dl",
      "dt",
      "dd",
      "a",
      "img",
      "figure",
      "figcaption",
      "blockquote",
      "pre",
      "code",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "div",
      "span",
      "section",
      "article",
      "header",
      "footer",
      "hr",
      "sub",
      "sup",
      "mark",
    ],
    ALLOWED_ATTR: [
      "href",
      "target",
      "rel",
      "src",
      "alt",
      "title",
      "class",
      "id",
      "width",
      "height",
      "style",
      "colspan",
      "rowspan",
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["script", "style", "iframe", "form", "input", "button", "object", "embed"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  });
}

/**
 * Sanitizes HTML and returns object for dangerouslySetInnerHTML
 * @param html - Raw HTML string to sanitize
 * @param fallback - Fallback text if html is empty
 * @returns Object with __html property for React's dangerouslySetInnerHTML
 */
export function createSafeHtml(
  html: string | undefined | null,
  fallback?: string
): { __html: string } {
  const sanitized = sanitizeHtml(html);
  return { __html: sanitized || fallback || "" };
}
