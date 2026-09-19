# Listdle badge launch

Prepared locally pending Listdle approval. Do not push or deploy this preparation
until the approved SpellSweep listing URL is available and deployment is requested.

## Once approved

1. In `index.html`, find `LISTDLE LAUNCH` and replace the following
   `href="https://example.com/"` with the exact approved SpellSweep listing URL.
   That is the only required code edit. The badge image URL stays as it is.
2. Preview locally and follow **Rate on Listdle** to confirm the correct listing
   opens in a new tab. Check the footer at desktop and mobile widths.
3. Run `pnpm test`, `pnpm build`, and `git diff --check`.
4. Review and commit `index.html`, `style.css`, and this note, then push to `main`
   when deployment is authorized. The existing GitHub Pages workflow builds and
   deploys the site; no workflow changes or manual build-file commits are needed.
5. Wait for the Pages workflow to succeed and confirm the badge on the live site.

The URL edit takes seconds; GitHub Actions and Pages publishing determine how
soon the change becomes publicly visible. A one-to-two-minute publication time
cannot be guaranteed.

## Badge and analytics

- Uses the same official light badge as WordWeb:
  `https://listdle.com/badges/rate-on-listdle-light.svg` (160 × 40).
- The link remains usable if analytics is blocked or unavailable.
- GoatCounter event path: `spellsweep-rate-on-listdle`.
- GoatCounter event title: `SpellSweep: Rate on Listdle`.
- Uses the existing script and its standard click attributes; no additional
  analytics setup or JavaScript is required. See the
  [GoatCounter event documentation](https://www.goatcounter.com/help/events).
- GoatCounter normally ignores localhost traffic. Local checks should not enable
  live counting just to test the badge.

## Preparation checks

- TypeScript build and all 27 existing tests passed.
- Desktop and 320px mobile previews showed the loaded badge without horizontal
  overflow; the link has a 44px-high target and a keyboard focus outline.
- Clicking the badge reached GoatCounter's handler, which correctly logged
  `not counting because of: localhost`. No test event was sent to live analytics.
- The approved listing destination and live event count remain launch checks.
