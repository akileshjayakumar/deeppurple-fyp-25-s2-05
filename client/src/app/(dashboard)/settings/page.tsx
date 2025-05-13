"use client";

import React, { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SunIcon, MoonIcon, LaptopIcon } from "lucide-react";

export default function SettingsPage() {
  const [theme, setTheme] = useState("system");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoAnalysis, setAutoAnalysis] = useState(true);
  const [saveHistory, setSaveHistory] = useState(true);
  const [defaultModel, setDefaultModel] = useState("gpt-4");
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveSettings = () => {
    setIsLoading(true);

    // Simulate saving settings
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Settings saved successfully");
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application preferences and configurations
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize how DeepPurple looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger id="theme" className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <SunIcon className="h-4 w-4" />
                      <span>Light</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <MoonIcon className="h-4 w-4" />
                      <span>Dark</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <LaptopIcon className="h-4 w-4" />
                      <span>System</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Configure your notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email notifications about your analysis results
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sentiment Analysis</CardTitle>
            <CardDescription>
              Configure how sentiment analysis works
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-analysis">Automatic Analysis</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically analyze text and files when uploaded
                </p>
              </div>
              <Switch
                id="auto-analysis"
                checked={autoAnalysis}
                onCheckedChange={setAutoAnalysis}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="save-history">Save Analysis History</Label>
                <p className="text-sm text-muted-foreground">
                  Keep a history of all your analysis sessions
                </p>
              </div>
              <Switch
                id="save-history"
                checked={saveHistory}
                onCheckedChange={setSaveHistory}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Default AI Model</Label>
              <Select value={defaultModel} onValueChange={setDefaultModel}>
                <SelectTrigger id="model" className="w-full">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4">GPT-4 (Best Quality)</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">
                    GPT-3.5 Turbo (Faster)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSaveSettings}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
