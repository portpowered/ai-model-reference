.PHONY: dev lint format typecheck test coverage build ci validate-data scaffold linkcheck validate-pdf build-search-index component-examples verify-phase-1-ux verify-phase-1-convergence

dev:
	bun run dev

lint:
	bun run lint

format:
	bun run format

typecheck:
	bun run typecheck

test:
	bun run test

coverage:
	bun run coverage

build:
	bun run build
	bun ./scripts/verify-phase-1-static-routes.ts
	bun ./scripts/verify-grouped-query-attention-built-route.ts

ci: lint typecheck test coverage build validate-data linkcheck

validate-data:
	bun ./scripts/validate-registry.ts

scaffold:
	bun ./scripts/scaffold-doc-page.ts $(ARGS)

linkcheck:
	bun ./scripts/validate-links.ts

validate-pdf:
	@echo "validate-pdf: skipped (not yet implemented in scaffold)"
	@exit 0

build-search-index:
	bun run build:search-index

component-examples:
	bun ./scripts/component-examples.ts

verify-phase-1-ux:
	bun ./scripts/verify-phase-1-route-search-ux.ts

verify-phase-1-convergence:
	bun ./scripts/run-phase-1-convergence-pass.ts
