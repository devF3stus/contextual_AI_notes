import { useEffect,useState } from "react";

function App() {
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);

  useEffect(() => {
  async function getNotes() {
    const response = await fetch("http://localhost:5000/api/notes");

    const data = await response.json();

    setNotes(data);
  }

  getNotes();
}, []);

  async function addNote() {
    if (note.trim() === "") {
      return;
    }

    const response = await fetch("http://localhost:5000/api/notes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: note,
      }),
    });

    const newNote = await response.json();

    setNotes([...notes, newNote]);
    setNote("");
  }

  return (
    <div>
      <h1>Contextual AI Notes</h1>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Write your note..."
      />

      <button onClick={addNote}>Add Note</button>

      <h2>Your Notes</h2>

      {notes.map((currentNote) => (
        <div key={currentNote.id}>
          <p>{currentNote.content}</p>
        </div>
      ))}
    </div>
  );
}

export default App;