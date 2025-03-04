

## latest-docs: Pulls the latest docs from upstream
.PHONY: latest-docs
latest-docs:
	@python3 ./scripts/sync_latest_docs.py $(COMMIT)

.PHONY: help
help: Makefile
	@echo
	@echo " Choose a command run in 'dev-portal'"
	@echo
	@sed -n 's/^##//p' $< | column -t -s ':' |  sed -e 's/^/ /'
	@echo
