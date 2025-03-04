## latest-docs: Pulls the latest docs from upstream | make latest-docs COMMIT=<COMMIT_SHA>
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
