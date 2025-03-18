import { useEffect, useState } from "react";
import axios from "axios";
import { getAuthToken, signOutUser } from "../config/amplify";
import { getCurrentUser } from "@aws-amplify/auth";
import { useRouter } from "next/router";
import ReactMarkdown from "react-markdown";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "../components/SortableItem.tsx";

export default function Dashboard() {
  const [notes, setNotes] = useState([]);
  const [editingNote, setEditingNote] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const user = await getCurrentUser().catch(() => null);
        if (!user) {
          router.push("/signin");
          return;
        }

        const token = await getAuthToken();
        if (!token) {
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
      setNotes(notes.filter((note) => note.id !== id));
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
      const response = await axios.put(
        `http://localhost:5001/notes/${editingNote}`,
        {
          title: editTitle,
          content: editContent,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setNotes(notes.map((note) => (note.id === editingNote ? response.data : note)));
      setEditingNote(null);
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };

  const handleCreate = async () => {
    if (!newTitle || !newContent) {
      console.warn("Title and content cannot be empty.");
      return;
    }

    try {
      const token = await getAuthToken();
      const response = await axios.post(
        "http://localhost:5001/notes",
        {
          title: newTitle,
          content: newContent,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setNotes([...notes, response.data]);
      setNewTitle("");
      setNewContent("");
    } catch (error) {
      console.error("Error creating note:", error);
    }
  };

  // 🔹 Drag & Drop Handling
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = notes.findIndex((note) => note.id === active.id);
    const newIndex = notes.findIndex((note) => note.id === over.id);
    setNotes(arrayMove(notes, oldIndex, newIndex)); // UI only (no backend)
  };

  return (
    <div className="p-10">
      <h2 className="text-2xl">Your Notes</h2>
      <button className="mt-4 bg-red-500 text-white px-4 py-2" onClick={handleSignOut}>
        Sign Out
      </button>

      {/* 🔹 Create Note Section */}
      <div className="mt-6 p-4 border">
        <h3 className="text-xl mb-2">Create a New Note</h3>
        <input
          type="text"
          placeholder="Title"
          className="border p-2 w-full"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <textarea
          placeholder="Write in Markdown..."
          className="border p-2 w-full mt-2"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
        />
        <button className="mt-2 bg-blue-500 text-white px-4 py-2" onClick={handleCreate}>
          Add Note
        </button>
      </div>

      {/* Display Notes with Drag & Drop */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={notes.map((note) => note.id)} strategy={verticalListSortingStrategy}>
          <ul className="mt-4">
            {notes.map((note) => (
              <SortableItem key={note.id} id={note.id}>
                <li className="border p-2 mt-2 flex flex-col bg-white shadow-md">
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
                      <strong>{note.title}</strong>
                      <div className="mt-1 prose">
                        <ReactMarkdown>{note.content}</ReactMarkdown>
                      </div>
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
              </SortableItem>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
