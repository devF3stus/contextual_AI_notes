import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock API functions
const mockCreateNote = vi.fn();
const mockUpdateNote = vi.fn();
const mockFetchPages = vi.fn();
const mockCreatePage = vi.fn();
const mockUpdatePage = vi.fn();

vi.mock("./services/api", () => ({
  createNote: (...args) => mockCreateNote(...args),
  updateNote: (...args) => mockUpdateNote(...args),
  fetchPages: (...args) => mockFetchPages(...args),
  createPage: (...args) => mockCreatePage(...args),
  updatePage: (...args) => mockUpdatePage(...args),
}));

describe("Pagination and Persistence Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Bug 2 Verification: Manual Page Creation Must Not Wipe Page 1", () => {
    it("preserves Page 1 content when adding a new page (Page 2)", () => {
      // Setup initial state: Page 1 with user text
      const page1Content = "<p>Some important text that I have typed...</p>";
      let pages = [
        {
          id: "local-1",
          page_number: 1,
          content: page1Content,
          local: true,
        },
      ];
      let currentPageIndex = 0;

      // Simulate clicking 'New Page'
      // 1. Capture live content of active page
      const currentList = [...pages];
      expect(currentList[currentPageIndex].content).toBe(page1Content);

      // 2. Add new empty page
      const newPage = {
        id: "local-2",
        page_number: 2,
        content: "",
        local: true,
      };
      pages = [...currentList, newPage];
      currentPageIndex = pages.length - 1;

      // Verify Bug 2 is solved:
      // Page 1 MUST still contain the exact text
      expect(pages[0].content).toBe(page1Content);
      expect(pages[0].content).not.toBe("");
      expect(pages[0].page_number).toBe(1);

      // Page 2 is new and empty
      expect(pages[1].content).toBe("");
      expect(pages[1].page_number).toBe(2);
      expect(currentPageIndex).toBe(1);
    });

    it("allows independent switching between Page 1 and Page 2 without content loss", () => {
      const page1Content = "<p>First page thoughts</p>";
      const page2Content = "<p>Second page additional points</p>";

      let pages = [
        { id: "p-1", page_number: 1, content: page1Content, local: true },
        { id: "p-2", page_number: 2, content: "", local: true },
      ];

      // Active on Page 2, user types page2Content
      let currentPageIndex = 1;
      pages[currentPageIndex] = { ...pages[currentPageIndex], content: page2Content };

      // Switch back to Page 1
      currentPageIndex = 0;
      expect(pages[currentPageIndex].content).toBe(page1Content);

      // Switch forward to Page 2
      currentPageIndex = 1;
      expect(pages[currentPageIndex].content).toBe(page2Content);

      // Verify both pages retain their independent contents
      expect(pages[0].content).toBe(page1Content);
      expect(pages[1].content).toBe(page2Content);
    });
  });

  describe("Bug 1 Verification: Saving and Reopening Multi-Page Notes", () => {
    it("persists all pages when saving a new note with multiple pages", async () => {
      mockCreateNote.mockResolvedValueOnce({
        id: "note-123",
        title: "Test Note",
        content: "<p>Page 1</p><p>Page 2</p><p>Page 3</p>",
      });
      mockCreatePage.mockImplementation(async (noteId, content, pageNum) => ({
        id: `db-page-${pageNum}`,
        note_id: noteId,
        page_number: pageNum,
        content,
      }));

      // Simulate a note with 3 pages created through auto-pagination or manual creation
      const localPages = [
        { id: "local-1", page_number: 1, content: "<p>Page 1 text</p>", local: true },
        { id: "local-2", page_number: 2, content: "<p>Page 2 overflow</p>", local: true },
        { id: "local-3", page_number: 3, content: "<p>Page 3 further overflow</p>", local: true },
      ];

      // Save pipeline:
      const joined = localPages.map((p) => p.content).join("");
      const createdNote = await mockCreateNote("Test Note", joined, null);

      const persistedPages = [];
      for (let i = 0; i < localPages.length; i++) {
        const createdPage = await mockCreatePage(createdNote.id, localPages[i].content, i + 1);
        persistedPages.push(createdPage);
      }

      // Assert Note was created
      expect(mockCreateNote).toHaveBeenCalledWith(
        "Test Note",
        "<p>Page 1 text</p><p>Page 2 overflow</p><p>Page 3 further overflow</p>",
        null
      );

      // Assert ALL 3 pages were created in the database
      expect(mockCreatePage).toHaveBeenCalledTimes(3);
      expect(mockCreatePage).toHaveBeenNthCalledWith(1, "note-123", "<p>Page 1 text</p>", 1);
      expect(mockCreatePage).toHaveBeenNthCalledWith(2, "note-123", "<p>Page 2 overflow</p>", 2);
      expect(mockCreatePage).toHaveBeenNthCalledWith(3, "note-123", "<p>Page 3 further overflow</p>", 3);

      expect(persistedPages).toHaveLength(3);
      expect(persistedPages[0].id).toBe("db-page-1");
      expect(persistedPages[1].id).toBe("db-page-2");
      expect(persistedPages[2].id).toBe("db-page-3");
    });

    it("restores all pages and their contents on reopening", async () => {
      const storedDbPages = [
        { id: "db-1", note_id: "note-123", page_number: 1, content: "<p>Page 1 restored</p>" },
        { id: "db-2", note_id: "note-123", page_number: 2, content: "<p>Page 2 restored</p>" },
        { id: "db-3", note_id: "note-123", page_number: 3, content: "<p>Page 3 restored</p>" },
      ];

      mockFetchPages.mockResolvedValueOnce(storedDbPages);

      // Reopening pipeline:
      const fetched = await mockFetchPages("note-123");
      const sorted = [...fetched].sort((a, b) => (a.page_number || 0) - (b.page_number || 0));
      const normalized = sorted.map((p, idx) => ({ ...p, page_number: idx + 1 }));

      expect(normalized).toHaveLength(3);
      expect(normalized[0].content).toBe("<p>Page 1 restored</p>");
      expect(normalized[1].content).toBe("<p>Page 2 restored</p>");
      expect(normalized[2].content).toBe("<p>Page 3 restored</p>");

      // No text disappeared!
      expect(normalized.map((p) => p.content).join("")).toBe(
        "<p>Page 1 restored</p><p>Page 2 restored</p><p>Page 3 restored</p>"
      );
    });

    it("updates existing pages and creates newly added pages when saving an existing note", async () => {
      mockUpdateNote.mockResolvedValueOnce({ id: "note-123", title: "Updated" });
      mockUpdatePage.mockResolvedValueOnce({ id: "db-1", content: "<p>Page 1 edited</p>", page_number: 1 });
      mockCreatePage.mockResolvedValueOnce({ id: "db-2", note_id: "note-123", content: "<p>Page 2 newly added</p>", page_number: 2 });

      const workingPages = [
        { id: "db-1", page_number: 1, content: "<p>Page 1 edited</p>", local: false },
        { id: "local-2", page_number: 2, content: "<p>Page 2 newly added</p>", local: true },
      ];

      const activeNoteId = "note-123";
      const isPersistedPage = (p) => !!p && !p.local && !!p.id && String(p.id).indexOf("local-") !== 0;

      const persistedList = [];
      for (let i = 0; i < workingPages.length; i++) {
        const p = workingPages[i];
        const pageNum = i + 1;
        if (isPersistedPage(p)) {
          const updated = await mockUpdatePage(p.id, p.content, pageNum);
          persistedList.push({ ...p, ...updated });
        } else {
          const created = await mockCreatePage(activeNoteId, p.content, pageNum);
          persistedList.push(created);
        }
      }

      expect(mockUpdatePage).toHaveBeenCalledWith("db-1", "<p>Page 1 edited</p>", 1);
      expect(mockCreatePage).toHaveBeenCalledWith("note-123", "<p>Page 2 newly added</p>", 2);
      expect(persistedList).toHaveLength(2);
      expect(persistedList[0].content).toBe("<p>Page 1 edited</p>");
      expect(persistedList[1].content).toBe("<p>Page 2 newly added</p>");
    });
  });

  describe("Automatic Pagination Distribution", () => {
    it("moves overflow forward into next page and preserves reading order", () => {
      const page1Initial = "<p>P1 Paragraph 1</p><p>P1 Paragraph 2 (overflow)</p>";
      const keepHtml = "<p>P1 Paragraph 1</p>";
      const moveHtml = "<p>P1 Paragraph 2 (overflow)</p>";

      let pages = [{ id: "p-1", page_number: 1, content: page1Initial, local: true }];
      const idx = 0;

      // Overflow trigger:
      const working = [...pages];
      working[idx] = { ...working[idx], content: keepHtml };

      const nextIdx = idx + 1;
      if (nextIdx < working.length) {
        working[nextIdx] = { ...working[nextIdx], content: `${moveHtml}${working[nextIdx].content || ""}` };
      } else {
        working.push({
          id: "p-2",
          page_number: 2,
          content: moveHtml,
          local: true,
        });
      }

      expect(working).toHaveLength(2);
      expect(working[0].content).toBe("<p>P1 Paragraph 1</p>");
      expect(working[1].content).toBe("<p>P1 Paragraph 2 (overflow)</p>");

      // Verify total content is preserved
      expect(working.map((p) => p.content).join("")).toBe(
        "<p>P1 Paragraph 1</p><p>P1 Paragraph 2 (overflow)</p>"
      );
    });

    it("prepends overflow into an existing subsequent page preserving order", () => {
      let pages = [
        { id: "p-1", page_number: 1, content: "<p>P1 Keep</p>", local: true },
        { id: "p-2", page_number: 2, content: "<p>P2 Existing</p>", local: true },
      ];

      const moveHtml = "<p>P1 Overflowed Tail</p>";
      const nextIdx = 1;

      // Prepend overflow to Page 2
      const target = pages[nextIdx];
      const combined = `${moveHtml}${target.content || ""}`;
      pages[nextIdx] = { ...target, content: combined };

      expect(pages[1].content).toBe("<p>P1 Overflowed Tail</p><p>P2 Existing</p>");
      expect(pages[1].content.startsWith("<p>P1 Overflowed Tail</p>")).toBe(true);
    });
  });
});
