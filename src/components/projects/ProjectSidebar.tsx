"use client";

import { useState } from "react";
import { ChevronLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { KnowledgeUploader } from "@/components/projects/KnowledgeUploader";
import type { Project, KnowledgeFile } from "@/types/project";

interface ProjectSidebarProps {
  project: Project;
  files: KnowledgeFile[];
  uploading: boolean;
  onUpdate: (updates: Partial<Pick<Project, "name" | "description" | "systemPrompt">>) => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
}

export function ProjectSidebar({
  project,
  files,
  uploading,
  onUpdate,
  onUpload,
  onDeleteFile,
}: ProjectSidebarProps) {
  const [systemPrompt, setSystemPrompt] = useState(project.systemPrompt ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onUpdate({ systemPrompt });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col h-full bg-surface-1 border-r border-white/6 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-white/6 shrink-0">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors mb-3"
        >
          <ChevronLeft size={13} />
          All Projects
        </Link>
        <h2 className="text-sm font-semibold text-white truncate">{project.name}</h2>
        {project.description && (
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{project.description}</p>
        )}
      </div>

      {/* System Prompt Editor */}
      <div className="p-4 border-b border-white/6 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Instructions</p>
          <button
            onClick={handleSave}
            disabled={saving || systemPrompt === project.systemPrompt}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
              bg-surya-500/10 text-surya-500 hover:bg-surya-500/20"
          >
            {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Describe how the AI should behave in this project…"
          rows={5}
          className="w-full bg-surface-2 text-xs text-white placeholder:text-gray-600 rounded-lg px-3 py-2 outline-none resize-none border border-white/6 focus:border-surya-500/40 transition-colors"
        />
      </div>

      {/* Knowledge Files */}
      <div className="p-4 flex-1">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-3">
          Knowledge Base
          {files.length > 0 && (
            <span className="ml-1.5 text-surya-500 normal-case">({files.length})</span>
          )}
        </p>
        <KnowledgeUploader
          files={files}
          projectId={project.id}
          uploading={uploading}
          onUpload={onUpload}
          onDelete={onDeleteFile}
        />
      </div>
    </div>
  );
}
