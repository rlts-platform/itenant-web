import { Suspense } from "react";
import { ClientSidebar } from "@/components/client/ClientSidebar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <ClientSidebar />
      <main className="ml-64 flex-1 min-h-screen">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          }>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
