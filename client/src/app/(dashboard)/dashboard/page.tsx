"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, PlusCircle, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { sessionApi } from "@/lib/api";

export default function Dashboard() {
  const router = useRouter();
  const [newSessionName, setNewSessionName] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      setIsDialogOpen(false);

      // Navigate to the new session
      router.push(`/sessions/${session.id}`);
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create session");
    } finally {
      setIsCreatingSession(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to DeepPurple. Analyze sentiment and emotions in your text.
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex gap-2 items-center">
                <MessageSquare size={16} />
                <span>New Session</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Session</DialogTitle>
                <DialogDescription>
                  Give your analysis session a name to help you identify it
                  later.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSession}>
                <div className="py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Session Name</Label>
                    <Input
                      id="name"
                      placeholder="E.g., Customer Feedback Analysis"
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isCreatingSession}>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Get Started with DeepPurple</CardTitle>
            <CardDescription>
              Analyze sentiment and emotions in text with advanced AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              DeepPurple helps you understand the sentiment and emotions in text
              using AI-powered analysis. Create a new session to get started
              with your text analysis.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <div className="text-primary font-bold mb-2">Step 1</div>
                <h3 className="font-medium">Create a Session</h3>
                <p className="text-sm text-muted-foreground">
                  Create a new analysis session for your text or document
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-primary font-bold mb-2">Step 2</div>
                <h3 className="font-medium">Add Text or Files</h3>
                <p className="text-sm text-muted-foreground">
                  Input text directly or upload files for analysis
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-primary font-bold mb-2">Step 3</div>
                <h3 className="font-medium">View Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Explore sentiment and emotion analysis results
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <PlusCircle size={16} className="mr-2" />
                  Create Your First Session
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Session</DialogTitle>
                  <DialogDescription>
                    Give your analysis session a name to help you identify it
                    later.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateSession}>
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
                    <Button type="submit" disabled={isCreatingSession}>
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
          </CardFooter>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Features</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sessions">
            <span className="flex items-center gap-1">
              View all sessions <ChevronRight size={16} />
            </span>
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Analyze text for positive, negative, or neutral sentiments with
              detailed scoring.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Emotion Detection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Identify emotions like joy, anger, sadness, fear, and surprise in
              text.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Topic Extraction</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Automatically identify and categorize key topics in your content.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
