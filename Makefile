.PHONY: help dev build test lint validate generate ci internal-help internal-format internal-typecheck internal-test-verify-contract internal-test-build-contract internal-test-system internal-test-integration internal-coverage internal-build-export internal-validate-data internal-scaffold internal-linkcheck internal-validate-pdf internal-build-search-index internal-component-examples internal-verify-architectural-checklist-mechanism-status internal-verify-export-routes internal-verify-export-search-shell internal-verify-export-search-handoff internal-verify-export-search-ux internal-verify-phase-1-ux internal-verify-phase-1-convergence internal-verify-phase-1-built-app-convergence internal-verify-phase-1-follow-up-convergence internal-verify-phase-1-batch-012-convergence internal-verify-phase-1-batch-013-convergence internal-verify-phase-1-github-pages-convergence internal-verify-phase-1-github-pages-deploy-convergence internal-verify-phase-2-3-reconciliation-convergence internal-verify-phase-2-token-probability-path-convergence internal-verify-rendered-quality-baseline internal-verify-rendered-quality-regression

help:
	@bun run help

dev:
	bun run dev

build:
	bun run build
	bun ./scripts/verify-phase-1-static-routes.ts
	bun ./scripts/verify-grouped-query-attention-built-route.ts
	bun ./scripts/verify-docs-footer-hover-built-route.ts

test:
	bun run test

lint:
	bun run lint

validate:
	bun run validate

generate:
	bun run generate

ci: lint internal-typecheck test internal-test-verify-contract internal-coverage internal-test-build-contract internal-test-integration internal-validate-data internal-linkcheck
internal-help:
	@bun run internal:help

internal-format:
	bun run internal:format

internal-typecheck:
	bun run internal:typecheck

internal-test-verify-contract:
	bun run test:verify-contract

internal-test-build-contract:
	bun run test:build-contract

internal-test-system:
	bun run internal:test:system

internal-test-integration:
	bun run test:integration

internal-coverage:
	bun run internal:coverage

internal-build-export:
	bun run build:export
	bun ./scripts/verify-phase-1-export-routes.ts
	bun ./scripts/verify-phase-1-export-search-shell.ts
	bun ./scripts/verify-phase-1-export-search-handoff.ts
	bun ./scripts/verify-phase-1-export-search-ux.ts

internal-verify-architectural-checklist-mechanism-status:
	bun run verify:architectural-checklist-mechanism-status

internal-verify-export-routes:
	bun ./scripts/verify-phase-1-export-routes.ts

internal-verify-export-search-shell:
	bun ./scripts/verify-phase-1-export-search-shell.ts

internal-verify-export-search-handoff:
	bun ./scripts/verify-phase-1-export-search-handoff.ts

internal-verify-export-search-ux:
	bun ./scripts/verify-phase-1-export-search-ux.ts

internal-validate-data:
	bun run internal:validate-data

internal-scaffold:
	bun ./scripts/scaffold-doc-page.ts $(ARGS)

internal-linkcheck:
	bun run internal:linkcheck

internal-validate-pdf:
	@echo "validate-pdf: skipped (not yet implemented in scaffold)"
	@exit 0

internal-build-search-index:
	bun run build:search-index

internal-component-examples:
	bun run internal:component-examples

internal-verify-phase-1-ux:
	bun ./scripts/verify-phase-1-route-search-ux.ts

internal-verify-phase-1-convergence:
	bun ./scripts/run-phase-1-convergence-pass.ts

internal-verify-phase-1-built-app-convergence:
	bun ./scripts/run-phase-1-built-app-convergence-validator.ts

internal-verify-phase-1-follow-up-convergence:
	bun ./scripts/run-phase-1-follow-up-convergence-pass.ts

internal-verify-phase-1-batch-012-convergence:
	bun ./scripts/run-phase-1-batch-012-convergence-pass.ts

internal-verify-phase-1-batch-013-convergence:
	bun ./scripts/run-phase-1-batch-013-convergence-pass.ts

internal-verify-phase-1-github-pages-convergence:
	bun ./scripts/run-phase-1-github-pages-convergence-pass.ts

internal-verify-phase-1-github-pages-deploy-convergence:
	bun ./scripts/run-phase-1-github-pages-deploy-convergence-pass.ts

internal-verify-phase-2-3-reconciliation-convergence:
	bun ./scripts/run-phase-2-3-reconciliation-convergence-pass.ts

internal-verify-phase-2-token-probability-path-convergence:
	bun ./scripts/run-phase-2-token-probability-path-convergence-pass.ts

internal-verify-rendered-quality-baseline:
	bun ./scripts/run-rendered-quality-baseline-audit.ts

internal-verify-rendered-quality-regression:
	bun ./scripts/run-rendered-quality-regression-pass.ts
