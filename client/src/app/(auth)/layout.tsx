import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="hidden md:flex md:w-1/2 bg-primary p-6 text-white flex-col justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-white text-primary font-bold rounded-full w-10 h-10 flex items-center justify-center">
            DP
          </div>
          <h1 className="text-2xl font-bold">DeepPurple</h1>
        </div>

        <div className="py-12">
          <h2 className="text-3xl font-bold mb-4">Turn words into insights</h2>
          <p className="text-lg opacity-90">
            Analyze client communications, decipher emotions, and understand
            sentiment with our powerful AI platform.
          </p>
        </div>

        <div className="text-sm opacity-75">
          © {new Date().getFullYear()} DeepPurple. All rights reserved.
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="md:hidden p-4 flex items-center gap-2">
          <div className="bg-primary text-white font-bold rounded-full w-8 h-8 flex items-center justify-center">
            DP
          </div>
          <h1 className="text-xl font-bold">DeepPurple</h1>
        </div>

        <main className="flex-1 flex items-center justify-center">
          {children}
        </main>

        <div className="md:hidden p-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} DeepPurple. All rights reserved.
        </div>
      </div>
    </div>
  );
}
