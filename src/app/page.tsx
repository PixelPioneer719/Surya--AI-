"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-background">
      {/* CSS radial glow background — no Three.js */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(26,115,232,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Foreground content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 text-center">
        {/* Logo */}
        <Image
          src="/logo.png"
          alt="Surya AI"
          width={72}
          height={72}
          className="rounded-2xl"
          priority
        />

        {/* Wordmark */}
        <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
          Surya <span className="text-surya-500">AI</span>
        </h1>

        {/* Tagline */}
        <p className="text-lg text-gray-400 max-w-sm">
          The AI that thinks with you
        </p>

        {/* Sub-description */}
        <p className="text-sm text-gray-600 max-w-md">
          Powered by Claude Sonnet & Opus. Built for people who want
          perfect results — not prompting expertise.
        </p>

        {/* CTA */}
        <Link
          href="/chat"
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-surya-500 hover:bg-surya-700
            text-white font-medium text-sm transition-colors mt-2"
        >
          Start for free
          <ArrowRight size={15} />
        </Link>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          {[
            "Multi-model",
            "Extended Thinking",
            "Artifacts",
            "Projects",
            "Voice Mode",
            "App Builder",
          ].map((feat) => (
            <span
              key={feat}
              className="px-3 py-1 rounded-full text-xs border border-white/10 text-gray-500 bg-surface-1/50"
            >
              {feat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
