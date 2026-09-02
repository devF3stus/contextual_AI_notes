import { useEffect,useState } from "react";

function App() {
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);
  const [editingId, setEditingId] = useState(null); 
  const [editedContent, setEditedContent] = useState("");


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
   
  async function updateNote(id) {
  const response = await fetch(`http://localhost:5000/api/notes/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: editedContent,
    }),
  });

  const updatedNote = await response.json();

  setNotes(
    notes.map((currentNote) =>
      currentNote.id === id ? updatedNote : currentNote
    )
  );

  setEditingId(null);
  setEditedContent("");
}
  
async function deleteNote(id) {
  const response = await fetch(`http://localhost:5000/api/notes/${id}`, {
    method: "DELETE",
  });

  await response.json();

  setNotes(
    notes.filter((currentNote) => currentNote.id !== id)
  );
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
          {editingId === currentNote.id ? (
                  <textarea value={editedContent} onChange={(event) => setEditedContent(event.target.value)} />
          ) : (
          <p>{currentNote.content}</p>
          )}
          
        {editingId === currentNote.id ? (
          <button onClick={() => updateNote(currentNote.id)}> 
            Save
          </button>
          ) : (
          <button
            onClick={() => {
              setEditingId(currentNote.id);
              setEditedContent(currentNote.content);
            }}
          >
            Edit
          </button>
        )}
        <button onClick={() => deleteNote(currentNote.id)}>
          Delete
        </button>
                </div>
      ))}
    </div>
  );
}

export default App;