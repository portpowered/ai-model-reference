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

const internalCommands = [
  {
    makeTarget: "internal-typecheck",
    bunScript: "bun run internal:typecheck",
    description:
      "run the raw TypeScript compile check used inside validate and ci",
  },
  {
    makeTarget: "internal-build-export",
    bunScript: "bun run build:export",
    description: "build the static export and run export-specific verifiers",
  },
  {
    makeTarget: "internal-validate-data",
    bunScript: "bun run internal:validate-data",
    description:
      "run focused registry and content validation without the full validate aggregate",
  },
  {
    makeTarget: "internal-linkcheck",
    bunScript: "bun run internal:linkcheck",
    description:
      "run focused docs link validation without the full validate aggregate",
  },
  {
    makeTarget: "internal-test-build-contract",
    bunScript: "bun run test:build-contract",
    description:
      "run the build and export contract suites that ci fans out separately",
  },
  {
    makeTarget: "internal-test-integration",
    bunScript: "bun run test:integration",
    description: "run the post-build production integration manifest",
  },
  {
    makeTarget: "internal-help",
    bunScript: "bun run internal:help",
    description: "print this internal command summary",
  },
] as const;

const showInternalHelp = process.argv.includes("--internal");

if (showInternalHelp) {
  console.log("Internal Make/Bun command surface:");
  for (const command of internalCommands) {
    console.log(
      `- ${command.makeTarget} / ${command.bunScript}: ${command.description}`,
    );
  }
} else {
  console.log("Supported maintainer workflow commands:");
  for (const command of supportedCommands) {
    console.log(`- ${command.name}: ${command.description}`);
  }
  console.log("");
  console.log(
    "Run `make internal-help` or `bun run internal:help` only when you need deeper diagnostics or specialist workflows.",
  );
}
