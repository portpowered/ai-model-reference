import {
  formatValidationErrors,
  validateRegistryContent,
} from "../src/lib/content/validate-registry";

const errors = await validateRegistryContent();

if (errors.length > 0) {
  console.error(formatValidationErrors(errors));
  process.exit(1);
}

console.log("Registry validation passed.");
process.exit(0);
