// @vitest-environment jsdom
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";

// Mock API
const mockFetchPages = vi.fn();
const mockCreateNote = vi.fn();
const mockUpdateNote = vi.fn();
const mockCreatePage = vi.fn();
const mockUpdatePage = vi.fn();

vi.mock("./services/api", () => ({
  fetchPages: (...args) => mockFetchPages(...args),
  createNote: (...args) => mockCreateNote(...args),
  updateNote: (...args) => mockUpdateNote(...args),
  createPage: (...args) => mockCreatePage(...args),
  updatePage: (...args) => mockUpdatePage(...args),
}));

// Mock StickyNotes to simplify DOM
vi.mock("./components/StickyNotes", () => ({
  default: () => React.createElement("div", { "data-testid": "sticky-notes" }, "StickyNotes"),
}));

// Mock RichTextEditor to avoid ProseMirror DOM measurement complexity in JSDOM
// while verifying contract and content flow
vi.mock("./components/RichTextEditor", () => ({
  default: function MockRichTextEditor({ content, onChange, editorRef, onOverflow }) {
    const valRef = React.useRef(content || "");
    valRef.current = content || "";

    React.useEffect(() => {
      if (editorRef) {
        editorRef.current = {
          getHTML: () => valRef.current,
          getText: () => (valRef.current || "").replace(/<[^>]*>/g, ""),
          commands: {
            setContent: vi.fn(),
            focus: vi.fn(),
            setTextSelection: vi.fn(),
          },
          state: {
            doc: {
              content: { size: 100 },
            },
          },
        };
      }
    }, [editorRef]);

    return React.createElement(
      "div",
      { "data-testid": "rich-text-editor" },
      React.createElement("textarea", {
        "data-testid": "editor-textarea",
        value: content || "",
        onChange: (e) => {
          valRef.current = e.target.value;
          onChange?.(e.target.value);
        },
      }),
      React.createElement(
        "button",
        {
          "data-testid": "trigger-overflow-btn",
          onClick: () =>
            onOverflow?.({
              keepHtml: "<p>Kept text</p>",
              moveHtml: "<p>Overflow text</p>",
              cursorInMoved: true,
              cursorOffset: 5,
            }),
        },
        "Trigger Overflow"
      )
    );
  },
}));

import NoteWriter from "./components/NoteWriter";

