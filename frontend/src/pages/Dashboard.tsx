import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";

interface DocumentMeta {
  id: string;
  title: string;
  createdAt: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);

  // Fetch documents from backend
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetch("http://localhost:3001/api/documents", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => setDocuments(data))
      .catch((err) => console.error("Failed to load documents", err));
  }, [navigate]);

  const handleNewDocument = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/documents", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title: "Untitled Document" }),
      });
      if (!res.ok) throw new Error("Failed creating document");
      const newDoc = await res.json();
      setDocuments([newDoc, ...documents]);
      navigate(`/doc/${newDoc.id}`);
    } catch (err) {
      console.error("Failed to create document", err);
    }
  };

  const handleRename = (id: string, newTitle: string) => {
    const token = localStorage.getItem("token");
    
    // Optimistic UI Update!
    const updated = documents.map((doc) =>
      doc.id === id ? { ...doc, title: newTitle } : doc
    );
    setDocuments(updated);

    fetch(`http://localhost:3001/api/documents/${id}`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ title: newTitle }),
    }).catch((err) => console.error("Failed to rename document", err));
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    
    const token = localStorage.getItem("token");

    // Optimistic Delete
    setDocuments(documents.filter((doc) => doc.id !== id));

    fetch(`http://localhost:3001/api/documents/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    }).catch((err) => console.error("Failed to delete document", err));
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Documents</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and collaborate on your files</p>
        </div>
        <Button onClick={handleNewDocument}>
          + New Document
        </Button>
      </div>

      <div className="w-full">
        {documents.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
            <p className="text-gray-500 mb-6">Create your first document to get started</p>
            <Button onClick={handleNewDocument}>Create First Document</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className="bg-white shadow-sm border border-gray-100 rounded-xl p-6 hover:shadow-xl transition-all duration-200 cursor-pointer group flex flex-col justify-between"
                onClick={() => navigate(`/doc/${doc.id}`)}
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <button 
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-red-50" 
                      onClick={(e) => handleDelete(doc.id, e)}
                      title="Delete document"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <input
                    className="w-full text-lg font-semibold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none bg-transparent transition-colors py-1 cursor-text truncate"
                    value={doc.title}
                    onClick={(e) => e.stopPropagation()} 
                    onChange={(e) => handleRename(doc.id, e.target.value)}
                  />
                </div>
                <div className="mt-6 flex items-center text-xs text-gray-400">
                  <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Created {new Date(doc.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
