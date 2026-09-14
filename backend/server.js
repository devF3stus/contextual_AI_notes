const connectDB = require("./db");
connectDB();
const express = require("express");
const cors = require("cors");
const Note = require("./models/Note");
const Partition = require("./models/Partition");
const Page = require("./models/Page");
const StickyNote = require("./models/StickyNote");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ─── HELPERS ──────────────────────────────────────────────────

function normalizeTimestamps(doc) {
  if (!doc.updated_at) {
    doc.updated_at = doc.created_at;
  }
  if (doc.created_at instanceof Date) {
    doc.created_at = doc.created_at.toISOString();
  }
  if (doc.updated_at instanceof Date) {
    doc.updated_at = doc.updated_at.toISOString();
  }
  return doc;
}

async function getPartitionName(partitionId) {
  if (!partitionId) return null;
  const partition = await Partition.findById(partitionId).select("name");
  return partition ? partition.name : null;
}

// ─── PARTITIONS ────────────────────────────────────────────────

app.get("/api/partitions", async (req, res) => {
  try {
    const partitions = await Partition.find().sort({ name: 1 });
    const partitionsWithCounts = await Promise.all(
      partitions.map(async (partition) => {
        const noteCount = await Note.countDocuments({ partition_id: partition._id });
        return {
          ...partition.toObject(),
          note_count: noteCount,
        };
      })
    );
    res.json(partitionsWithCounts);
  } catch (error) {
    console.error("Error fetching partitions:", error);
    res.status(500).json({ error: "Failed to fetch partitions" });
  }
});

app.post("/api/partitions", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Partition name is required" });
    }
    const partition = await Partition.create({ name: name.trim() });
    res.json({
      ...partition.toObject(),
      note_count: 0,
    });
  } catch (error) {
    console.error("Error creating partition:", error);
    res.status(500).json({ error: "Failed to create partition" });
  }
});

app.put("/api/partitions/:id", async (req, res) => {
  try {
    const { name } = req.body;
    const { id } = req.params;
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Partition name is required" });
    }
    const partition = await Partition.findByIdAndUpdate(
      id,
      { name: name.trim() },
      { new: true }
    );
    if (!partition) {
      return res.status(404).json({ error: "Partition not found" });
    }
    res.json(partition.toObject());
  } catch (error) {
    console.error("Error updating partition:", error);
    res.status(500).json({ error: "Failed to update partition" });
  }
});

app.delete("/api/partitions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const partition = await Partition.findByIdAndDelete(id);
    if (!partition) {
      return res.status(404).json({ error: "Partition not found" });
    }
    res.json(partition.toObject());
  } catch (error) {
    console.error("Error deleting partition:", error);
    res.status(500).json({ error: "Failed to delete partition" });
  }
});

// ─── NOTES ─────────────────────────────────────────────────────

