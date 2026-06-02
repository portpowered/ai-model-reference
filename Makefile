.PHONY: ci typecheck lint test build-search-index

ci: typecheck lint test

typecheck:
	bun run typecheck

lint:
	bun run lint

test:
	bun run test

build-search-index:
	bun run build:search-index
