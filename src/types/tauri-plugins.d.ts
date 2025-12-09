declare module "@tauri-apps/plugin-dialog" {
  export function save(options?: { defaultPath?: string }): Promise<string | null>;
}

declare module "@tauri-apps/plugin-fs" {
  export function writeFile(
    path: string,
    contents: Uint8Array | ArrayBuffer | string,
  ): Promise<void>;
}
