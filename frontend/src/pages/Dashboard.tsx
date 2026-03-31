import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/collabdocs/button";
import { DocumentCard } from "../components/collabdocs/document-card";
import { EmptyState } from "../components/collabdocs/empty-state";
import { ConnectionStatus } from "../components/collabdocs/connection-status";
import { Plus, Search, Grid3X3, List, Filter } from "lucide-react";

const API = "http://localhost:3001";

interface DocumentMeta {
  id: string;
  title: string;
  createdAt: string;
}

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [connectionStatus] = useState<"connected" | "disconnected" | "reconnecting">("connected");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published" | "archived">("all");

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetch(`${API}/api/documents`, { headers: authHeaders() })
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

  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewDocument = async () => {
    try {
      const res = await fetch(`${API}/api/documents`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ title: "Untitled Document" }),
      });
      if (!res.ok) throw new Error("Failed");
      const newDoc = await res.json();
      setDocuments([newDoc, ...documents]);
      navigate(`/doc/${newDoc.id}`);
    } catch (err) {
      console.error("Failed to create document", err);
    }
  };

  const handleRename = (id: string, newTitle: string) => {
    setDocuments(documents.map((d) => d.id === id ? { ...d, title: newTitle } : d));
    fetch(`${API}/api/documents/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ title: newTitle }),
    }).catch((err) => console.error("Failed to rename", err));
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    setDocuments(documents.filter((d) => d.id !== id));
    fetch(`${API}/api/documents/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).catch((err) => console.error("Failed to delete", err));
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">My Documents</h1>
          <p className="mt-1 text-muted-foreground">Create, edit, and collaborate on your documents</p>
        </div>
        <ConnectionStatus status={connectionStatus} showIcon />
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="appearance-none rounded-xl border border-input bg-background pl-9 pr-8 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>

          {/* View Toggle */}
          <div className="flex items-center rounded-xl border border-input bg-background p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* New Document Button */}
          <Button onClick={handleNewDocument}>
            <Plus className="h-4 w-4" />
            New Document
          </Button>
        </div>
      </div>

      {/* Documents Grid/List */}
      {filteredDocuments.length > 0 ? (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-3"
          }
        >
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              id={doc.id}
              title={doc.title}
              createdAt={new Date(doc.createdAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric"
              })}
              status="draft"
              activeUsers={[]}
              onDelete={handleDelete}
              onRename={handleRename}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No documents yet"
          description={
            searchQuery
              ? "No documents match your search. Try a different query."
              : "Create your first document to get started collaborating."
          }
          action={
            !searchQuery && (
              <Button onClick={handleNewDocument}>
                <Plus className="h-4 w-4" />
                Create Document
              </Button>
            )
          }
        />
      )}
    </div>
  );
}
