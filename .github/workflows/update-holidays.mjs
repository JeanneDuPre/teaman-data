name: Update school holidays

on:
  schedule:
    - cron: "0 4 1 * *"

  workflow_dispatch:

permissions:
  contents: write

jobs:
  update-holidays:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: npm ci

      - name: Update holiday data
        run: node scripts/update-holidays.mjs

      - name: Commit changes
        run: |
          git config user.name "TeaMan Data Bot"
          git config user.email "actions@github.com"

          git add data/

          if git diff --cached --quiet; then
            echo "No changes."
            exit 0
          fi

          git commit -m "Update school holidays"
          git push
