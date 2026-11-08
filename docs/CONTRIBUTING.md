# How we work on this repo

The full rules are in the project handbook (section 11). This is the short version.

## Branches

- `main`: what we demo. Changed only at the end of a sprint, through a PR from `develop`, then tagged (`sprint-1`, `sprint-2` ...).
- `develop`: where finished cards are merged.
- One branch per Jira card, made from `develop`: `feature/SCRUM-13-products-api` or `fix/SCRUM-57-cart-total`.

## Working on a card

```bash
git checkout develop && git pull                  # latest develop
git checkout -b feature/SCRUM-13-products-api     # one branch per card
git add . && git commit -m "SCRUM-13 add GET /api/products"
git fetch origin && git merge origin/develop      # update before the PR
npm test                                          # in backend and frontend
git push -u origin feature/SCRUM-13-products-api  # only after the go message
```

## Commits

Small commits, each message starts with the Jira key: `SCRUM-13 add GET /api/products`.
Commit under your own GitHub account.

## Pull requests

- Push and open your PR only after the Scrum Master's go message for your step in the WhatsApp group.
- One card, one PR, always into `develop` (never `main`). Title: `SCRUM-13 Products API`. Fill in the template.
- One teammate reviews: it follows the handbook, touches only the card's files, tests pass.
- Only the Scrum Master merges, with **Create a merge commit** (never squash, so everyone's commits stay in the history). The branch is deleted after the merge.

## Shared files

In `backend/src/routes/index.js`, `backend/src/utils/validators.js`, `frontend/src/App.jsx`,
`frontend/src/main.jsx`, `frontend/src/api/endpoints.js` and `docs/API.md`: only add your
lines inside your area's block. Never rewrite, reorder, reformat or delete other people's lines.
`frontend/src/styles/global.css` is changed only by the Scrum Master; put your styles in a
CSS file next to your component.

## Never

Push to `main` or `develop` directly, force push a shared branch, commit `.env` or
`node_modules`, add a library that is not in handbook section 4, or merge your own PR.

## Bug reports

Open a Jira bug in the current sprint with: what you did, what you expected, what happened,
and a screenshot or the error message. Fix it on a `fix/SCRUM-n-short-name` branch.
