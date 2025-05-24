"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { userApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate user's initials for avatar fallback
  const getInitials = () => {
    if (!user || !user.full_name) return "U";
    const nameParts = user.full_name.split(" ");
    if (nameParts.length > 1) {
      return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(
        0
      )}`.toUpperCase();
    }
    return nameParts[0].charAt(0).toUpperCase();
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await userApi.updateProfile({ fullName });
      toast.success("Profile updated successfully");
      router.refresh();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfilePictureChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPEG, PNG, etc.)");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB");
      return;
    }

    setIsLoading(true);

    try {
      await userApi.updateProfile({ profilePicture: file });
      toast.success("Profile picture updated successfully");
      // Force reload to see the new image
      window.location.reload();
    } catch (error) {
      console.error("Error updating profile picture:", error);
      toast.error("Failed to update profile picture");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    // Basic client-side validation
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);

    try {
      await userApi.changePassword({
        currentPassword,
        newPassword,
      });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);

      // Show specific error message from backend
      const errorMessage =
        error?.response?.data?.detail || "Failed to change password";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      await userApi.deleteAccount();
      toast.success("Your account has been deleted");
      logout();
      router.push("/login");
    } catch (error: any) {
      console.error("Error deleting account:", error);

      // Handle specific error messages
      const errorMessage =
        error?.response?.data?.detail ||
        "Failed to delete account. Please try again.";

      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and account
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>Update your profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4">
                <div className="relative group">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user?.profile_picture || ""} />
                    <AvatarFallback className="text-2xl">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="text-white text-xs">Change</span>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                  />
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="font-medium text-lg">
                    {user?.full_name || "User"}
                  </h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  {user?.is_admin && (
                    <span className="inline-block bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                      Admin
                    </span>
                  )}
                  {user?.user_tier && (
                    <span className="inline-block bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full ml-1">
                      {user.user_tier.charAt(0).toUpperCase() +
                        user.user_tier.slice(1)}
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleUpdateProfile}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input
                      id="full-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Updating..." : "Update Profile"}
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <div className="text-sm text-muted-foreground">
                    Password must contain:
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>At least 8 characters</li>
                      <li>At least one uppercase letter</li>
                      <li>At least one lowercase letter</li>
                      <li>At least one number</li>
                    </ul>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>
              Actions in this section can't be undone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you sure?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete
                    your account and remove all of your data from our servers.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Yes, Delete My Account"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
