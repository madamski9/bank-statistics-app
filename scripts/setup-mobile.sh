#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$ROOT/mobile"

BOLD='\033[1m'
DIM='\033[2m'
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
CYAN='\033[36m'
RESET='\033[0m'

on_error() {
  printf "\n${RED}${BOLD}✗ Setup failed${RESET} ${DIM}— see the output above${RESET}\n"
}
trap on_error ERR

printf "\n${BOLD}${CYAN}BankStats${RESET} ${BOLD}· Setup${RESET}\n"
printf "${DIM}────────────────────────${RESET}\n\n"

if ! command -v bun &> /dev/null; then
  printf "${RED}✗ bun is not installed${RESET}\n"
  printf "${DIM}  Install it from https://bun.sh, then run this again${RESET}\n"
  exit 1
fi
printf "${GREEN}✓${RESET} bun ${DIM}$(bun --version)${RESET}\n"

printf "\n${YELLOW}▸${RESET} Installing workspace dependencies ${DIM}(root bun install — covers mobile, packages/*, services/*)${RESET}\n"
(cd "$ROOT" && bun install)
printf "${GREEN}✓${RESET} Dependencies installed\n"

if [[ ! -f "$MOBILE_DIR/.env.local" ]]; then
  printf "\n${YELLOW}▸${RESET} No ${BOLD}mobile/.env.local${RESET} — creating it from .env.example\n"
  cp "$MOBILE_DIR/.env.example" "$MOBILE_DIR/.env.local"
  printf "${GREEN}✓${RESET} Created ${BOLD}mobile/.env.local${RESET} ${DIM}(gitignored)${RESET}\n"
else
  printf "\n${GREEN}✓${RESET} ${BOLD}mobile/.env.local${RESET} already exists\n"
fi

missing=()
grep -qE '^EXPO_PUBLIC_CONVEX_URL=.+' "$MOBILE_DIR/.env.local" || missing+=("EXPO_PUBLIC_CONVEX_URL")
grep -qE '^EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_' "$MOBILE_DIR/.env.local" || missing+=("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY")

if [[ ${#missing[@]} -gt 0 ]]; then
  printf "\n${YELLOW}⚠${RESET}  Still missing in ${BOLD}mobile/.env.local${RESET}: ${YELLOW}%s${RESET}\n" "${missing[*]}"
  printf "${DIM}  · EXPO_PUBLIC_CONVEX_URL — printed by 'bunx convex dev' in services/convex${RESET}\n"
  printf "${DIM}  · EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY — from the Clerk dashboard (pk_test_… outside production)${RESET}\n"
fi

printf "\n${BOLD}${GREEN}✓ Setup complete${RESET}\n\n"
printf "${CYAN}Next steps${RESET}\n"
printf "  ${YELLOW}./run.sh ios${RESET}      ${DIM}first run on a device: full native build${RESET}\n"
printf "  ${YELLOW}./run.sh android${RESET}  ${DIM}first run on a device: full native build${RESET}\n"
printf "  ${YELLOW}./run.sh start${RESET}    ${DIM}every run after that: just the bundler${RESET}\n"
printf "  ${YELLOW}./run.sh web${RESET}      ${DIM}run in a browser${RESET}\n\n"
