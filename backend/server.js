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

// ─── PARTITIONS ────────────────────────────────────────────────

app.get("/api/partitions", async (req, res) => {
  try {
    const partitions = await Partition.find().sort({name:1});
    const partitionsWithCounts = await Promise.all(
      partitions.map(async (partition) => {
        const noteCount = await Note.countDocuments({ partition_id: partition._id });
        return {
          ...partition.toObject(),
          note_count: noteCount
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

    // Create the partition in MongoDB
    const partition = await Partition.create({ name: name.trim() });

    // Add note_count = 0 (same as your SQL version)
    const responsePartition = {
      ...partition.toObject(),
      note_count: 0
    };

    res.json(responsePartition);
  } catch (error) {
    console.error("Error creating partition:", error);
    res.status(500).json({ error: "Failed to create partition" });
  }
});


app.put("/api/partitions/:id", async (req, res) => {
  try {
    const { name } = req.body;
    const id = req.params.id;

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Partition name is required" });
    }

    const updatedPartition = await Partition.findByIdAndUpdate(
      id,
      { name: name.trim() },
      { new: true } // return updated document
    );

    if (!updatedPartition) {
      return res.status(404).json({ error: "Partition not found" });
    }

    res.json(updatedPartition);
  } catch (error) {
    console.error("Error updating partition:", error);
    res.status(500).json({ error: "Failed to update partition" });
  }
});


app.delete("/api/partitions/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // Delete the partition
    const deletedPartition = await Partition.findByIdAndDelete(id);

    if (!deletedPartition) {
      return res.status(404).json({ error: "Partition not found" });
    }

    // Optional: delete notes belonging to this partition
    await Note.deleteMany({ partition_id: id });

    res.json(deletedPartition);
  } catch (error) {
    console.error("Error deleting partition:", error);
    res.status(500).json({ error: "Failed to delete partition" });
  }
});
// ─── NOTES ─────────────────────────────────────────────────────

app.get("/api/notes", async (req, res) => {
  try {
    const { partition_id } = req.query;

    let filter = {};
    if (partition_id) {
      filter.partition_id = partition_id;
    }

    // Fetch notes (with optional filtering)
    const notes = await Note.find(filter)
      .sort({ _id: -1 }) // same as ORDER BY n.id DESC
      .lean();

    // Fetch partition names for each note
    const notesWithPartitionNames = await Promise.all(
      notes.map(async (note) => {
        const partition = await Partition.findById(note.partition_id).lean();
        return {
          ...note,
          partition_name: partition ? partition.name : null
        };
      })
    );

    res.json(notesWithPartitionNames);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

app.post("/api/notes", async (req, res) => {
  try {
    const { title, content, partition_id } = req.body;

    // Create the note
    const note = await Note.create({
      title: title || null,
      content,
      partition_id: partition_id || null
    });

    // Fetch partition name (same as SQL SELECT name FROM partitions WHERE id = $3)
    let partitionName = null;
    if (partition_id) {
      const partition = await Partition.findById(partition_id).lean();
      partitionName = partition ? partition.name : null;
    }

    // Build response identical to SQL RETURNING *
    const responseNote = {
      ...note.toObject(),
      partition_name: partitionName
    };

    res.json(responseNote);
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).json({ error: "Failed to create note" });
  }
});

app.put("/api/notes/:id", async (req, res) => {
  try {
    const { title, content, partition_id } = req.body;
    const id = req.params.id;

    const update = {
      title: title !== undefined ? title : null,
      content,
      updated_at: new Date(),
    };
    if (partition_id !== undefined) {
      update.partition_id = partition_id || null;
    }

    const updatedNote = await Note.findByIdAndUpdate(id, update, { new: true });

    let partitionName = null;
    if (updatedNote.partition_id) {
      const partition = await Partition.findById(updatedNote.partition_id).lean();
      partitionName = partition ? partition.name : null;
    }

    res.json({
      ...updatedNote.toObject(),
      partition_name: partitionName,
    });
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ error: "Failed to update note" });
  }
});

app.delete("/api/notes/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const deletedNote = await Note.findByIdAndDelete(id);

    // Cascade: delete pages and their sticky notes (replaces PostgreSQL ON DELETE CASCADE)
    const pages = await Page.find({ note_id: id });
    const pageIds = pages.map((p) => p._id);
    if (pageIds.length > 0) {
      await StickyNote.deleteMany({ page_id: { $in: pageIds } });
    }
    await Page.deleteMany({ note_id: id });

    res.json(deletedNote);
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

// ─── NOTE PAGES ────────────────────────────────────────────────

app.get("/api/notes/:noteId/pages", async (req, res) => {
  try {
    const { noteId } = req.params;
    const result = await pool.query(
      `SELECT * FROM public.note_pages
       WHERE note_id = $1
       ORDER BY page_number ASC`,
      [noteId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching pages:", error);
    res.status(500).json({ error: "Failed to fetch pages" });
  }
});

app.post("/api/notes/:noteId/pages", async (req, res) => {
  try {
    const { noteId } = req.params;
    const { content, page_number } = req.body;
    const result = await pool.query(
      `INSERT INTO public.note_pages (note_id, page_number, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [noteId, page_number || 1, content || ""]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error creating page:", error);
    res.status(500).json({ error: "Failed to create page" });
  }
});

app.get("/api/pages/:pageId", async (req, res) => {
  try {
    const { pageId } = req.params;
    const result = await pool.query(
      "SELECT * FROM public.note_pages WHERE id = $1",
      [pageId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Page not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching page:", error);
    res.status(500).json({ error: "Failed to fetch page" });
  }
});

app.put("/api/pages/:pageId", async (req, res) => {
  try {
    const { pageId } = req.params;
    const { content } = req.body;
    const result = await pool.query(
      `UPDATE public.note_pages
       SET content = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [content, pageId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Page not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating page:", error);
    res.status(500).json({ error: "Failed to update page" });
  }
});

app.delete("/api/pages/:pageId", async (req, res) => {
  try {
    const { pageId } = req.params;
    const result = await pool.query(
      "DELETE FROM public.note_pages WHERE id = $1 RETURNING *",
      [pageId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Page not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error deleting page:", error);
    res.status(500).json({ error: "Failed to delete page" });
  }
});

// ─── STICKY NOTES ──────────────────────────────────────────────

app.get("/api/pages/:pageId/sticky-notes", async (req, res) => {
  try {
    const { pageId } = req.params;
    const result = await pool.query(
      `SELECT * FROM public.sticky_notes
       WHERE page_id = $1
       ORDER BY created_at ASC`,
      [pageId]
    );
    res.json(result.rows);
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
    const result = await pool.query(
      `INSERT INTO public.sticky_notes (page_id, content)
       VALUES ($1, $2)
       RETURNING *`,
      [pageId, content.trim()]
    );
    res.json(result.rows[0]);
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
    const result = await pool.query(
      `UPDATE public.sticky_notes
       SET content = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [content.trim(), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Sticky note not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating sticky note:", error);
    res.status(500).json({ error: "Failed to update sticky note" });
  }
});

app.delete("/api/sticky-notes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM public.sticky_notes WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Sticky note not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error deleting sticky note:", error);
    res.status(500).json({ error: "Failed to delete sticky note" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
