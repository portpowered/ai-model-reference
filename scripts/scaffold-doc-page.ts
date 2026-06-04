import {
  formatScaffoldPlan,
  formatScaffoldUsage,
  parseScaffoldDocPageArgv,
  ScaffoldDocPageError,
  scaffoldDocPage,
} from "../src/lib/content/scaffold-doc-page";

const argv = process.argv.slice(2);

if (argv.includes("--help") || argv.includes("-h")) {
  console.log(formatScaffoldUsage());
  process.exit(0);
}

try {
  const input = parseScaffoldDocPageArgv(argv);
  const result = await scaffoldDocPage(input);
  console.log(formatScaffoldPlan(result));
  if (input.dryRun) {
    console.log("Dry run complete — no files written.");
  } else {
    console.log("Scaffold complete.");
  }
} catch (error) {
  if (error instanceof ScaffoldDocPageError) {
    console.error(error.message);
    console.error("");
    console.error(formatScaffoldUsage());
    process.exit(1);
  }
  throw error;
}