app.get("/api/notes", async (req, res) => {
  try {
    const { partition_id } = req.query;
    const filter = {};
    if (partition_id) {
      filter.partition_id = partition_id;
    }
    const notes = await Note.find(filter).sort({ _id: -1 });

    const partitionIds = [...new Set(notes.map((n) => n.partition_id).filter(Boolean))];
    const partitions =
      partitionIds.length > 0
        ? await Partition.find({ _id: { $in: partitionIds } }).select("name")
        : [];
    const partitionMap = {};
    partitions.forEach((p) => {
      partitionMap[p._id.toString()] = p.name;
    });

    const enrichedNotes = notes.map((note) => {
      const noteObj = normalizeTimestamps(note.toObject());
      noteObj.partition_name = noteObj.partition_id
        ? partitionMap[noteObj.partition_id.toString()] || null
        : null;
      return noteObj;
    });

    res.json(enrichedNotes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

app.post("/api/notes", async (req, res) => {
  try {
    const { title, content, partition_id } = req.body;
    const now = new Date();
    const note = await Note.create({
      title: title !== undefined ? title : null,
      content: content || "",
      partition_id: partition_id || null,
      created_at: now,
      updated_at: now,
    });

    const noteObj = normalizeTimestamps(note.toObject());
    noteObj.partition_name = noteObj.partition_id
      ? await getPartitionName(noteObj.partition_id)
      : null;

    res.json(noteObj);
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).json({ error: "Failed to create note" });
  }
});

app.put("/api/notes/:id", async (req, res) => {
  try {
    const { title, content, partition_id } = req.body;
    const { id } = req.params;

    const update = {
      title: title !== undefined ? title : null,
      content,
      updated_at: new Date(),
    };
    if (partition_id !== undefined) {
      update.partition_id = partition_id || null;
    }

    const note = await Note.findByIdAndUpdate(id, update, { new: true });
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    const noteObj = normalizeTimestamps(note.toObject());
    noteObj.partition_name = noteObj.partition_id
      ? await getPartitionName(noteObj.partition_id)
      : null;

    res.json(noteObj);
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ error: "Failed to update note" });
  }
});

app.delete("/api/notes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const note = await Note.findByIdAndDelete(id);
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    const pages = await Page.find({ note_id: id });
    const pageIds = pages.map((p) => p._id);
    if (pageIds.length > 0) {
      await StickyNote.deleteMany({ page_id: { $in: pageIds } });
    }
    await Page.deleteMany({ note_id: id });

    res.json(normalizeTimestamps(note.toObject()));
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

// ─── NOTE PAGES ────────────────────────────────────────────────

app.get("/api/notes/:noteId/pages", async (req, res) => {
  try {
    const { noteId } = req.params;
    const pages = await Page.find({ note_id: noteId }).sort({ page_number: 1 });
    res.json(pages.map((p) => normalizeTimestamps(p.toObject())));
  } catch (error) {
    console.error("Error fetching pages:", error);
    res.status(500).json({ error: "Failed to fetch pages" });
  }
});

app.post("/api/notes/:noteId/pages", async (req, res) => {
  try {
    const { noteId } = req.params;
    const { content, page_number } = req.body;
    const now = new Date();
    const page = await Page.create({
      note_id: noteId,
      page_number: page_number || 1,
      content: content || "",
      created_at: now,
      updated_at: now,
    });
    res.json(normalizeTimestamps(page.toObject()));
  } catch (error) {
    console.error("Error creating page:", error);
    res.status(500).json({ error: "Failed to create page" });
  }
});

app.get("/api/pages/:pageId", async (req, res) => {
  try {
    const { pageId } = req.params;
    const page = await Page.findById(pageId);
    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }
    res.json(normalizeTimestamps(page.toObject()));
  } catch (error) {
    console.error("Error fetching page:", error);
    res.status(500).json({ error: "Failed to fetch page" });
  }
});

app.put("/api/pages/:pageId", async (req, res) => {
  try {
    const { pageId } = req.params;
    const { content } = req.body;
    const page = await Page.findByIdAndUpdate(
      pageId,
      { content, updated_at: new Date() },
      { new: true }
    );
    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }
    res.json(normalizeTimestamps(page.toObject()));
  } catch (error) {
    console.error("Error updating page:", error);
    res.status(500).json({ error: "Failed to update page" });
  }
});

app.delete("/api/pages/:pageId", async (req, res) => {
  try {
    const { pageId } = req.params;
    const page = await Page.findByIdAndDelete(pageId);
    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    await StickyNote.deleteMany({ page_id: pageId });

    res.json(normalizeTimestamps(page.toObject()));
  } catch (error) {
    console.error("Error deleting page:", error);
    res.status(500).json({ error: "Failed to delete page" });
  }
});

// ─── STICKY NOTES ──────────────────────────────────────────────

app.get("/api/pages/:pageId/sticky-notes", async (req, res) => {
  try {
    const { pageId } = req.params;
    const stickyNotes = await StickyNote.find({ page_id: pageId }).sort({
      created_at: 1,
    });
    res.json(stickyNotes.map((s) => normalizeTimestamps(s.toObject())));
  } catch (error) {
    console.error("Error fetching sticky notes:", error);
    res.status(500).json({ error: "Failed to fetch sticky notes" });
  }
});

app.post("/api/pages/:pageId/sticky-notes", async (req, res) => {
  try {
    const { pageId } = req.params;
    const { content } = req.body;
    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Sticky note content is required" });
    }
    const now = new Date();
    const stickyNote = await StickyNote.create({
      page_id: pageId,
      content: content.trim(),
      created_at: now,
      updated_at: now,
    });
    res.json(normalizeTimestamps(stickyNote.toObject()));
  } catch (error) {
    console.error("Error creating sticky note:", error);
    res.status(500).json({ error: "Failed to create sticky note" });
  }
});

app.put("/api/sticky-notes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Sticky note content is required" });
    }
    const stickyNote = await StickyNote.findByIdAndUpdate(
      id,
      { content: content.trim(), updated_at: new Date() },
      { new: true }
    );
    if (!stickyNote) {
      return res.status(404).json({ error: "Sticky note not found" });
    }
    res.json(normalizeTimestamps(stickyNote.toObject()));
  } catch (error) {
    console.error("Error updating sticky note:", error);
    res.status(500).json({ error: "Failed to update sticky note" });
  }
});

app.delete("/api/sticky-notes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const stickyNote = await StickyNote.findByIdAndDelete(id);
    if (!stickyNote) {
      return res.status(404).json({ error: "Sticky note not found" });
    }
    res.json(normalizeTimestamps(stickyNote.toObject()));
  } catch (error) {
    console.error("Error deleting sticky note:", error);
    res.status(500).json({ error: "Failed to delete sticky note" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
