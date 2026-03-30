import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "../components/Editor";
import "./EditorPage.css";

export const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return <div>Invalid Document ID</div>;
  }

  return (
    <div className="editor-page">
      <header className="editor-header">
        <button className="back-btn" onClick={() => navigate("/")}>
          ← Back to Dashboard
        </button>
        <span className="doc-id-badge">ID: {id}</span>
      </header>
      
      <main className="editor-main">
        <Editor docId={id} />
      </main>
    </div>
  );
};

export default EditorPage;
