"use client";

import Link from "next/link";
import { PanelLeft } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/uiStore";
import { useChatStore } from "@/stores/chatStore";
import { useUserStore } from "@/stores/userStore";

export function Header() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const { conversations, activeConversationId } = useChatStore();
  const user = useUserStore((s) => s.user);

  const activeTitle =
    conversations.find((c) => c.id === activeConversationId)?.title;

  return (
    <header className="h-12 flex items-center px-4 border-b border-white/6 bg-surface-1/50 backdrop-blur-sm shrink-0 gap-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="h-8 w-8 text-gray-400 hover:text-white"
      >
        <PanelLeft size={16} />
      </Button>

      <span className="flex-1 text-sm font-medium text-gray-300 truncate">
        {activeTitle ?? "Surya AI"}
      </span>

      <Link href="/settings">
        <Avatar className="w-7 h-7">
          <AvatarImage src={user?.avatar} />
          <AvatarFallback className="bg-surya-500/20 text-surya-500 text-xs">
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </AvatarFallback>
        </Avatar>
      </Link>
    </header>
  );
}
