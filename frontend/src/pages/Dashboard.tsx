import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/collabdocs/button";
import { DocumentCard } from "../components/collabdocs/document-card";
import { EmptyState } from "../components/collabdocs/empty-state";
import { ConnectionStatus } from "../components/collabdocs/connection-status";
import { Plus, Search, Grid3X3, List, Filter } from "lucide-react";
import { getApiUrl } from "../config/api";

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
  const [sharedDocuments, setSharedDocuments] = useState<any[]>([]);
  const [accessRequests, setAccessRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [connectionStatus] = useState<"connected" | "disconnected" | "reconnecting">("connected");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published" | "archived">("all");

  const fetchAccessRequests = () => {
    fetch(getApiUrl("/api/documents/access-requests"), { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAccessRequests(data))
      .catch((err) => console.error("Failed to load access requests", err));
  };

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    // Fetch own documents
    fetch(getApiUrl("/api/documents"), { headers: authHeaders() })
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

    // Fetch shared documents
    fetch(getApiUrl("/api/documents/shared-with-me"), { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setSharedDocuments(data))
      .catch((err) => console.error("Failed to load shared docs", err));

    // Fetch access requests
    fetchAccessRequests();
  }, [navigate]);

  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSharedDocuments = sharedDocuments.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewDocument = async () => {
    try {
      const res = await fetch(getApiUrl("/api/documents"), {
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
    fetch(getApiUrl(`/api/documents/${id}`), {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ title: newTitle }),
    }).catch((err) => console.error("Failed to rename", err));
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    setDocuments(documents.filter((d) => d.id !== id));
    fetch(getApiUrl(`/api/documents/${id}`), {
      method: "DELETE",
      headers: authHeaders(),
    }).catch((err) => console.error("Failed to delete", err));
  };

  const handleApproveAccess = async (requestId: string, docId: string, requestedBy: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/documents/${docId}/approve-request`), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ requestId, userId: requestedBy }),
      });
      if (res.ok) {
        setAccessRequests(accessRequests.filter((r) => r.id !== requestId));
      } else {
        console.error("Failed to approve access request");
      }
    } catch (err) {
      console.error("Failed to approve request", err);
    }
  };

  const handleRejectAccess = async (requestId: string, docId: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/documents/${docId}/reject-request`), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ requestId }),
      });
      if (res.ok) {
        setAccessRequests(accessRequests.filter((r) => r.id !== requestId));
      } else {
        console.error("Failed to reject access request");
      }
    } catch (err) {
      console.error("Failed to reject request", err);
    }
  };

  const hasDocuments = documents.length > 0 || sharedDocuments.length > 0;
  const hasFilteredDocuments = filteredDocuments.length > 0 || filteredSharedDocuments.length > 0;

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            {sharedDocuments.length > 0 ? "Documents" : "My Documents"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {sharedDocuments.length > 0
              ? "Create, edit, and collaborate on documents"
              : "Create, edit, and collaborate on your documents"}
          </p>
        </div>
        <ConnectionStatus status={connectionStatus} showIcon />
      </div>

      {/* Access Requests Panel */}
      {accessRequests.length > 0 && (
        <div className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-md animate-in fade-in duration-200">
          <h2 className="text-lg font-semibold text-foreground mb-1">Access Requests</h2>
          <p className="text-xs text-muted-foreground mb-4">Users requesting edit permissions on your documents</p>
          <div className="divide-y divide-border">
            {accessRequests.map((req) => (
              <div key={req.id} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <span className="block text-sm font-medium text-foreground truncate">
                    {req.userName || req.userEmail}
                  </span>
                  <span className="block text-xs text-muted-foreground truncate">
                    Requested edit access for: <span className="font-semibold text-primary">{req.documentTitle}</span>
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={() => handleApproveAccess(req.id, req.documentId, req.requestedBy)}
                  >
                    Approve
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => handleRejectAccess(req.id, req.documentId)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
      {!hasDocuments ? (
        <EmptyState
          title="No documents yet"
          description="Create your first document or redeem an invite to get started collaborating."
          action={
            <Button onClick={handleNewDocument}>
              <Plus className="h-4 w-4" />
              Create Document
            </Button>
          }
        />
      ) : !hasFilteredDocuments ? (
        <EmptyState
          title="No results found"
          description={`No documents match "${searchQuery}". Try a different query.`}
        />
      ) : (
        <div className="space-y-10">
          {/* My Documents Section */}
          {documents.length > 0 && (
            <div>
              {sharedDocuments.length > 0 && (
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-foreground">My Documents</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Documents you created and own</p>
                </div>
              )}
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
                <p className="text-sm text-muted-foreground italic">No matching own documents.</p>
              )}
            </div>
          )}

          {/* Shared With Me Section */}
          {sharedDocuments.length > 0 && (
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-foreground">Shared With Me</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Documents shared with you by other collaborators</p>
              </div>
              {filteredSharedDocuments.length > 0 ? (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                      : "flex flex-col gap-3"
                  }
                >
                  {filteredSharedDocuments.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      id={doc.id}
                      title={doc.title}
                      createdAt={new Date(doc.createdAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric"
                      })}
                      status="draft"
                      activeUsers={[]}
                      permission={doc.permission as "owner" | "editor" | "viewer"}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No matching shared documents.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
