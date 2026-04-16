/**
 * WebContainer singleton — boots once per browser tab, reused across mounts.
 * Requires COOP/COEP headers (already configured in next.config.ts).
 */
import { WebContainer } from "@webcontainer/api";

export type FileTree = Record<string, string>; // flat: "src/App.jsx" → file contents

let _instance: WebContainer | null = null;
let _booting: Promise<WebContainer> | null = null;

export async function bootWebContainer(): Promise<WebContainer> {
  if (_instance) return _instance;
  if (_booting) return _booting;

  _booting = WebContainer.boot().then((wc) => {
    _instance = wc;
    _booting = null;
    return wc;
  });

  return _booting;
}

/**
 * Convert flat FileTree {"src/App.jsx": "..."} to the nested structure
 * WebContainer.mount() expects: {src: {directory: {App.jsx: {file: {contents}}}}}
 */
function buildMountTree(files: FileTree): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tree: Record<string, any> = {};

  for (const [filePath, contents] of Object.entries(files)) {
    const parts = filePath.split("/").filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: Record<string, any> = tree;

    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i];
      if (!node[dir]) {
        node[dir] = { directory: {} };
      }
      node = node[dir].directory;
    }

    const fileName = parts[parts.length - 1];
    node[fileName] = { file: { contents } };
  }

  return tree;
}

export async function mountFiles(
  wc: WebContainer,
  files: FileTree
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wc.mount(buildMountTree(files) as any);
}

export async function runCommand(
  wc: WebContainer,
  cmd: string,
  args: string[],
  onOutput: (chunk: string) => void
): Promise<number> {
  const proc = await wc.spawn(cmd, args);
  proc.output.pipeTo(
    new WritableStream({ write(chunk) { onOutput(chunk); } })
  );
  return proc.exit;
}
