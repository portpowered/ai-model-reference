import {
  reportDocumentationLinkValidation,
  validateDocumentationLinks,
} from "../src/lib/build/validate-links";

const results = await validateDocumentationLinks();
reportDocumentationLinkValidation(results);
