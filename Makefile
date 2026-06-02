.PHONY: ci typecheck lint test

ci: typecheck lint test

typecheck:
	bun run typecheck

lint:
	bun run lint

test:
	bun run test
