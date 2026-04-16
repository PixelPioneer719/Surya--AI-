"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronDown,
  FileCode2,
  FileText,
  FileJson,
  FileImage,
  File,
  FolderOpen,
  Folder,
} from "lucide-react";
import type { FileTree } from "@/lib/webcontainer";

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeNode[];
}

function buildTree(files: FileTree): TreeNode[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const root: Record<string, any> = {};

  for (const filePath of Object.keys(files).sort()) {
    const parts = filePath.split("/").filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: Record<string, any> = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const currentPath = parts.slice(0, i + 1).join("/");
      const isFile = i === parts.length - 1;

      if (!node[part]) {
        node[part] = {
          _meta: {
            name: part,
            path: currentPath,
            type: isFile ? "file" : "directory",
          },
          _children: {},
        };
      }
      node = node[part]._children;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function toNodes(obj: Record<string, any>): TreeNode[] {
    return Object.values(obj)
      .map((entry) => {
        const meta = entry._meta as TreeNode;
        const childNodes = toNodes(entry._children);
        return {
          ...meta,
          children: meta.type === "directory" ? childNodes : undefined,
        };
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  return toNodes(root);
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const cls = "w-3.5 h-3.5 flex-shrink-0";
  if (["js", "jsx"].includes(ext)) return <FileCode2 className={`${cls} text-yellow-400`} />;
  if (["ts", "tsx"].includes(ext)) return <FileCode2 className={`${cls} text-blue-400`} />;
  if (ext === "html") return <FileCode2 className={`${cls} text-orange-400`} />;
  if (ext === "css") return <FileCode2 className={`${cls} text-purple-400`} />;
  if (ext === "json") return <FileJson className={`${cls} text-gray-400`} />;
  if (["png", "jpg", "jpeg", "svg", "gif", "ico"].includes(ext))
    return <FileImage className={`${cls} text-green-400`} />;
  if (["md", "txt"].includes(ext)) return <FileText className={`${cls} text-gray-300`} />;
  return <File className={`${cls} text-gray-400`} />;
}

interface TreeNodeRowProps {
  node: TreeNode;
  depth: number;
  selectedFile: string | null;
  onSelect: (path: string) => void;
}

function TreeNodeRow({ node, depth, selectedFile, onSelect }: TreeNodeRowProps) {
  const [open, setOpen] = useState(true);
  const isSelected = selectedFile === node.path;
  const paddingLeft = 8 + depth * 12;

  if (node.type === "directory") {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 w-full py-0.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
          style={{ paddingLeft }}
        >
          {open ? (
            <ChevronDown className="w-3 h-3 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
          )}
          {open ? (
            <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-surya-500" />
          ) : (
            <Folder className="w-3.5 h-3.5 flex-shrink-0 text-surya-500" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              {(node.children ?? []).map((child) => (
                <TreeNodeRow
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  selectedFile={selectedFile}
                  onSelect={onSelect}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`flex items-center gap-1.5 w-full py-0.5 text-xs rounded transition-colors ${
        isSelected
          ? "bg-surya-500/20 text-surya-500"
          : "text-gray-300 hover:text-white hover:bg-white/5"
      }`}
      style={{ paddingLeft }}
    >
      {getFileIcon(node.name)}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

interface FileTreeProps {
  files: FileTree;
  selectedFile: string | null;
  onSelect: (path: string) => void;
}

export function FileTreeComponent({ files, selectedFile, onSelect }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  if (Object.keys(files).length === 0) {
    return <div className="p-3 text-xs text-gray-500 italic">No files yet</div>;
  }

  return (
    <div className="py-1">
      {tree.map((node) => (
        <TreeNodeRow
          key={node.path}
          node={node}
          depth={0}
          selectedFile={selectedFile}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
