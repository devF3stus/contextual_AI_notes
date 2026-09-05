const pool = require("./db");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ─── PARTITIONS ────────────────────────────────────────────────

app.get("/api/partitions", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, COUNT(n.id)::int AS note_count
       FROM public.partitions p
       LEFT JOIN public.notes n ON n.partition_id = p.id
       GROUP BY p.id
       ORDER BY p.name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching partitions:", error);
    res.status(500).json({ error: "Failed to fetch partitions" });
  }
});

app.post("/api/partitions", async (req, res) => {
  try {
    console.log("POST /api/partitions body:", req.body);
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Partition name is required" });
    }
    const result = await pool.query(
      "INSERT INTO public.partitions (name) VALUES ($1) RETURNING *",
      [name.trim()]
    );
    const partition = result.rows[0];
    partition.note_count = 0;
    console.log("POST /api/partitions success:", partition);
    res.json(partition);
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
    const result = await pool.query(
      "UPDATE public.partitions SET name = $1 WHERE id = $2 RETURNING *",
      [name.trim(), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Partition not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating partition:", error);
    res.status(500).json({ error: "Failed to update partition" });
  }
});

app.delete("/api/partitions/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await pool.query(
      "DELETE FROM public.partitions WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Partition not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error deleting partition:", error);
    res.status(500).json({ error: "Failed to delete partition" });
  }
});

// ─── NOTES ─────────────────────────────────────────────────────

app.get("/api/notes", async (req, res) => {
  try {
    const { partition_id } = req.query;
    let query = `
      SELECT n.*, p.name AS partition_name
      FROM public.notes n
      LEFT JOIN public.partitions p ON n.partition_id = p.id
    `;
    const params = [];
    if (partition_id) {
      params.push(partition_id);
      query += ` WHERE n.partition_id = $1`;
    }
    query += " ORDER BY n.id DESC";
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

app.post("/api/notes", async (req, res) => {
  try {
    const { content, partition_id } = req.body;
    const result = await pool.query(
      `INSERT INTO public.notes (content, partition_id)
       VALUES ($1, $2)
       RETURNING *, (SELECT name FROM public.partitions WHERE id = $2) AS partition_name`,
      [content, partition_id || null]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).json({ error: "Failed to create note" });
  }
});

app.put("/api/notes/:id", async (req, res) => {
  try {
    const { content, partition_id } = req.body;
    const id = req.params.id;

    if (partition_id !== undefined) {
      const result = await pool.query(
        `UPDATE public.notes
         SET content = $1, partition_id = $2
         WHERE id = $3
         RETURNING *, (SELECT name FROM public.partitions WHERE id = $2) AS partition_name`,
        [content, partition_id, id]
      );
      return res.json(result.rows[0]);
    }

    const result = await pool.query(
      `UPDATE public.notes
       SET content = $1
       WHERE id = $2
       RETURNING *, (SELECT name FROM public.partitions WHERE id = partition_id) AS partition_name`,
      [content, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ error: "Failed to update note" });
  }
});

app.delete("/api/notes/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await pool.query(
      "DELETE FROM public.notes WHERE id = $1 RETURNING *",
      [id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
