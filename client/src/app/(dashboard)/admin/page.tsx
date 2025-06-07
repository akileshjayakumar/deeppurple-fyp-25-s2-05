"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { adminApi } from "@/lib/api";

// Define types
type UserType = {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  user_tier?: string;
  created_at: string;
};

type UpdateUserData = {
  full_name?: string;
  is_admin?: boolean;
  is_active?: boolean;
};

const fetchUsers = async (): Promise<{ items: UserType[]; total: number }> => {
  try {
    const data = await adminApi.getUsers();
    return data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

const deactivateUser = async (userId: number): Promise<UserType> => {
  try {
    const data = await adminApi.deactivateUser(String(userId));
    return data;
  } catch (error) {
    console.error("Error deactivating user:", error);
    throw error;
  }
};

const activateUser = async (userId: number): Promise<UserType> => {
  try {
    const data = await adminApi.activateUser(String(userId));
    return data;
  } catch (error) {
    console.error("Error activating user:", error);
    throw error;
  }
};

const updateUser = async (
  userId: number,
  updateData: UpdateUserData
): Promise<UserType> => {
  try {
    const data = await adminApi.updateUser(String(userId), {
      fullName: updateData.full_name,
      isAdmin: updateData.is_admin,
      isActive: updateData.is_active,
    });
    return data;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editName, setEditName] = useState("");
  const [editIsAdmin, setEditIsAdmin] = useState(false);

  // Load users on mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const data = await fetchUsers();
        setUsers(data.items || []);
      } catch (error: any) {
        toast.error("Failed to load users: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Handle user activation/deactivation
  const handleToggleActive = async (userId: number, currentActive: boolean) => {
    try {
      if (currentActive) {
        await deactivateUser(userId);
        toast.success("User deactivated successfully");
      } else {
        await activateUser(userId);
        toast.success("User activated successfully");
      }

      // Refresh user list
      const data = await fetchUsers();
      setUsers(data.items || []);
    } catch (error: any) {
      toast.error(
        `Failed to ${currentActive ? "deactivate" : "activate"} user: ${
          error.message
        }`
      );
    }
  };

  // Start editing a user
  const handleEditClick = (user: UserType) => {
    setEditingUser(user);
    setEditName(user.full_name || "");
    setEditIsAdmin(user.is_admin);
  };

  // Save user changes
  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      await updateUser(editingUser.id, {
        full_name: editName,
        is_admin: editIsAdmin,
      });

      toast.success("User updated successfully");
      setEditingUser(null);

      // Refresh user list
      const data = await fetchUsers();
      setUsers(data.items || []);
    } catch (error: any) {
      toast.error(`Failed to update user: ${error.message}`);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  // If user is not admin, show access denied with debug info
  if (!user?.is_admin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You don't have administrator privileges.</p>
            <p>Current user: {JSON.stringify(user)}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">You are logged in as: {user.email} (Admin)</p>

          {loading ? (
            <p>Loading users...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">ID</th>
                    <th className="border p-2 text-left">Email</th>
                    <th className="border p-2 text-left">Name</th>
                    <th className="border p-2 text-left">Active</th>
                    <th className="border p-2 text-left">Admin</th>
                    <th className="border p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border p-2 text-center">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="border p-2">{user.id}</td>
                        <td className="border p-2">{user.email}</td>
                        <td className="border p-2">{user.full_name || "-"}</td>
                        <td className="border p-2">
                          <span
                            className={
                              user.is_active ? "text-green-500" : "text-red-500"
                            }
                          >
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="border p-2">
                          {user.is_admin ? "Yes" : "No"}
                        </td>
                        <td className="border p-2">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleEditClick(user)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant={
                                user.is_active ? "destructive" : "default"
                              }
                              onClick={() =>
                                handleToggleActive(user.id, user.is_active)
                              }
                            >
                              {user.is_active ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      {editingUser && (
        <Card>
          <CardHeader>
            <CardTitle>Edit User: {editingUser.email}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isAdmin"
                  checked={editIsAdmin}
                  onCheckedChange={setEditIsAdmin}
                />
                <Label htmlFor="isAdmin">Administrator Privileges</Label>
              </div>

              <div className="flex space-x-2 mt-4">
                <Button onClick={handleSaveEdit}>Save Changes</Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 text-sm text-gray-500">
        <p>Debug Info:</p>
        <pre>
          {JSON.stringify(
            { currentUser: user, userCount: users.length },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
