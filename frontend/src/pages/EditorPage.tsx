import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Editor from "../components/Editor";
import { Button } from "../components/collabdocs/button";
import { Presence } from "../components/collabdocs/presence";
import { ConnectionStatus } from "../components/collabdocs/connection-status";
import { SaveIndicator } from "../components/collabdocs/save-indicator";
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

  // Auth guard
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
    }
  }, [navigate]);

  if (!id) return <div className="p-8 text-center text-muted-foreground">Invalid document ID</div>;

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
                className="bg-transparent text-lg font-semibold text-foreground border-none outline-none focus:ring-0 min-w-0 max-w-[150px] sm:max-w-[250px] md:max-w-none truncate"
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

            <Button variant="secondary" size="sm" onClick={() => setShowShareModal(true)}>
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>

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
            <Editor docId={id} />
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
      {showShareModal && (
        <>
          <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setShowShareModal(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card border border-border shadow-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Share Document</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Share link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/doc/${id}`}
                    className="flex-1 rounded-xl border border-input bg-secondary px-4 py-2.5 text-sm text-muted-foreground"
                  />
                  <Button variant="secondary" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/doc/${id}`)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="ghost" onClick={() => setShowShareModal(false)}>Close</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
