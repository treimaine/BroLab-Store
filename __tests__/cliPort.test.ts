import { choosePort, CliOptions } from "../server/lib/cliPort";
import * as portUtils from "../server/lib/findFreePort";
// __tests__/cliPort.test.ts

describe("Port CLI logic (prompt & flags)", () => {
  let originalArgv: string[];
  let originalIsTTY: boolean | undefined;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    originalArgv = process.argv;
    originalIsTTY = process.stdin.isTTY;
    exitSpy = jest.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit: ${code}`);
    }) as never);
  });
  afterEach(() => {
    process.argv = originalArgv;
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = originalIsTTY;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("1) Mode auto sans TTY : flags --auto, findFreePort appelé, pas de prompt", async () => {
    process.argv = ["node", "server/index.ts", "--auto"];
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = false;
    const findFreePortMock = jest.spyOn(portUtils, "findFreePort").mockResolvedValue(5050);
    const opts: CliOptions = {
      base: 5000,
      maxTries: 10,
      auto: true,
      argv: process.argv,
      isTTY: false,
    };
    const result = await choosePort(opts);
    expect(findFreePortMock).toHaveBeenCalledWith(5000, 10);
    expect(result).toBe(5050);
  });

  it('2) TTY + prompt "A" (auto) : promptForPort renvoie auto:true, findFreePort appelé', async () => {
    process.argv = ["node", "server/index.ts"];
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = true;
    const promptMock = jest
      .spyOn(portUtils, "promptForPort")
      .mockResolvedValue({ port: 0, auto: true });
    const findFreePortMock = jest
      .spyOn(portUtils, "findFreePort")
      .mockRejectedValueOnce(new Error("EADDRINUSE"))
      .mockResolvedValueOnce(5051);
    const opts: CliOptions = {
      base: 5000,
      maxTries: 10,
      auto: false,
      argv: process.argv,
      isTTY: true,
    };
    const result = await choosePort(opts);
    expect(promptMock).toHaveBeenCalledTimes(1);
    expect(findFreePortMock).toHaveBeenCalledTimes(2);
    expect(result).toBe(5051);
  });

  it("3) TTY, user tape un port manuel", async () => {
    process.argv = ["node", "server/index.ts"];
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = true;
    const promptMock = jest
      .spyOn(portUtils, "promptForPort")
      .mockResolvedValue({ port: 5052, auto: false });
    const findFreePortMock = jest
      .spyOn(portUtils, "findFreePort")
      .mockRejectedValueOnce(new Error("EADDRINUSE"))
      .mockResolvedValueOnce(5052);
    const opts: CliOptions = {
      base: 5000,
      maxTries: 10,
      auto: false,
      argv: process.argv,
      isTTY: true,
    };
    const result = await choosePort(opts);
    expect(promptMock).toHaveBeenCalledTimes(1);
    expect(findFreePortMock).toHaveBeenCalledWith(5052, 10);
    expect(result).toBe(5052);
  });

  it("4) Flags CLI : --port=5055 --max-tries=3", async () => {
    process.argv = ["node", "server/index.ts", "--port=5055", "--max-tries=3"];
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = false;
    const findFreePortMock = jest.spyOn(portUtils, "findFreePort").mockResolvedValue(5055);
    const opts: CliOptions = {
      base: 5055,
      maxTries: 3,
      auto: false,
      argv: process.argv,
      isTTY: false,
    };
    const result = await choosePort(opts);
    expect(findFreePortMock).toHaveBeenCalledWith(5055, 3);
    expect(result).toBe(5055);
  });

  it("5) Erreur : aucun port libre", async () => {
    process.argv = ["node", "server/index.ts", "--auto"];
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = false;
    const findFreePortMock = jest
      .spyOn(portUtils, "findFreePort")
      .mockRejectedValue(new Error("Aucun port libre"));
    const opts: CliOptions = {
      base: 5000,
      maxTries: 2,
      auto: true,
      argv: process.argv,
      isTTY: false,
    };
    await expect(choosePort(opts)).rejects.toThrow("process.exit: 1");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(findFreePortMock).toHaveBeenCalled();
  });

  it('6) User tape "q" dans le prompt : process.exit appelé', async () => {
    process.argv = ["node", "server/index.ts"];
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = true;
    const findFreePortMock = jest
      .spyOn(portUtils, "findFreePort")
      .mockRejectedValue(new Error("EADDRINUSE"));
    const promptMock = jest.spyOn(portUtils, "promptForPort").mockImplementation(() => {
      process.exit(0); // mocké pour throw
      return Promise.reject(new Error("process.exit: 0")); // unreachable, mais pour Jest
    });
    const opts: CliOptions = {
      base: 5000,
      maxTries: 10,
      auto: false,
      argv: process.argv,
      isTTY: true,
    };
    expect.assertions(2);
    await expect(choosePort(opts)).rejects.toThrow("process.exit: 0");
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("7) Conflit env vs flag : flag --port=6000 prime sur process.env.PORT", async () => {
    process.env.PORT = "5000";
    process.argv = ["node", "server/index.ts", "--port=6000", "--auto"];
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = false;
    const findFreePortMock = jest.spyOn(portUtils, "findFreePort").mockResolvedValue(6000);
    const opts: CliOptions = {
      base: 6000,
      maxTries: 10,
      auto: true,
      argv: process.argv,
      isTTY: false,
      envPort: 5000,
    };
    const result = await choosePort(opts);
    expect(findFreePortMock).toHaveBeenCalledWith(6000, 10);
    expect(result).toBe(6000);
    delete process.env.PORT;
  });
});
