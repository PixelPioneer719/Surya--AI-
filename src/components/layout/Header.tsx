"use client";

import Link from "next/link";
import Image from "next/image";
import { PanelLeft, Bug } from "lucide-react";
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

      <span className="flex-1 flex items-center gap-2 text-sm font-medium text-gray-300 truncate">
        {!activeTitle && (
          <Image src="/logo.png" alt="Surya AI" width={20} height={20} className="rounded-sm shrink-0" />
        )}
        {activeTitle ?? "Surya AI"}
      </span>

      <button
        onClick={() => {
          const subject = encodeURIComponent("Bug Report — Surya AI");
          const body = encodeURIComponent(
            `Hi PVS Hariharan,\n\nI found a bug on Surya AI:\n\n[Describe the bug here]\n\nSteps to reproduce:\n1. \n2. \n3. \n\nExpected behavior:\n\nActual behavior:\n\nBrowser / device:\n\nThanks!`
          );
          window.open(
            `https://mail.google.com/mail/?view=cm&fs=1&to=pvshariharan324@gmail.com&su=${subject}&body=${body}`,
            "_blank",
            "noopener,noreferrer"
          );
        }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white bg-white/[0.04] hover:bg-surface-2 border border-white/8 transition-colors"
        title="Report a bug — opens Gmail"
      >
        <Bug size={12} className="text-red-400" />
        Report Bug
      </button>

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
