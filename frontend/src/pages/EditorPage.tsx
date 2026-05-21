import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Editor from "../components/Editor";
import { Button } from "../components/collabdocs/button";
import { Presence } from "../components/collabdocs/presence";
import { ConnectionStatus } from "../components/collabdocs/connection-status";
import { SaveIndicator } from "../components/collabdocs/save-indicator";
import { ShareModal } from "../components/collabdocs/ShareModal";
import { Toast } from "../components/collabdocs/Toast";
import AccessDenied from "./AccessDenied";
import {
  ArrowLeft,
  Share2,
  MoreHorizontal,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Image,
  Undo,
  Redo,
  Type,
  Download,
  Copy,
} from "lucide-react";

const mockActiveUsers = [
  { id: "1", name: "You" },
];

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [saveStatus] = useState<"saved" | "saving" | "syncing" | "error">("saved");
  const [lastSaved] = useState<Date | null>(new Date());
  const [connectionStatus] = useState<"connected" | "disconnected" | "reconnecting">("connected");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [title, setTitle] = useState("Untitled Document");

  // Document Sharing / Access States
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [canAccess, setCanAccess] = useState(true);
  const [permission, setPermission] = useState<"owner" | "editor" | "viewer">("viewer");
  const [allowEditorSharing, setAllowEditorSharing] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Auth guard and access/invite-redemption handler
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    const checkAccessAndRedeem = async () => {
      try {
        setLoadingAccess(true);
        const searchParams = new URLSearchParams(window.location.search);
        const inviteToken = searchParams.get("invite");
        const token = localStorage.getItem("token");

        // 1. If invite token is present, redeem it first
        if (inviteToken) {
          const redeemRes = await fetch(`http://localhost:3001/api/documents/${id}/redeem`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ token: inviteToken }),
          });

          if (redeemRes.ok) {
            // Clean invite parameter from browser URL cleanly without page reload
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
            setToast({ message: "Successfully joined document!", type: "success" });
          } else {
            const errData = await redeemRes.json();
            console.error("[Redeem Failed]", errData.error);
            setToast({ message: errData.error || "Failed to redeem invite link", type: "error" });
          }
        }

        // 2. Query document access details
        const accessRes = await fetch(`http://localhost:3001/api/documents/${id}/access`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (accessRes.ok) {
          const accessData = await accessRes.json();
          setCanAccess(accessData.canAccess);
          setPermission(accessData.permission || "viewer");
          setPendingRequest(!!accessData.pendingRequest);
          setAllowEditorSharing(!!accessData.allowEditorSharing);
        } else {
          setCanAccess(false);
        }

        // 3. Fetch actual document details to populate document title
        const docRes = await fetch(`http://localhost:3001/api/documents/${id}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (docRes.ok) {
          const docData = await docRes.json();
          setTitle(docData.title || "Untitled Document");
        }

      } catch (err) {
        console.error("[Access Check Error]", err);
        setCanAccess(false);
      } finally {
        setLoadingAccess(false);
      }
    };

    checkAccessAndRedeem();
  }, [id, navigate]);

  // Polling for permission upgrades when user is a viewer
  useEffect(() => {
    if (!id || permission !== "viewer") return;

    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem("token");
        const accessRes = await fetch(`http://localhost:3001/api/documents/${id}/access`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (accessRes.ok) {
          const accessData = await accessRes.json();
          if (accessData.permission && accessData.permission !== "viewer") {
            setPermission(accessData.permission);
            setAllowEditorSharing(!!accessData.allowEditorSharing);
            setToast({ message: `Access granted! You are now an ${accessData.permission}.`, type: "success" });
          }
          setPendingRequest(!!accessData.pendingRequest);
        }
      } catch (err) {
        console.error("[Polling Error]", err);
      }
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(interval);
  }, [id, permission]);

  if (!id) return <div className="p-8 text-center text-muted-foreground">Invalid document ID</div>;

  if (loadingAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground mt-3">Verifying permissions...</p>
      </div>
    );
  }

  if (!canAccess) {
    return <AccessDenied />;
  }

  const handleRequestEditAccess = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:3001/api/documents/${id}/request-access`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (res.ok) {
        setPendingRequest(true);
        setToast({ message: "Edit access requested successfully!", type: "success" });
      } else {
        if (data.error === "already_pending") {
          setPendingRequest(true);
          setToast({ message: "Request is already pending review.", type: "error" });
        } else if (data.error === "already_member") {
          setToast({ message: "You already have edit access.", type: "success" });
        } else {
          throw new Error(data.error || "Failed to request access");
        }
      }
    } catch (err: any) {
      setToast({ message: err.message || "Failed to request access", type: "error" });
    }
  };

  const ToolbarButton = ({
    icon: Icon,
    label,
    active = false,
  }: {
    icon: React.ElementType;
    label: string;
    active?: boolean;
  }) => (
    <button
      type="button"
      title={label}
      className={`p-2 rounded-lg transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  const ToolbarDivider = () => <div className="h-6 w-px bg-border mx-1" />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="flex h-14 items-center justify-between px-4 gap-4">
          {/* Left Section */}
          <div className="flex items-center gap-4 min-w-0">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
            <div className="flex items-center gap-3 min-w-0">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={permission === "viewer"}
                className={`bg-transparent text-lg font-semibold text-foreground border-none outline-none focus:ring-0 min-w-0 max-w-[150px] sm:max-w-[250px] md:max-w-none truncate ${
                  permission === "viewer" ? "cursor-not-allowed opacity-80" : ""
                }`}
                placeholder="Untitled Document"
              />
              <SaveIndicator status={saveStatus} lastSaved={lastSaved} />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:block">
              <ConnectionStatus status={connectionStatus} />
            </div>

            <Presence users={mockActiveUsers} maxVisible={4} size="sm" className="hidden sm:flex" />

            {permission === "viewer" ? (
              <Button 
                variant={pendingRequest ? "secondary" : "primary"} 
                size="sm" 
                onClick={handleRequestEditAccess}
                disabled={pendingRequest}
              >
                {pendingRequest ? "Request Pending" : "Request Edit Access"}
              </Button>
            ) : (
              (permission === "owner" || (permission === "editor" && allowEditorSharing)) && (
                <Button variant="secondary" size="sm" onClick={() => setShowShareModal(true)}>
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
              )
            )}

            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute right-0 top-10 z-20 w-48 rounded-xl bg-card border border-border shadow-lg py-1">
                    <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors">
                      <Download className="h-4 w-4" />
                      Export as PDF
                    </button>
                    <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors">
                      <Copy className="h-4 w-4" />
                      Duplicate
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-4 py-2 border-t border-border overflow-x-auto">
          <div className="flex items-center">
            <ToolbarButton icon={Undo} label="Undo" />
            <ToolbarButton icon={Redo} label="Redo" />
          </div>
          <ToolbarDivider />
          <div className="flex items-center">
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Type className="h-4 w-4" />
              <span className="hidden sm:inline">Paragraph</span>
            </button>
          </div>
          <ToolbarDivider />
          <div className="flex items-center">
            <ToolbarButton icon={Bold} label="Bold" />
            <ToolbarButton icon={Italic} label="Italic" />
            <ToolbarButton icon={Underline} label="Underline" />
          </div>
          <ToolbarDivider />
          <div className="flex items-center">
            <ToolbarButton icon={AlignLeft} label="Align Left" active />
            <ToolbarButton icon={AlignCenter} label="Align Center" />
            <ToolbarButton icon={AlignRight} label="Align Right" />
          </div>
          <ToolbarDivider />
          <div className="flex items-center">
            <ToolbarButton icon={List} label="Bullet List" />
            <ToolbarButton icon={ListOrdered} label="Numbered List" />
          </div>
          <ToolbarDivider />
          <div className="flex items-center">
            <ToolbarButton icon={Link2} label="Insert Link" />
            <ToolbarButton icon={Image} label="Insert Image" />
          </div>
        </div>
      </header>

      {/* Editor Container — existing Yjs/TipTap Editor unchanged */}
      <main className="flex-1 flex justify-center px-4 py-8">
        <div className="w-full max-w-4xl">
          <div className="bg-card rounded-2xl shadow-lg border border-border min-h-[600px] overflow-hidden">
            <Editor docId={id} editable={permission !== "viewer"} />
          </div>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="border-t border-border bg-background px-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Document ID: {id.slice(0, 8)}...</span>
          </div>
          <div className="flex items-center gap-4">
            <ConnectionStatus status={connectionStatus} showLabel={false} />
          </div>
        </div>
      </footer>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        docId={id}
        onShareSuccess={(message) => setToast({ message, type: "success" })}
        userPermission={permission}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
