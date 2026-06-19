const supportedCommands = [
  {
    name: "dev",
    description:
      "prepare generated docs artifacts, then start the local Next.js docs app",
  },
  {
    name: "build",
    description:
      "prepare generated prerequisites, then create the production .next build",
  },
  {
    name: "test",
    description: "run the default website functionality test suite",
  },
  {
    name: "lint",
    description: "run the Biome lint check",
  },
  {
    name: "validate",
    description: "run typecheck, registry validation, and link validation",
  },
  {
    name: "generate",
    description: "regenerate the maintainer-visible derived content artifacts",
  },
  {
    name: "ci",
    description: "run the full maintainer quality gate sequence locally",
  },
  {
    name: "help",
    description: "print this supported maintainer workflow summary",
  },
] as const;

console.log("Supported maintainer workflow commands:");
for (const command of supportedCommands) {
  console.log(`- ${command.name}: ${command.description}`);
}
console.log("");
console.log(
  "Advanced generators and verification scripts remain available through explicit Make targets and Bun scripts when you need deeper diagnostics.",
);
