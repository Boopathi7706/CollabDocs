import { useNavigate } from "react-router-dom";
import { Card } from "./card";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import { FileText, Trash2, MoreVertical, Clock, Users } from "lucide-react";
import { useState } from "react";

interface ActiveUser {
  id: string;
  name: string;
  image?: string;
}

interface DocumentCardProps {
  id: string;
  title: string;
  createdAt: string;
  lastEdited?: string;
  activeUsers?: ActiveUser[];
  status?: "draft" | "published" | "archived";
  onDelete?: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  permission?: "owner" | "editor" | "viewer";
}

export function DocumentCard({
  id,
  title,
  createdAt,
  lastEdited,
  activeUsers = [],
  status = "draft",
  onDelete,
  onRename,
  permission,
}: DocumentCardProps) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);

  const statusVariant = {
    draft: "warning",
    published: "success",
    archived: "default",
  } as const;

  const handleTitleBlur = () => {
    setEditing(false);
    if (localTitle !== title) {
      onRename?.(id, localTitle);
    }
  };

  return (
    <Card hover className="group relative transition-all duration-200 hover:shadow-lg hover:scale-[1.02]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <input
                autoFocus
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => e.key === "Enter" && handleTitleBlur()}
                className="w-full font-semibold text-foreground bg-transparent border-b border-primary outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="flex items-center gap-2">
                <h3
                  className="font-semibold text-foreground line-clamp-1 cursor-pointer"
                  onDoubleClick={() => !permission && setEditing(true)}
                >
                  {localTitle}
                </h3>
                {permission && (
                  <Badge variant={permission === "editor" ? "info" : "default"} className="text-[10px] px-1.5 py-0 capitalize">
                    {permission}
                  </Badge>
                )}
              </div>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {lastEdited || createdAt}
              </span>
              {!permission && status && (
                <Badge variant={statusVariant[status]} className="text-[10px] px-1.5 py-0">
                  {status}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Menu Button - Only show for own documents */}
        {!permission && (onDelete || onRename) && (
          <div className="relative shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 z-20 w-36 rounded-xl bg-card border border-border shadow-lg py-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(true); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                  >
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(id);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Active Users */}
      {activeUsers.length > 0 && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1.5">
              {activeUsers.slice(0, 3).map((user) => (
                <Avatar key={user.id} name={user.name} image={user.image} size="sm" showBorder />
              ))}
            </div>
            <span className="ml-1">
              {activeUsers.length} active user{activeUsers.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          className="flex-1 w-full inline-flex items-center justify-center gap-2 font-medium text-sm rounded-xl px-5 py-2.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all duration-200"
          onClick={() => navigate(`/doc/${id}`)}
        >
          Open
        </button>
      </div>
    </Card>
  );
}
