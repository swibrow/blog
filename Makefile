.PHONY: serve build clean new-post submodule-init submodule-update help

# Default target
help:
	@echo "Available commands:"
	@echo "  make serve           - Run Hugo server with drafts enabled"
	@echo "  make build           - Build the site to public/ directory"
	@echo "  make clean           - Clean the public/ directory"
	@echo "  make new-post        - Create a new blog post (use POST=name)"
	@echo "  make submodule-init  - Initialize git submodules"
	@echo "  make submodule-update - Update git submodules to latest"
	@echo "  make help            - Show this help message"

# Run Hugo server
serve:
	hugo server -D

# Build the site
build:
	hugo

# Clean build directory
clean:
	rm -rf public/

# Create new post
new-post:
	@if [ -z "$(POST)" ]; then \
		echo "Usage: make new-post POST=my-post-name"; \
		exit 1; \
	fi
	hugo new posts/$(POST)/index.md

# Initialize git submodules
submodule-init:
	git submodule init
	git submodule update

# Update git submodules
submodule-update:
	git submodule update --remote