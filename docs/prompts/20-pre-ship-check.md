Run a pre-ship sanity sweep before deploying to Cloudflare Pages.

## Checks

1. **Build clean.** `npm run build` at the repo root → no errors, no warnings beyond the expected pdf.js chunk-size note. Report all `dist/` file sizes; flag anything unexpectedly >2 MB.
2. **Landing renders.** Open `./dist/index.html` directly in a browser. Check: all tool card hrefs are correct, copy-link button works, no console errors, no broken images, mobile (360px wide) is usable.
3. **Tools render via static server.** `npx serve dist` (file:// breaks asset paths). For each tool in `scripts/build.mjs`'s `TOOLS`:
   - Page loads at `http://localhost:3000/<tool-name>/`
   - Core flow works end-to-end
   - No console errors
4. **No outbound network requests** (Network tab → record a full session). All assets come from the local origin.
5. **Lighthouse**: 90+ on Performance + Accessibility for landing and each tool, on both desktop and mobile profiles.
6. **Truncation check.** `wc -c` every file in the repo. Diff against what the editor shows. (Cowork has a history of silently truncating files; Claude Code shouldn't, but worth confirming once before push.)

## If shipping

7. Push to GitHub.
8. Cloudflare Pages → Create project → connect repo:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`
9. After first successful deploy, enable Cloudflare Web Analytics in the dashboard, paste the snippet into the `Placeholder: Cloudflare Web Analytics` comment in landing `index.html`, commit, redeploy.
10. (Optional) Drop the Buy Me a Coffee snippet into the `.support-slot` div in landing `index.html`.

## Report format

Return a punch list — what's green, what needs fixing, what's a follow-up.