function typeIntoTextarea(textarea, value) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  ).set;
  nativeSetter.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("NoteWriter Component Integration Tests", () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it("Page 1 text is preserved when clicking 'New Page' (Bug 2 Fix)", async () => {
    await act(async () => {
      root.render(
        React.createElement(NoteWriter, {
          noteId: null,
          partitions: [],
          initialPartitionId: "",
          initialTitle: "My Note",
          initialContent: "",
          initialCreatedAt: null,
          initialUpdatedAt: null,
          onSave: vi.fn(),
          onUpdateNote: vi.fn(),
          onCreated: vi.fn(),
          onClose: vi.fn(),
        })
      );
    });

    // Check editor is rendered
    const textarea = container.querySelector('[data-testid="editor-textarea"]');
    expect(textarea).not.toBeNull();

    // Type text on Page 1
    await act(async () => {
      typeIntoTextarea(textarea, "<p>Some important text that I have typed...</p>");
    });

    // Verify textarea shows Page 1 text
    expect(textarea.value).toBe("<p>Some important text that I have typed...</p>");

    // Find 'New Page' button
    const newPageBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent.includes("New Page")
    );
    expect(newPageBtn).not.toBeNull();

    // Click 'New Page'
    await act(async () => {
      newPageBtn.click();
    });

    // We are now on Page 2, which should be empty
    const page2Textarea = container.querySelector('[data-testid="editor-textarea"]');
    expect(page2Textarea.value).toBe("");

    // Find 'Prev' button to navigate back to Page 1
    const prevBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent.includes("Prev")
    );
    expect(prevBtn).not.toBeNull();

    // Click 'Prev' to go back to Page 1
    await act(async () => {
      prevBtn.click();
    });

    // Verify Page 1 still contains the original important text!
    const page1ReturnedTextarea = container.querySelector('[data-testid="editor-textarea"]');
    expect(page1ReturnedTextarea.value).toBe("<p>Some important text that I have typed...</p>");
  });

  it("Saves all pages and does not lose content on save (Bug 1 Fix)", async () => {
    mockCreateNote.mockResolvedValueOnce({
      id: "note-created-1",
      title: "My Multi-Page Note",
      content: "<p>P1</p><p>P2</p>",
    });
    mockCreatePage.mockImplementation(async (noteId, content, pageNum) => ({
      id: `page-db-${pageNum}`,
      note_id: noteId,
      page_number: pageNum,
      content,
    }));

    const onCreated = vi.fn();
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        React.createElement(NoteWriter, {
          noteId: null,
          partitions: [],
          initialPartitionId: "",
          initialTitle: "My Multi-Page Note",
          initialContent: "",
          initialCreatedAt: null,
          initialUpdatedAt: null,
          onSave: vi.fn(),
          onUpdateNote: vi.fn(),
          onCreated,
          onClose,
        })
      );
    });

    // Type on Page 1
    const textarea = container.querySelector('[data-testid="editor-textarea"]');
    await act(async () => {
      typeIntoTextarea(textarea, "<p>P1 content</p>");
    });

    // Add Page 2
    const newPageBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent.includes("New Page")
    );
    await act(async () => {
      newPageBtn.click();
    });

    // Type on Page 2
    const page2Textarea = container.querySelector('[data-testid="editor-textarea"]');
    await act(async () => {
      typeIntoTextarea(page2Textarea, "<p>P2 content</p>");
    });

    // Click 'Save Note'
    const saveBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent.includes("Save Note")
    );
    await act(async () => {
      saveBtn.click();
    });

    // Verify Note was created with joined content
    expect(mockCreateNote).toHaveBeenCalledWith("My Multi-Page Note", "<p>P1 content</p><p>P2 content</p>", null);

    // Verify BOTH Page 1 and Page 2 were created in the database
    expect(mockCreatePage).toHaveBeenCalledTimes(2);
    expect(mockCreatePage).toHaveBeenNthCalledWith(1, "note-created-1", "<p>P1 content</p>", 1);
    expect(mockCreatePage).toHaveBeenNthCalledWith(2, "note-created-1", "<p>P2 content</p>", 2);
  });

  it("Preserves content when auto-overflow occurs", async () => {
    await act(async () => {
      root.render(
        React.createElement(NoteWriter, {
          noteId: null,
          partitions: [],
          initialPartitionId: "",
          initialTitle: "Overflow Test Note",
          initialContent: "",
          initialCreatedAt: null,
          initialUpdatedAt: null,
          onSave: vi.fn(),
          onUpdateNote: vi.fn(),
          onCreated: vi.fn(),
          onClose: vi.fn(),
        })
      );
    });

    // Trigger overflow simulation (keeps '<p>Kept text</p>', moves '<p>Overflow text</p>')
    const overflowBtn = container.querySelector('[data-testid="trigger-overflow-btn"]');
    await act(async () => {
      overflowBtn.click();
    });

    // Since cursorInMoved was true, it should now be on Page 2 with the overflow text
    const page2Textarea = container.querySelector('[data-testid="editor-textarea"]');
    expect(page2Textarea.value).toBe("<p>Overflow text</p>");

    // Navigate back to Page 1
    const prevBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent.includes("Prev")
    );
    await act(async () => {
      prevBtn.click();
    });

    // Page 1 has kept text
    const page1Textarea = container.querySelector('[data-testid="editor-textarea"]');
    expect(page1Textarea.value).toBe("<p>Kept text</p>");
  });

  it("Restores and edits an existing multi-page note properly", async () => {
    mockFetchPages.mockResolvedValueOnce([
      { id: "page-1", note_id: "existing-note-1", page_number: 1, content: "<p>Original Page 1</p>" },
      { id: "page-2", note_id: "existing-note-1", page_number: 2, content: "<p>Original Page 2</p>" },
    ]);
    mockUpdateNote.mockResolvedValueOnce({ id: "existing-note-1", title: "Existing Note" });
    mockUpdatePage.mockResolvedValueOnce({ id: "page-1", content: "<p>Original Page 1</p>", page_number: 1 });
    mockUpdatePage.mockResolvedValueOnce({ id: "page-2", content: "<p>Original Page 2 - Edited</p>", page_number: 2 });

    const onSave = vi.fn();

    await act(async () => {
      root.render(
        React.createElement(NoteWriter, {
          noteId: "existing-note-1",
          partitions: [],
          initialPartitionId: "",
          initialTitle: "Existing Note",
          initialContent: "<p>Original Page 1</p><p>Original Page 2</p>",
          initialCreatedAt: "2026-01-01T00:00:00Z",
          initialUpdatedAt: "2026-01-01T00:00:00Z",
          onSave,
          onUpdateNote: vi.fn(),
          onCreated: vi.fn(),
          onClose: vi.fn(),
        })
      );
    });

    // Verify Page 1 content is loaded
    const page1Textarea = container.querySelector('[data-testid="editor-textarea"]');
    expect(page1Textarea.value).toBe("<p>Original Page 1</p>");

    // Navigate to Page 2
    const nextBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent.includes("Next")
    );
    await act(async () => {
      nextBtn.click();
    });

    // Verify Page 2 content is loaded
    const page2Textarea = container.querySelector('[data-testid="editor-textarea"]');
    expect(page2Textarea.value).toBe("<p>Original Page 2</p>");

    // Edit Page 2
    await act(async () => {
      typeIntoTextarea(page2Textarea, "<p>Original Page 2 - Edited</p>");
    });

    // Click Save Note
    const saveBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent.includes("Save Note")
    );
    await act(async () => {
      saveBtn.click();
    });

    // Expect updatePage called for both pages
    expect(mockUpdatePage).toHaveBeenCalledWith("page-1", "<p>Original Page 1</p>", 1);
    expect(mockUpdatePage).toHaveBeenCalledWith("page-2", "<p>Original Page 2 - Edited</p>", 2);

    // Expect onSave called with joined content
    expect(onSave).toHaveBeenCalledWith("Existing Note", "<p>Original Page 1</p><p>Original Page 2 - Edited</p>", null);
  });
});
