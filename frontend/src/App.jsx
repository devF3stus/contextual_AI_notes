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
    <div className="min-h-screen bg-gray-100 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Contextual AI Notes
          </h1>
            <p className="mb-8 text-gray-600">
              Capture your thoughts and keep your ideas organized.
            </p> 
        <div className="mb-10 rounded-xl bg-white p-6 shadow-sm">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Write your note..."
            className= "w-full resize-none rounded-lg border border-gray-300 p-4 outline-none focus:border-blue-500"
            rows= "5"
          />

          <button onClick={addNote}
            className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
            >
              Add Note
          </button>
        </div>

        <h2 className="mb-4 text-2xl font-semibold text-gray-900">Your Notes</h2>
        <div className="space-y-4">
             {notes.map((currentNote) => (
        <div 
          key={currentNote.id}
          className="rounded-xl bg-white p-5 shadow-sm"
          >
            {editingId === currentNote.id ? (
                    <textarea value={editedContent} onChange={(event) => setEditedContent(event.target.value)} 
                    className="w-full resize-none rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
                    rows="4"
                    />
            ) : (
            <p className="text-gray-800">
              {currentNote.content}
            </p>
            )}
        <div className="mt-4 flex gap-3">  
          {editingId === currentNote.id ? (
            <button onClick={() => updateNote(currentNote.id)}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              > 
                Save
            </button>
            ) : (
            <button
              onClick={() => {
                setEditingId(currentNote.id);
                setEditedContent(currentNote.content);
              }}
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
            >
              Edit
            </button>
          )}
          <button onClick={() => deleteNote(currentNote.id)}
            className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
              >
              Delete
          </button>
        </div>
        </div>
    
      ))}
    
  

    </div>
  </div>
  </div> 
  );
}

export default App;