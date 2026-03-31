import { Link, useNavigate } from "react-router-dom";
import { Button } from "./button";
import { Avatar } from "./avatar";
import { FileText, LogOut, Menu, X, Bell, Settings } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: "1", message: "Real-time sync active", time: "Just now" },
    { id: "2", message: "Document auto-saved", time: "1 min ago" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm transition-transform group-hover:scale-105">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">CollabDocs</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-secondary"
            >
              Dashboard
            </Link>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 top-12 z-20 w-80 rounded-xl bg-card border border-border shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <h3 className="font-semibold text-foreground">Notifications</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.map((n) => (
                        <button
                          key={n.id}
                          className="w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0"
                        >
                          <p className="text-sm text-foreground">{n.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Settings */}
            <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Settings className="h-5 w-5" />
            </button>

            {/* User Menu */}
            <div className="flex items-center gap-3 pl-3 border-l border-border">
              <Avatar name="User" size="md" status="online" />
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Logout</span>
              </Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-4 py-4 space-y-3">
            <Link
              to="/dashboard"
              className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar name="User" size="md" status="online" />
              <span className="text-sm text-foreground">Account</span>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
