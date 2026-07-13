import { useState, useEffect } from "react";
import { Button } from "./button";
import { Copy, Link2, X } from "lucide-react";
import { getApiUrl } from "../../config/api";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  onShareSuccess: (message: string) => void;
  userPermission: "owner" | "editor" | "viewer";
}

export function ShareModal({ isOpen, onClose, docId, onShareSuccess, userPermission }: ShareModalProps) {
  const [permission, setPermission] = useState<"viewer" | "editor">("viewer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [allowEditorSharing, setAllowEditorSharing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setShareLink(null);
      // Fetch document access/policy details
      const token = localStorage.getItem("token");
      fetch(getApiUrl(`/api/documents/${docId}/access`), {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.allowEditorSharing !== undefined) {
            setAllowEditorSharing(data.allowEditorSharing);
          }
        })
        .catch((err) => console.error("[ShareModal] Policy load failed:", err));
    }
  }, [isOpen, docId]);

  if (!isOpen) return null;

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShareLink(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(getApiUrl(`/api/documents/${docId}/share`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ permission }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate invite link");
      }

      //const generatedLink = `${window.location.origin}/doc/${docId}?invite=${data.token}`;
      const generatedLink =
        `${window.location.origin}/doc/${docId}?invite=${data.token}`;
      console.log('[GeneratedLink]', generatedLink);
      setShareLink(generatedLink);
      onShareSuccess("Invite link generated successfully!");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePolicy = async (checked: boolean) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(getApiUrl(`/api/documents/${docId}/toggle-editor-sharing`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ allowEditorSharing: checked }),
      });
      if (res.ok) {
        setAllowEditorSharing(checked);
        onShareSuccess(checked ? "Editors can now share this document!" : "Editor sharing disabled.");
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to update sharing policy");
      }
    } catch (err: any) {
      setError(err.message || "Failed to toggle sharing policy");
    }
  };

  const handleCopy = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      onShareSuccess("Invite link copied to clipboard!");
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card border border-border shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Share Document</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {userPermission === "owner" && (
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/30 mb-5">
            <div>
              <span className="block text-sm font-medium text-foreground">Allow Editor Sharing</span>
              <span className="block text-xs text-muted-foreground">Allows editors to generate viewer invites</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allowEditorSharing}
                onChange={(e) => handleTogglePolicy(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        )}

        <form onSubmit={handleShare} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Invite Role Permission</label>
            <div className="flex gap-2">
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as "viewer" | "editor")}
                className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="viewer">Viewer</option>
                {userPermission === "owner" && <option value="editor">Editor</option>}
              </select>
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Generate Invite Link
          </Button>
        </form>

        {error && (
          <p className="mt-3 text-sm text-destructive font-medium">{error}</p>
        )}

        {shareLink && (
          <div className="mt-5 space-y-2 border-t border-border pt-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Share link</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="flex-1 rounded-xl border border-input bg-secondary px-4 py-2.5 text-sm text-muted-foreground"
              />
              <Button variant="secondary" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <Link2 className="h-3.5 w-3.5 text-emerald-500" />
              Anyone with this link can redeem this invite to join as {permission}.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
