import { spawn } from "node:child_process";
import { CliError } from "./errors";

export async function openBrowser(url: string): Promise<void> {
  const program = process.platform === "win32" ? "rundll32.exe" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["url.dll,FileProtocolHandler", url] : [url];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(program, args, { stdio: "ignore", shell: false, windowsHide: true });
    child.once("error", () => reject(new CliError("Could not open your browser. Open the displayed URL yourself.")));
    child.once("exit", (code) => code === 0 ? resolve() : reject(new CliError("Could not open your browser. Open the displayed URL yourself.")));
  });
}
