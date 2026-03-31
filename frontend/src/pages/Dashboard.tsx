import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>CollabDocs Dashboard</h1>
        <div className="dashboard-actions">
          <button className="new-doc-btn" onClick={handleNewDocument}>
            + New Document
          </button>
          <button className="logout-btn" onClick={handleLogout} style={{ marginLeft: "10px", background: "rgba(255, 107, 107, 0.2)", color: "#ff6b6b", border: "1px solid rgba(255, 107, 107, 0.4)", borderRadius: "6px", cursor: "pointer", padding: "8px 16px" }}>
            Logout
          </button>
        </div>
      </header>

      <div className="document-list">
        <h2>Your Documents</h2>
        {documents.length === 0 ? (
          <p className="empty-state">No documents yet. Create one!</p>
        ) : (
          <div className="grid">
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className="document-card" 
                onClick={() => navigate(`/doc/${doc.id}`)}
              >
                <div className="card-content">
                  <div className="title-wrapper">
                    <input
                      className="document-title-input"
                      value={doc.title}
                      onClick={(e) => e.stopPropagation()} 
                      onChange={(e) => handleRename(doc.id, e.target.value)}
                    />
                    <button 
                      className="delete-btn" 
                      onClick={(e) => handleDelete(doc.id, e)}
                      title="Delete document"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="document-date">
                    Created: {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
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
