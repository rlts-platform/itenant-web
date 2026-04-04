"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/tenant", label: "Home" },
  { href: "/tenant/requests", label: "Requests" },
  { href: "/tenant/payments", label: "Payments" },
  { href: "/tenant/messages", label: "Messages" },
  { href: "/tenant/profile", label: "More" },
];

export function TenantNav() {
  const path = usePathname();
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-3xl px-6">
        <div className="flex items-center justify-between py-3">
          {items.map((it) => {
            const active = path === it.href || (it.href !== "/tenant" && path.startsWith(it.href));
            return (
              <Link
                key={it.href}
                href={it.href}
                className={
                  "text-xs font-semibold px-3 py-2 rounded-xl " +
                  (active ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-100")
                }
              >
                {it.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
