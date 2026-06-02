.PHONY: validate-data

# Validate Phase 1 registry JSON, relationships, and colocated page messages/assets.
validate-data:
	bun ./scripts/validate-registry.ts
