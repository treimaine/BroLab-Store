import { findFreePort, promptForPort } from './findFreePort';

export interface CliOptions {
  base: number;
  maxTries: number;
  auto: boolean;
  argv: string[];
  isTTY: boolean;
  envPort?: number;
}

export async function choosePort(opts: CliOptions): Promise<number> {
  let basePort = opts.base;
  let tries = opts.maxTries;
  let port: number;
  let found = false;
  while (!found) {
    try {
      port = await findFreePort(basePort, tries);
      found = true;
    } catch (err) {
      if (opts.isTTY && !opts.auto) {
        const { port: chosenPort, auto: wantAuto } = await promptForPort(basePort, tries);
        if (wantAuto) {
          basePort++;
          continue;
        }
        basePort = chosenPort;
      } else {
        console.error(`\n❌ Impossible de trouver un port libre entre ${basePort} et ${basePort + tries - 1}.`);
        console.error('Pour libérer un port :');
        console.error('- Windows : netstat -ano | findstr :<port> puis taskkill /PID <pid> /F');
        console.error('- Unix/macOS : lsof -i :<port> puis kill -9 <pid>');
        process.exit(1);
      }
    }
  }
  return port!;
} 