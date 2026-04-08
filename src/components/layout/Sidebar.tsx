"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Settings, MessageSquare, FolderOpen } from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useChatStore } from "@/stores/chatStore";
import { useUIStore } from "@/stores/uiStore";
import { useUserStore } from "@/stores/userStore";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/chat";

function groupConversations(conversations: Conversation[]) {
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const older: Conversation[] = [];

  for (const conv of conversations) {
    const date = new Date(conv.updatedAt);
    if (isToday(date)) today.push(conv);
    else if (isYesterday(date)) yesterday.push(conv);
    else older.push(conv);
  }

  return { today, yesterday, older };
}

export function Sidebar() {
  const { conversations, setConversations, activeConversationId } = useChatStore();
  const { sidebarOpen } = useUIStore();
  const user = useUserStore((s) => s.user);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.documents) setConversations(data.documents);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when active conversation changes to one not in the list
  useEffect(() => {
    if (!activeConversationId) return;
    const exists = conversations.some((c) => c.id === activeConversationId);
    if (!exists) {
      fetch("/api/conversations")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.documents) setConversations(data.documents);
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  const { today, yesterday, older } = groupConversations(conversations);

  function ConvGroup({ label, items }: { label: string; items: Conversation[] }) {
    if (items.length === 0) return null;
    return (
      <div>
        <p className="text-[10px] text-gray-600 uppercase px-3 pt-3 pb-1 font-medium tracking-wider">
          {label}
        </p>
        {items.map((conv) => (
          <Link
            key={conv.id}
            href={`/chat/${conv.id}`}
            className={cn(
              "flex items-center gap-2 px-3 py-2 mx-1 rounded-lg text-sm transition-colors group",
              conv.id === activeConversationId
                ? "bg-surface-2 text-white"
                : "text-gray-400 hover:bg-surface-2/60 hover:text-white"
            )}
          >
            <MessageSquare size={13} className="shrink-0 opacity-50" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs">{conv.title || "New conversation"}</p>
              <p className="text-[10px] text-gray-600">
                {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-surface-1 border-r border-white/6 transition-all duration-200 shrink-0 overflow-hidden",
        sidebarOpen ? "w-[260px]" : "w-0"
      )}
    >
      {/* New Chat + Projects */}
      <div className="p-3 space-y-1.5">
        <Link
          href="/chat"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-medium
            bg-surya-500/10 hover:bg-surya-500/20 border border-surya-500/20 text-surya-500
            transition-colors"
        >
          <Plus size={15} />
          New Chat
        </Link>
        <Link
          href="/projects"
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-medium transition-colors",
            pathname.startsWith("/projects")
              ? "bg-surface-2 text-white"
              : "text-gray-500 hover:text-white hover:bg-surface-2/60"
          )}
        >
          <FolderOpen size={15} />
          Projects
        </Link>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="text-xs text-gray-600 px-4 py-3">No conversations yet.</p>
        ) : (
          <>
            <ConvGroup label="Today" items={today} />
            <ConvGroup label="Yesterday" items={yesterday} />
            <ConvGroup label="Older" items={older} />
          </>
        )}
      </div>

      {/* User avatar + settings */}
      <div className="border-t border-white/6 p-3 flex items-center gap-2">
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={user?.avatar} />
          <AvatarFallback className="bg-surya-500/20 text-surya-500 text-xs">
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white truncate">{user?.name ?? "User"}</p>
          <p className="text-[10px] text-gray-500 capitalize">{user?.plan ?? "free"}</p>
        </div>
        <Link
          href="/settings"
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            pathname.startsWith("/settings")
              ? "text-surya-500"
              : "text-gray-500 hover:text-white hover:bg-surface-2"
          )}
        >
          <Settings size={14} />
        </Link>
      </div>
    </aside>
  );
}
