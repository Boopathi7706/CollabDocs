import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuid } from "uuid";
import "./Dashboard.css";

interface DocumentMeta {
  id: string;
  title: string;
  createdAt: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);

  // Phase 4: Use localStorage to persist documents
  useEffect(() => {
    const savedDocs = localStorage.getItem("documents");
    if (savedDocs) {
      try {
        setDocuments(JSON.parse(savedDocs));
      } catch (e) {
        console.error("Failed to load documents", e);
      }
    } else {
      // Mock Data 
      const initDoc: DocumentMeta = { 
        id: "550e8400-e29b-41d4-a716-446655440000", 
        title: "Test Doc", 
        createdAt: new Date().toISOString() 
      };
      setDocuments([initDoc]);
      localStorage.setItem("documents", JSON.stringify([initDoc]));
    }
  }, []);

  const handleNewDocument = () => {
    // Phase 5: Create New Document
    const newDoc: DocumentMeta = {
      id: uuid(),
      title: "Untitled Document",
      createdAt: new Date().toISOString(),
    };
    
    const updatedDocs = [newDoc, ...documents];
    setDocuments(updatedDocs);
    localStorage.setItem("documents", JSON.stringify(updatedDocs));
    
    // Navigate instantly
    navigate(`/doc/${newDoc.id}`);
  };

  const handleRename = (id: string, newTitle: string) => {
    // Phase 9: Document Rename
    const updated = documents.map((doc) =>
      doc.id === id ? { ...doc, title: newTitle } : doc
    );
    setDocuments(updated);
    localStorage.setItem("documents", JSON.stringify(updated));
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>CollabDocs Dashboard</h1>
        <button className="new-doc-btn" onClick={handleNewDocument}>
          + New Document
        </button>
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
                  <input
                    className="document-title-input"
                    value={doc.title}
                    onClick={(e) => e.stopPropagation()} 
                    onChange={(e) => handleRename(doc.id, e.target.value)}
                  />
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
