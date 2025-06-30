"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  PlusCircle,
  Clock,
  Filter,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Archive,
  FileText,
  Loader2,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

import { sessionApi } from "@/lib/api";
import { SessionWithInsights } from "@/types";

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionWithInsights[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<
    SessionWithInsights[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  // Emotions filter removed as it was deemed unnecessary
  const [isNewSessionDialogOpen, setIsNewSessionDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  // Rename session state
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [sessionToRename, setSessionToRename] = useState<string | null>(null);
  const [newSessionNameForRename, setNewSessionNameForRename] = useState("");
  const [isRenamingSession, setIsRenamingSession] = useState(false);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await sessionApi.getSessions({
        archived: showArchived,
        search: searchQuery === "" ? undefined : searchQuery,
        // Emotions filter removed
      });

      setSessions(response.sessions);
      setFilteredSessions(response.sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load sessions");
      setSessions([]);
      setFilteredSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [showArchived, searchQuery]);

  useEffect(() => {
    fetchSessions();
  }, [showArchived, fetchSessions]);

  // Apply additional filters client-side for more responsive UI
  useEffect(() => {
    let filtered = [...sessions];

    // Filter by search query (if not already filtered at API level)
    if (
      searchQuery &&
      !filtered.some((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    ) {
      filtered = filtered.filter((session) =>
        session.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Emotions filtering removed

    setFilteredSessions(filtered);
  }, [sessions, searchQuery]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSessionName.trim()) {
      toast.error("Session name cannot be empty");
      return;
    }

    setIsCreatingSession(true);

    try {
      const session = await sessionApi.createSession(newSessionName);
      toast.success("Session created successfully");
      setNewSessionName("");
      setIsNewSessionDialogOpen(false);

      // Navigate to the dashboard with the new session ID
      router.push(`/dashboard?session=${session.id}`);
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create session");
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await sessionApi.deleteSession(sessionId);
      toast.success("Session deleted successfully");

      // Update the sessions list
      setSessions((prevSessions) =>
        prevSessions.filter((session) => session.id !== sessionId)
      );
      setFilteredSessions((prevSessions) =>
        prevSessions.filter((session) => session.id !== sessionId)
      );
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session");
    }
  };

  const handleArchiveSession = async (sessionId: string, archive: boolean) => {
    try {
      await sessionApi.updateSession(sessionId, { is_archived: archive });
      toast.success(
        archive
          ? "Session archived successfully"
          : "Session restored successfully"
      );
      fetchSessions();
    } catch (error) {
      console.error(
        archive ? "Error archiving session:" : "Error restoring session:",
        error
      );
      toast.error(
        archive ? "Failed to archive session" : "Failed to restore session"
      );
    }
  };

  // Handle renaming a session
  const handleRenameSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionToRename || !newSessionNameForRename.trim()) {
      toast.error("Session name cannot be empty");
      return;
    }

    setIsRenamingSession(true);

    try {
      await sessionApi.updateSession(sessionToRename, {
        name: newSessionNameForRename,
      });
      toast.success("Session renamed successfully");
      setIsRenameDialogOpen(false);
      setSessionToRename(null);
      setNewSessionNameForRename("");
      fetchSessions();
    } catch (error) {
      console.error("Error renaming session:", error);
      toast.error("Failed to rename session");
    } finally {
      setIsRenamingSession(false);
    }
  };

  // Open rename dialog with current session name
  const openRenameDialog = (session: SessionWithInsights) => {
    setSessionToRename(session.id);
    setNewSessionNameForRename(session.name);
    setIsRenameDialogOpen(true);
  };

  // Emotions filter toggle function removed

  const handleTabChange = (tab: "active" | "archived") => {
    setActiveTab(tab);
    setShowArchived(tab === "archived");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSessions();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 172800) return "Yesterday";
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;

    return date.toLocaleDateString();
  };

  // Emotions array removed as it's no longer needed

  // EmotionBadge component removed as it's no longer needed

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground">
            View and manage your analysis sessions
          </p>
        </div>

        <Dialog
          open={isNewSessionDialogOpen}
          onOpenChange={setIsNewSessionDialogOpen}
        >
          <DialogTrigger asChild>
            <Button className="whitespace-nowrap bg-purple-600 hover:bg-purple-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateSession}>
              <DialogHeader>
                <DialogTitle>Create New Session</DialogTitle>
                <DialogDescription>
                  Give your analysis session a name to help you identify it
                  later.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-2">
                  <Label htmlFor="session-name">Session Name</Label>
                  <Input
                    id="session-name"
                    placeholder="E.g., Customer Feedback Analysis"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isCreatingSession}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isCreatingSession ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Session"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:justify-between bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex space-x-1">
          <Button
            variant={activeTab === "active" ? "default" : "outline"}
            className={`rounded-r-none ${
              activeTab === "active" ? "bg-purple-600 hover:bg-purple-700" : ""
            }`}
            onClick={() => handleTabChange("active")}
          >
            Active
          </Button>
          <Button
            variant={activeTab === "archived" ? "default" : "outline"}
            className={`rounded-l-none ${
              activeTab === "archived"
                ? "bg-purple-600 hover:bg-purple-700"
                : ""
            }`}
            onClick={() => handleTabChange("archived")}
          >
            Archived
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <form onSubmit={handleSearch} className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search sessions..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {/* Emotions dropdown removed as it was deemed unnecessary */}
        </div>
      </div>

      {/* Rename Session Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Session</DialogTitle>
            <DialogDescription>
              Enter a new name for this session.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameSession}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="rename-session-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="rename-session-name"
                  value={newSessionNameForRename}
                  onChange={(e) => setNewSessionNameForRename(e.target.value)}
                  className="col-span-3"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRenameDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isRenamingSession}>
                {isRenamingSession && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex justify-center items-center py-12 bg-white rounded-lg shadow-sm border">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-white shadow-sm">
          <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">No sessions found</h3>
          <p className="text-muted-foreground mb-4">
            {showArchived
              ? "You don't have any archived sessions."
              : "Create your first session to get started."}
          </p>
          <Button
            onClick={() => setIsNewSessionDialogOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Session
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSessions.map((session) => (
            <Card
              key={session.id}
              className="overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3 bg-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="truncate">{session.name}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(`/sessions/${session.id}`)
                        }
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => openRenameDialog(session)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleArchiveSession(session.id, !session.is_archived)
                        }
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        {session.is_archived ? "Unarchive" : "Archive"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteSession(session.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDate(session.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                {session.insights?.topics &&
                  session.insights.topics.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Top Topics
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {session.insights.topics.slice(0, 3).map((topic) => (
                          <span
                            key={topic.id}
                            className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full"
                          >
                            {topic.name}
                          </span>
                        ))}
                        {session.insights.topics.length > 3 && (
                          <span className="text-xs text-muted-foreground px-1">
                            +{session.insights.topics.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
              </CardContent>
              <CardFooter className="pt-1 bg-gray-50">
                <Button
                  variant="outline"
                  className="w-full hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
                  asChild
                >
                  <Link href={`/dashboard?session=${session.id}`}>
                    View Details
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
