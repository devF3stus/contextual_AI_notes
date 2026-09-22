import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DOMParser as ProseMirrorDOMParser } from "@tiptap/pm/model";

const DROP_TAGS = [
  "script",
  "style",
  "noscript",
  "template",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "title",
  "base",
  "svg",
  "canvas",
  "picture",
  "figure",
  "video",
  "audio",
  "img",
  "input",
  "button",
  "form",
  "select",
  "textarea",
].join(", ");

const KEEP_ATTRIBUTES = new Set(["href", "start", "value"]);

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function plainTextToHtml(text) {
  const normalized = String(text).replace(/\r\n?/g, "\n");
  const chunks = normalized.split(/\n\s*\n/);
  const paragraphs = [];
  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    while (lines.length > 0 && lines[0] === "") lines.shift();
    if (lines.length === 0) continue;
    paragraphs.push(`<p>${lines.map(escapeHtml).join("<br>")}</p>`);
  }
  return paragraphs.length > 0 ? paragraphs.join("") : null;
}

function htmlToPlainText(html) {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc && doc.body ? doc.body.textContent || "" : "";
  } catch {
    return "";
  }
}

function unwrapElement(el) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function wrapElement(el, tagName) {
  const parent = el.parentNode;
  if (!parent) return;
  const wrapper = el.ownerDocument.createElement(tagName);
  parent.insertBefore(wrapper, el);
  wrapper.appendChild(el);
}

function isBoldWeight(value) {
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "bold" || normalized === "bolder" || normalized === "heavy") {
    return true;
  }
  const numeric = parseInt(normalized, 10);
  return Number.isInteger(numeric) && numeric >= 600;
}

function getStyleValue(style, property) {
  const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`).exec(style);
  return match ? match[1].trim() : null;
}

function normalizeFormatting(root) {
  const elements = Array.from(
    root.querySelectorAll("b, strong, i, em, u, s, strike, del, span, font")
  );

  for (const el of elements) {
    if (!el.isConnected) continue;
    const tag = el.tagName.toLowerCase();
    const style = (el.getAttribute("style") || "").toLowerCase();
    const weight = getStyleValue(style, "font-weight");
    const fontStyle = getStyleValue(style, "font-style");
    const decoration =
      getStyleValue(style, "text-decoration") ||
      getStyleValue(style, "text-decoration-line");

    const isBoldTag = tag === "b" || tag === "strong";
    const isItalicTag = tag === "i" || tag === "em";
    const isUnderlineTag = tag === "u";
    const isStrikeTag = tag === "s" || tag === "strike" || tag === "del";

    if (isBoldTag && weight && !isBoldWeight(weight)) {
      unwrapElement(el);
      continue;
    }
    if (isItalicTag && fontStyle && fontStyle !== "italic" && fontStyle !== "oblique") {
      unwrapElement(el);
      continue;
    }
    if (isUnderlineTag && decoration && !decoration.includes("underline")) {
      unwrapElement(el);
      continue;
    }
    if (isStrikeTag && decoration && !decoration.includes("line-through")) {
      unwrapElement(el);
      continue;
    }

    if ((tag === "span" || tag === "font") && style) {
      if (weight && isBoldWeight(weight)) wrapElement(el, "strong");
      if (fontStyle && (fontStyle === "italic" || fontStyle === "oblique")) {
        wrapElement(el, "em");
      }
      if (decoration && decoration.includes("underline")) wrapElement(el, "u");
      if (decoration && decoration.includes("line-through")) wrapElement(el, "s");
    }
  }
}

function sanitizeClipboardHtml(html) {
  if (!html || !html.trim()) return null;
  let doc;
  try {
    doc = new DOMParser().parseFromString(html, "text/html");
  } catch {
    return null;
  }
  if (!doc || !doc.body) return null;
  const body = doc.body;

  body.querySelectorAll(DROP_TAGS).forEach((el) => el.remove());

  const comments = [];
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_COMMENT);
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((node) => node.remove());

  normalizeFormatting(body);

  body.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (!KEEP_ATTRIBUTES.has(attr.name.toLowerCase())) {
        el.removeAttribute(attr.name);
      }
    }
  });

  const cleaned = body.innerHTML.trim();
  return cleaned || null;
}

function isCursorInCodeBlock(state) {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const nodeType = $from.node(depth).type;
    if (nodeType.spec && nodeType.spec.code) return true;
  }
  return false;
}

export const ClipboardPasteExtension = Extension.create({
  name: "clipboardPaste",
  // Lower than built-in paste handlers (link/list/code-block default to 100)
  // so they get first refusal; we run before ProseMirror's generic fallback.
  priority: 1,
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("clipboardPaste"),
        props: {
          handlePaste: (view, event) => {
            const clipboard = event.clipboardData;
            if (!clipboard) return false;

            const rawHtml = clipboard.getData("text/html") || "";
            const text =
              clipboard.getData("text/plain") || clipboard.getData("Text") || "";

            if (isCursorInCodeBlock(view.state)) {
              const exact = text || (rawHtml ? htmlToPlainText(rawHtml) : "");
              if (!exact) return false;
              try {
                const tr = view.state.tr
                  .insertText(exact.replace(/\r\n?/g, "\n"))
                  .setMeta("paste", true)
                  .setMeta("uiEvent", "paste")
                  .scrollIntoView();
                event.preventDefault();
                view.dispatch(tr);
                view.focus();
                return true;
              } catch {
                return false;
              }
            }

            let htmlToInsert = null;
            let preserveWhitespace = false;

            if (rawHtml.trim()) {
              htmlToInsert = sanitizeClipboardHtml(rawHtml);
              if (!htmlToInsert && text) {
                htmlToInsert = plainTextToHtml(text);
                preserveWhitespace = true;
              }
              if (!htmlToInsert) return true;
            } else if (text) {
              htmlToInsert = plainTextToHtml(text);
              preserveWhitespace = true;
            }

            if (!htmlToInsert) return false;

            try {
              const container = document.createElement("div");
              container.innerHTML = htmlToInsert;
              const parser = ProseMirrorDOMParser.fromSchema(view.state.schema);
              const slice = parser.parseSlice(
                container,
                preserveWhitespace ? { preserveWhitespace: true } : undefined
              );
              const tr = view.state.tr
                .replaceSelection(slice)
                .setMeta("paste", true)
                .setMeta("uiEvent", "paste")
                .scrollIntoView();
              event.preventDefault();
              view.dispatch(tr);
              view.focus();
              return true;
            } catch {
              return false;
            }
          },
        },
      }),
    ];
  },
});
