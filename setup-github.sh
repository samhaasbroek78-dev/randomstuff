#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  Hormuz Tracker — GitHub repository setup script
#  Run this once from inside the project folder:
#    bash setup-github.sh
# ─────────────────────────────────────────────────────────────────

set -e

# ── Colours ──
GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo ""
echo -e "${CYAN}  ╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}  ║   Hormuz Tracker — GitHub Setup          ║${NC}"
echo -e "${CYAN}  ╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Prerequisite checks ──
if ! command -v git &>/dev/null; then
  echo -e "${RED}  ✗ git not found. Install from https://git-scm.com${NC}"; exit 1
fi
if ! command -v gh &>/dev/null; then
  echo -e "${YELLOW}  ⚠ GitHub CLI (gh) not found.${NC}"
  echo    "    Install from https://cli.github.com then run: gh auth login"
  echo    "    OR create the repo manually at https://github.com/new and use the manual steps below."
  echo ""
  MANUAL=1
else
  MANUAL=0
fi

# ── Prompt for repo name ──
echo -e "${CYAN}  Repository name${NC} (default: hormuz-tracker): "
read -r REPO_NAME
REPO_NAME="${REPO_NAME:-hormuz-tracker}"

echo -e "${CYAN}  Make repository public? (Y/n): ${NC}"
read -r PUB
VISIBILITY="public"
[[ "$PUB" =~ ^[Nn] ]] && VISIBILITY="private"

echo ""

# ── Initialise git ──
if [ ! -d ".git" ]; then
  echo -e "  ${GREEN}✓${NC} Initialising git repository..."
  git init -b main
else
  echo -e "  ${GREEN}✓${NC} Git repository already initialised"
fi

# ── Initial commit ──
git add .
if git diff --cached --quiet; then
  echo -e "  ${GREEN}✓${NC} Nothing new to commit"
else
  git commit -m "Initial commit: Hormuz Strait live ship tracker

- Real-time AIS feed via AISStream.io WebSocket
- Satellite + dark map views (Esri tiles)
- Tankers, cargo/container, military vessel tracking
- Flag-of-origin markers (150+ countries)
- Last-known position ghost markers (5 min → 6 hr)
- Single-file HTML app, Vercel-ready"
  echo -e "  ${GREEN}✓${NC} Initial commit created"
fi

echo ""

if [ "$MANUAL" -eq 0 ]; then
  # ── Create GitHub repo via CLI ──
  echo -e "  ${GREEN}✓${NC} Creating GitHub repository '${REPO_NAME}' (${VISIBILITY})..."
  gh repo create "$REPO_NAME" \
    --"$VISIBILITY" \
    --description "Real-time AIS ship tracker for the Strait of Hormuz — tankers, cargo, military vessels" \
    --source=. \
    --remote=origin \
    --push

  echo ""
  GITHUB_USER=$(gh api user --jq .login 2>/dev/null || echo "your-username")
  echo -e "  ${GREEN}✅ Done!${NC}"
  echo ""
  echo -e "  ${CYAN}Repository:${NC}  https://github.com/${GITHUB_USER}/${REPO_NAME}"
  echo -e "  ${CYAN}Clone:${NC}       git clone https://github.com/${GITHUB_USER}/${REPO_NAME}"
  echo ""
  echo -e "  ${YELLOW}Next step — deploy to Vercel:${NC}"
  echo    "    vercel --prod"
  echo    "  or import at: https://vercel.com/new/git"
else
  # ── Manual steps ──
  echo -e "  ${YELLOW}Manual steps to push to GitHub:${NC}"
  echo ""
  echo    "  1. Create a new repository at https://github.com/new"
  echo    "     Name: ${REPO_NAME}"
  echo    "     Visibility: ${VISIBILITY}"
  echo    "     ⚠  Do NOT initialise with README, .gitignore, or licence"
  echo ""
  echo    "  2. Run these commands (replace YOUR_USERNAME):"
  echo ""
  echo -e "     ${CYAN}git remote add origin https://github.com/YOUR_USERNAME/${REPO_NAME}.git${NC}"
  echo -e "     ${CYAN}git push -u origin main${NC}"
  echo ""
  echo -e "  ${YELLOW}Then deploy to Vercel:${NC}"
  echo    "     https://vercel.com/new/git — import your new repository"
fi

echo ""
