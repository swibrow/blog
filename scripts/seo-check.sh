#!/usr/bin/env bash
# Live SEO smoke test.
#
# Usage:
#   ./scripts/seo-check.sh                 # tests https://samuel.wibrow.net
#   SITE=http://localhost:4321 ./scripts/seo-check.sh   # tests local preview
#
# Exits non-zero if any check fails.

set -u

SITE="${SITE:-https://samuel.wibrow.net}"
PASS=0
FAIL=0

ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; PASS=$((PASS+1)); }
fail() { printf "  \033[31m✗\033[0m %s\n" "$1"; FAIL=$((FAIL+1)); }
hdr()  { printf "\n\033[1m%s\033[0m\n" "$1"; }

# --- Helpers ---

assert_status() {
  local url="$1" expected="$2" name="$3"
  local code; code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [[ "$code" == "$expected" ]]; then ok "$name → $code"
  else fail "$name → $code (expected $expected)"; fi
}

assert_contains() {
  local body="$1" pattern="$2" name="$3"
  if printf '%s' "$body" | grep -q -- "$pattern"; then ok "$name"
  else fail "$name (pattern: $pattern)"; fi
}

assert_contains_re() {
  local body="$1" pattern="$2" name="$3"
  if printf '%s' "$body" | grep -qE -- "$pattern"; then ok "$name"
  else fail "$name (regex: $pattern)"; fi
}

assert_header() {
  local url="$1" header="$2" name="$3"
  local val; val=$(curl -sI "$url" | tr -d '\r' \
    | awk -v h="$(echo "$header" | tr '[:upper:]' '[:lower:]')" \
        'BEGIN { IGNORECASE=1 } tolower($1) == h ":" { $1=""; print }' | xargs)
  if [[ -n "$val" ]]; then ok "$name → $val"
  else fail "$name (header missing)"; fi
}

# --- Tests ---

hdr "Testing $SITE"

hdr "1. HTTP status"
assert_status "$SITE/" 200 "Home"
assert_status "$SITE/about/" 200 "About"
assert_status "$SITE/posts/" 200 "Posts list"
assert_status "$SITE/posts/aws-oidc-pod-identity/" 200 "Post detail"
assert_status "$SITE/til/" 200 "TIL list"
assert_status "$SITE/til/fzf/" 200 "TIL detail"
assert_status "$SITE/projects/" 200 "Projects"
assert_status "$SITE/tools/" 200 "Tools"
assert_status "$SITE/sitemap-index.xml" 200 "Sitemap"
assert_status "$SITE/rss.xml" 200 "RSS"
assert_status "$SITE/robots.txt" 200 "robots.txt"
assert_status "$SITE/this-does-not-exist" 404 "404 page"

hdr "2. SEO meta tags (home)"
HOME_HTML=$(curl -s "$SITE/")
assert_contains    "$HOME_HTML" "<title>Samuel Wibrow"      "<title> set"
assert_contains_re "$HOME_HTML" 'name="description"'         "meta description present"
assert_contains_re "$HOME_HTML" 'rel="canonical"'            "canonical link present"
assert_contains_re "$HOME_HTML" 'property="og:title"'        "og:title present"
assert_contains_re "$HOME_HTML" 'property="og:description"'  "og:description present"
assert_contains_re "$HOME_HTML" 'property="og:image"'        "og:image present"
assert_contains_re "$HOME_HTML" 'name="twitter:card"'        "twitter:card present"
assert_contains_re "$HOME_HTML" 'application/ld\+json'       "JSON-LD present"

hdr "3. SEO meta tags (post page)"
POST_HTML=$(curl -s "$SITE/posts/aws-oidc-pod-identity/")
assert_contains    "$POST_HTML" '"@type":"BlogPosting"'              "BlogPosting JSON-LD present"
assert_contains_re "$POST_HTML" 'property="article:published_time"'  "article:published_time present"
assert_contains_re "$POST_HTML" 'property="article:tag"'             "article:tag present"
assert_contains    "$POST_HTML" "<title>Replicating AWS IRSA"        "post title in <title>"

hdr "4. SSR content visible to crawlers (no JS)"
assert_contains    "$HOME_HTML" "Samuel Wibrow</h1>"                              "Hero h1 in static HTML"
assert_contains    "$HOME_HTML" "SRE by trade, over-engineer by nature"           "Hero subtitle in static HTML"
assert_contains_re "$HOME_HTML" 'href="/posts"[^>]*nav-link'                      "Nav link to /posts in static HTML"
assert_contains    "$POST_HTML" "Raspberry Pi 4 sitting in a drawer"              "Post body in static HTML"

hdr "5. Sitemap"
SITEMAP_INDEX=$(curl -s "$SITE/sitemap-index.xml")
SITEMAP=$(curl -s "$SITE/sitemap-0.xml")
COUNT=$(printf '%s' "$SITEMAP" | grep -oE '<loc>[^<]+</loc>' | wc -l | xargs)
[[ "$COUNT" -ge 20 ]] && ok "Sitemap has $COUNT URLs (≥20)" || fail "Sitemap has only $COUNT URLs"
assert_contains "$SITEMAP" "samuel.wibrow.net/posts/aws-oidc-pod-identity" "Sitemap includes post URLs"
assert_contains "$SITEMAP" "samuel.wibrow.net/til/fzf"                     "Sitemap includes TIL URLs"

hdr "6. robots.txt"
ROBOTS=$(curl -s "$SITE/robots.txt")
assert_contains_re "$ROBOTS" "Sitemap:"        "robots.txt references sitemap"
assert_contains_re "$ROBOTS" "User-agent: \*"  "robots.txt allows User-agent *"

hdr "7. RSS"
RSS=$(curl -s "$SITE/rss.xml")
assert_contains "$RSS" "<rss" "RSS feed valid XML"
ITEMS=$(printf '%s' "$RSS" | grep -oE "<item>" | wc -l | xargs)
[[ "$ITEMS" -ge 15 ]] && ok "RSS has $ITEMS items (≥15)" || fail "RSS has only $ITEMS items"

hdr "8. Headers"
assert_header "$SITE/" "Content-Type"   "Content-Type"
assert_header "$SITE/" "Cache-Control"  "Cache-Control"

hdr "9. Compression / HTTP version"
HV=$(curl -sI "$SITE/" | head -1 | awk '{print $1}')
[[ "$HV" == "HTTP/2" || "$HV" == "HTTP/3" ]] && ok "HTTP version: $HV" || fail "HTTP version: $HV (expected HTTP/2 or 3)"
ENC=$(curl -sI -H "Accept-Encoding: gzip, br" "$SITE/" | grep -i "^content-encoding" | tr -d '\r' | xargs)
[[ -n "$ENC" ]] && ok "Compression: $ENC" || fail "No compression header"

hdr "10. Page weights (compressed, first response)"
for path in / /posts/ /posts/aws-oidc-pod-identity/ /til/ /tools/; do
  size=$(curl -sH "Accept-Encoding: gzip, br" "$SITE$path" -o /dev/null -w "%{size_download}")
  printf "  %-42s %s bytes\n" "$path" "$size"
done

hdr "Result"
echo "  $PASS passed, $FAIL failed"
[[ "$FAIL" -eq 0 ]] || exit 1
