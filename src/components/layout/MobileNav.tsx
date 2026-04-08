"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, FolderOpen, Settings, Menu } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { icon: MessageSquare, label: "Chat", href: "/chat" },
  { icon: FolderOpen, label: "Projects", href: "/projects" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function MobileNav() {
  const pathname = usePathname();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-surface-1 border-t border-white/6
        flex items-center justify-around z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map(({ icon: Icon, label, href }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex flex-col items-center gap-0.5 px-4 py-1 text-[10px] transition-colors",
            pathname.startsWith(href) ? "text-surya-500" : "text-gray-500"
          )}
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
      <button
        type="button"
        onClick={toggleSidebar}
        className="flex flex-col items-center gap-0.5 px-4 py-1 text-[10px] text-gray-500 transition-colors"
      >
        <Menu size={18} />
        Menu
      </button>
    </nav>
  );
}
