import { useEffect, useState } from "react";
import axios from "axios";
import { getAuthToken, signOutUser } from "../config/amplify";
import { getCurrentUser } from "@aws-amplify/auth";
import { useRouter } from "next/router";

export default function Dashboard() {
  const [notes, setNotes] = useState([]);
  const [editingNote, setEditingNote] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        // Check if user is authenticated. Redirect to sign-in page if not authenticated
        const user = await getCurrentUser().catch(() => null);
        if (!user) {
          console.warn("User is not authenticated. Redirecting to sign-in...");
          router.push("/signin");
          return;
        }

        const token = await getAuthToken();
        if (!token) {
          console.error("Failed to retrieve authentication token.");
          router.push("/signin");
          return;
        }

        const response = await axios.get("http://localhost:5001/notes", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setNotes(response.data);
      } catch (error) {
        console.error("Error fetching notes:", error);
      }
    };

    fetchNotes();
  }, []);

  const handleSignOut = async () => {
    await signOutUser();
    router.push("/signin");
  };

  const handleDelete = async (id) => {
    try {
      const token = await getAuthToken();
      await axios.delete(`http://localhost:5001/notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes(notes.filter((note) => note.id !== id)); // Update UI after deletion
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const handleUpdate = async () => {
    try {
      const token = await getAuthToken();
      const response = await axios.put(`http://localhost:5001/notes/${editingNote}`, {
        title: editTitle,
        content: editContent,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotes(notes.map((note) => (note.id === editingNote ? response.data : note)));
      setEditingNote(null);
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };

  return (
    <div className="p-10">
      <h2 className="text-2xl">Your Notes</h2>
      <button className="mt-4 bg-red-500 text-white px-4 py-2" onClick={handleSignOut}>
        Sign Out
      </button>
      <ul>
        {notes.map((note) => (
          <li key={note.id} className="border p-2 mt-2 flex flex-col">
            {editingNote === note.id ? (
              <>
                <input
                  type="text"
                  className="border p-1"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <textarea
                  className="border p-1 mt-2"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
                <button className="mt-2 bg-green-500 text-white px-4 py-1" onClick={handleUpdate}>
                  Save
                </button>
              </>
            ) : (
              <>
                <strong>{note.title}</strong>: {note.content}
                <div className="mt-2">
                  <button className="bg-yellow-500 text-white px-2 py-1 mr-2" onClick={() => handleEdit(note)}>
                    Edit
                  </button>
                  <button className="bg-red-500 text-white px-2 py-1" onClick={() => handleDelete(note.id)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
