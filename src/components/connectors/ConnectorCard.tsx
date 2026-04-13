"use client";

import { GitBranch, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectorCardProps {
  provider: "google" | "github";
  connected: boolean;
  email?: string;
  expiresAt?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  isLoading?: boolean;
}

const GOOGLE_SCOPES = ["Gmail", "Drive", "Calendar", "Docs"];

function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function ConnectorCard({
  provider,
  connected,
  email,
  onConnect,
  onDisconnect,
  isLoading = false,
}: ConnectorCardProps) {
  const isGoogle = provider === "google";

  return (
    <div className="bg-surface-1 border border-white/8 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        {/* Left: icon + info */}
        <div className="flex items-start gap-3 min-w-0">
          {/* Provider icon */}
          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-surface-2 border border-white/8 shrink-0 mt-0.5">
            {isGoogle ? (
              <GoogleIcon size={16} />
            ) : (
              <GitBranch size={16} className="text-gray-300" />
            )}
          </div>

          {/* Name, email, scopes */}
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-white">
                {isGoogle ? "Google Workspace" : "GitHub"}
              </span>
              {/* Status badge */}
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium",
                  connected
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                    : "bg-white/5 text-gray-500 border-white/10"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    connected ? "bg-emerald-400" : "bg-gray-600"
                  )}
                />
                {connected ? "Connected" : "Not Connected"}
              </span>
            </div>

            {/* Email (Google only, when connected) */}
            {isGoogle && connected && email && (
              <p className="text-xs text-gray-500 truncate">{email}</p>
            )}

            {/* Scope pills (Google only, when connected) */}
            {isGoogle && connected && (
              <div className="flex items-center flex-wrap gap-1 pt-0.5">
                {GOOGLE_SCOPES.map((scope) => (
                  <span
                    key={scope}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/8 text-gray-400"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: action button */}
        <div className="shrink-0">
          {connected ? (
            <button
              type="button"
              onClick={onDisconnect}
              disabled={isLoading}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs px-3 h-7 rounded-lg border transition-colors",
                "border-white/10 text-gray-400",
                "hover:border-red-500/40 hover:text-red-400",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 size={11} className="animate-spin" />
              ) : null}
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={onConnect}
              disabled={isLoading}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs px-3 h-7 rounded-lg transition-colors",
                "bg-surya-500 hover:bg-surya-700 text-white",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 size={11} className="animate-spin" />
              ) : null}
              Connect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
