import net from "node:net";
import readline from "node:readline";

interface NodeError extends Error {
  code?: string;
}

export async function findFreePort(preferred: number, maxTries = 10): Promise<number> {
  for (let i = 0; i < maxTries; i++) {
    const port = preferred + i;
    try {
      await new Promise<void>((resolve, reject) => {
        const tester = net
          .createServer()
          .once("error", (err: NodeError) => {
            reject(err);
          })
          .once("listening", () => {
            tester.close(() => resolve());
          })
          .listen(port, "127.0.0.1");
      });
      return port;
    } catch {
      // Port is busy, try the next one
    }
  }
  throw new Error(`No free port found between ${preferred} and ${preferred + maxTries - 1}`);
}

export async function promptForPort(
  base: number,
  _maxTries: number
): Promise<{ port: number; auto: boolean }> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(
      `Port ${base} is busy. What to do?\n` + `  [Enter a port]  [a]uto  [q]uit\n> `,
      answer => {
        rl.close();
        if (answer.trim().toLowerCase() === "a") resolve({ port: base, auto: true });
        else if (answer.trim().toLowerCase() === "q") process.exit(0);
        else {
          const port = Number(answer.trim());
          if (!Number.isNaN(port) && port > 0 && port < 65536) resolve({ port, auto: false });
          else resolve({ port: base, auto: true });
        }
      }
    );
  });
}

export function parsePortFlags(): { port?: number; auto?: boolean; maxTries?: number } {
  const args = process.argv.slice(2);
  let port, auto, maxTries;
  for (const arg of args) {
    if (arg.startsWith("--port=")) port = Number(arg.split("=")[1]);
    if (arg === "--auto") auto = true;
    if (arg.startsWith("--max-tries=")) maxTries = Number(arg.split("=")[1]);
  }
  return { port, auto, maxTries };
}
