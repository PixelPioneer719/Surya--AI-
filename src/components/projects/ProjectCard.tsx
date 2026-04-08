"use client";

import Link from "next/link";
import { Folder, FileText, Trash2, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const fileCount = project.knowledgeFiles?.length ?? 0;

  return (
    <div className="group relative bg-surface-1 border border-white/8 rounded-2xl p-5 hover:border-surya-500/30 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-surya-500/10 flex items-center justify-center shrink-0">
            <Folder size={16} className="text-surya-500" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{project.name}</h3>
            {project.description && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{project.description}</p>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.preventDefault(); onDelete(project.id); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
          title="Delete project"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className={cn("flex items-center gap-1 text-[11px]", fileCount > 0 ? "text-gray-400" : "text-gray-600")}>
          <FileText size={11} />
          {fileCount} {fileCount === 1 ? "file" : "files"}
        </span>
        <span className="text-[11px] text-gray-600">
          Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
        </span>
      </div>

      <Link
        href={`/projects/${project.id}`}
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-medium
          bg-surya-500/10 hover:bg-surya-500/20 border border-surya-500/20 text-surya-500 transition-colors"
      >
        Open Project
        <ChevronRight size={13} />
      </Link>
    </div>
  );
}
