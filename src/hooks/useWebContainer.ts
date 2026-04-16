"use client";

import { useState, useCallback, useRef } from "react";
import {
  bootWebContainer,
  mountFiles,
  runCommand,
  type FileTree,
} from "@/lib/webcontainer";
import type { WebContainer } from "@webcontainer/api";

export type WCStatus =
  | "idle"
  | "booting"
  | "installing"
  | "starting"
  | "ready"
  | "error";

export interface UseWebContainerReturn {
  status: WCStatus;
  previewUrl: string | null;
  terminalOutput: string;
  fileTree: FileTree;
  selectedFile: string | null;
  selectedFileContent: string;
  error: string | null;
  mountApp: (files: FileTree) => Promise<void>;
  editFile: (path: string, content: string) => Promise<void>;
  selectFile: (path: string) => void;
}

export function useWebContainer(): UseWebContainerReturn {
  const [status, setStatus] = useState<WCStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [fileTree, setFileTree] = useState<FileTree>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const wcRef = useRef<WebContainer | null>(null);

  const appendTerminal = useCallback((chunk: string) => {
    setTerminalOutput((prev) => prev + chunk);
  }, []);

  const mountApp = useCallback(
    async (files: FileTree) => {
      setTerminalOutput("");
      setPreviewUrl(null);
      setError(null);
      setFileTree(files);

      // Auto-select first file
      const sortedKeys = Object.keys(files).sort();
      const firstFile = sortedKeys[0] ?? null;
      setSelectedFile(firstFile);
      setSelectedFileContent(firstFile ? (files[firstFile] ?? "") : "");

      try {
        setStatus("booting");
        appendTerminal("⚡ Booting WebContainer...\n");
        const wc = await bootWebContainer();
        wcRef.current = wc;

        // Listen for dev server ready
        wc.on("server-ready", (_port: number, url: string) => {
          setPreviewUrl(url);
          setStatus("ready");
          appendTerminal(`\n✅ Server ready at ${url}\n`);
        });

        setStatus("installing");
        appendTerminal("📦 Mounting files...\n");
        await mountFiles(wc, files);

        appendTerminal("⬇️  Installing dependencies...\n");
        const installExit = await runCommand(
          wc,
          "npm",
          ["install"],
          appendTerminal
        );

        if (installExit !== 0) {
          throw new Error(`npm install failed with exit code ${installExit}`);
        }

        setStatus("starting");
        appendTerminal("\n🚀 Starting dev server...\n");
        // Don't await — dev server runs indefinitely
        runCommand(wc, "npm", ["run", "dev"], appendTerminal).catch(() => {});
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        setStatus("error");
        appendTerminal(`\n❌ Error: ${msg}\n`);
      }
    },
    [appendTerminal]
  );

  const editFile = useCallback(
    async (path: string, content: string) => {
      if (!wcRef.current) return;
      try {
        await wcRef.current.fs.writeFile(path, content);
        setFileTree((prev) => ({ ...prev, [path]: content }));
        if (selectedFile === path) {
          setSelectedFileContent(content);
        }
      } catch (err) {
        console.error("[webcontainer] editFile error:", err);
      }
    },
    [selectedFile]
  );

  const selectFile = useCallback(
    (path: string) => {
      setSelectedFile(path);
      setSelectedFileContent(fileTree[path] ?? "");
    },
    [fileTree]
  );

  return {
    status,
    previewUrl,
    terminalOutput,
    fileTree,
    selectedFile,
    selectedFileContent,
    error,
    mountApp,
    editFile,
    selectFile,
  };
}
