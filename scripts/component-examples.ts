#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const PORT_RANGE_START = 3100;
const PORT_RANGE_END = 3999;

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function findFreePort(): Promise<number> {
  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port += 1) {
    if (await isPortFree(port)) {
      return port;
    }
  }
  throw new Error(
    `No free port found in ${PORT_RANGE_START}-${PORT_RANGE_END}`,
  );
}

const port = await findFreePort();
const url = `http://127.0.0.1:${port}/component-examples`;

console.log(`Starting component example harness on ${url}`);
console.log("Press Ctrl+C to stop.");

const child = spawn("bun", ["run", "dev", "--", "-p", String(port)], {
  stdio: "inherit",
  env: {
    ...process.env,
    ENABLE_COMPONENT_EXAMPLES: "1",
  },
});

function shutdown(signal: NodeJS.Signals) {
  if (!child.killed) {
    child.kill(signal);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(0);
  }
  process.exit(code ?? 0);
});
