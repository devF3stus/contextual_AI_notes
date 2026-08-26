const pool = require("./db");
const express = require("express"); //imports express into Node.js application
const cors = require("cors"); //imports cors into Node.js application

const app = express(); //creates our express application
app.use(cors());
app.use(express.json()); // passes incoming requests with JSON payloads to the express application

const PORT = process.env.PORT || 5000; //sets the port for the server to listen on, either from an environment variable or defaulting to 5000


app.get("/api/notes", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM notes ORDER BY id ASC");

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});


app.post("/api/notes", async (req, res) => {
  try {
    const { content } = req.body;

    const result = await pool.query(
      "INSERT INTO notes (content) VALUES ($1) RETURNING *",
      [content]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).json({ error: "Failed to create note" });
  }
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
