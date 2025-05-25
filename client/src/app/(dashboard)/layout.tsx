"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LogOut,
  MessageSquare,
  User,
  Menu,
  X,
  ShieldAlert,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive: boolean;
}

function NavItem({ icon, label, href, isActive }: NavItemProps) {
  return (
    <Link href={href} className="w-full">
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={`w-full justify-start ${
          isActive
            ? "bg-purple-50 text-purple-700 hover:bg-purple-100"
            : "hover:bg-purple-50 hover:text-purple-700"
        }`}
      >
        <span className="flex items-center">
          <span className="mr-2">{icon}</span>
          <span>{label}</span>
        </span>
      </Button>
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);
  const { user, logout } = useAuth();
  
  // Add a state to force re-render when user data changes
  const [forceUpdate, setForceUpdate] = React.useState(0);
  
  // Listen for user-updated events
  React.useEffect(() => {
    const handleUserUpdated = () => {
      // Force re-render of the component
      setForceUpdate(prev => prev + 1);
    };
    
    // Add event listener for custom user-updated event
    window.addEventListener('user-updated', handleUserUpdated);
    
    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener('user-updated', handleUserUpdated);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Error logging out");
    }
  };

  const navigation = [
    { icon: <Home size={18} />, label: "Dashboard", href: "/dashboard" },
    { icon: <MessageSquare size={18} />, label: "Sessions", href: "/sessions" },
    { icon: <User size={18} />, label: "Profile", href: "/profile" },
    { icon: <ShieldAlert size={18} />, label: "Admin", href: "/admin" },
  ];

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

  const renderNavItems = () => (
    <>
      {navigation.map((item) => (
        <NavItem
          key={item.href}
          icon={item.icon}
          label={item.label}
          href={item.href}
          isActive={pathname === item.href}
        />
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Header */}
      <header className="md:hidden flex justify-between items-center p-4 border-b bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-purple-600 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center">
            DP
          </div>
          <h1 className="text-xl font-bold text-purple-700">DeepPurple</h1>
        </div>

        <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu size={18} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-purple-600 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center">
                    DP
                  </div>
                  <h1 className="text-xl font-bold text-purple-700">
                    DeepPurple
                  </h1>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  <X size={18} />
                </Button>
              </div>

              <div className="p-4">
                <Button variant="outline" className="w-full justify-start mb-4">
                  <Plus size={18} className="mr-2" />
                  New Session
                </Button>
              </div>

              <nav className="flex-1 p-4 flex flex-col gap-1">
                {renderNavItems()}
              </nav>

              <div className="p-4 border-t">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <span className="flex items-center">
                    <LogOut size={18} className="mr-2" />
                    <span>Logout</span>
                  </span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <div className="flex h-screen md:h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:w-64 border-r flex-col bg-white">
          <div className="p-4 border-b flex items-center gap-2">
            <div className="bg-purple-600 text-white font-bold rounded-full w-10 h-10 flex items-center justify-center">
              DP
            </div>
            <h1 className="text-xl font-bold text-purple-700">DeepPurple</h1>
          </div>

          <div className="p-4">
            <Link href="/sessions">
              <Button variant="outline" className="w-full justify-start">
                <Plus size={18} className="mr-2" />
                New Session
              </Button>
            </Link>
          </div>

          <nav className="flex-1 p-4 flex flex-col gap-1">
            {renderNavItems()}
          </nav>

          <div className="p-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Avatar>
                  <AvatarImage 
                    src={user?.profile_picture ? 
                      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/users/profile-picture/${user.profile_picture}` : 
                      ""} 
                  />
                  <AvatarFallback className="bg-purple-100 text-purple-700">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {user?.full_name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email || ""}
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <span className="flex items-center">
                <LogOut size={18} className="mr-2" />
                <span>Logout</span>
              </span>
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
          {/* Desktop Header */}
          <header className="hidden md:flex items-center justify-end p-4 border-b bg-white shadow-sm">
            <div className="flex items-center">
              <Avatar className="cursor-pointer">
                <AvatarImage 
                  src={user?.profile_picture ? 
                    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/users/profile-picture/${user.profile_picture}` : 
                    ""} 
                />
                <AvatarFallback className="bg-purple-100 text-purple-700">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
