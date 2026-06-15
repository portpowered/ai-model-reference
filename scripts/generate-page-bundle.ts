import {
  formatGeneratePageBundleUsage,
  GeneratePageBundleCliError,
  parseGeneratePageBundleArgv,
  runGeneratePageBundleCli,
} from "../src/lib/content/generate-page-bundle-cli";

const argv = process.argv.slice(2);

if (argv.includes("--help") || argv.includes("-h")) {
  console.log(formatGeneratePageBundleUsage());
  process.exit(0);
}

try {
  const input = parseGeneratePageBundleArgv(argv);
  const result = await runGeneratePageBundleCli(input);
  console.log(result.plan);
  if (result.dryRun) {
    console.log("Dry run complete — no files written.");
  } else {
    console.log("Page bundle generation complete.");
  }
} catch (error) {
  if (error instanceof GeneratePageBundleCliError) {
    console.error(error.message);
    if (error.category === "usage") {
      console.error("");
      console.error(formatGeneratePageBundleUsage());
    }
    process.exit(1);
  }
  throw error;
}
