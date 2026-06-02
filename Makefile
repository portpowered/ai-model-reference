.PHONY: dev lint format typecheck test build ci validate-data linkcheck validate-pdf

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

build:
	bun run build

ci: lint typecheck test build

validate-data:
	@echo "validate-data: skipped (not yet implemented in scaffold)"
	@exit 0

linkcheck:
	@echo "linkcheck: skipped (not yet implemented in scaffold)"
	@exit 0

validate-pdf:
	@echo "validate-pdf: skipped (not yet implemented in scaffold)"
	@exit 0
