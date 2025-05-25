import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header with logo */}
      <header className="w-full py-6 flex justify-center border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-white font-bold rounded-full w-8 h-8 flex items-center justify-center">
            DP
          </div>
          <h1 className="text-xl font-medium text-gray-900">DeepPurple</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-gray-500">
        <div className="max-w-md mx-auto px-4">
          <p>© {new Date().getFullYear()} DeepPurple. All rights reserved.</p>
          <div className="mt-2 flex justify-center space-x-4">
            <a href="#" className="hover:text-gray-700 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-700 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-700 transition-colors">Help</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
