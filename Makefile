.PHONY: serve build clean help

# Default target
help:
	@echo "Available commands:"
	@echo "  make serve    - Run Astro dev server"
	@echo "  make build    - Build the site to dist/ directory"
	@echo "  make clean    - Clean the dist/ directory"
	@echo "  make preview  - Preview production build"
	@echo "  make help     - Show this help message"

# Run dev server
serve:
	bun dev

# Build the site
build:
	bun run build

# Preview production build
preview:
	bun run preview

# Clean build directory
clean:
	rm -rf dist/ .astro/
