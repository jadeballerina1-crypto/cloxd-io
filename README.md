# CloxD.io

An original browser-based voxel sandbox prototype. The project is a small, playable starting point for an original game identity and feature set.

## Run locally

The game uses browser ES modules and imports Three.js from a CDN. Serve the repository over HTTP rather than opening `index.html` directly. For example:

```bash
npx serve .
```

Then open the local URL printed by the server. Internet access is needed to load Three.js and the optional Google Font.

## Current prototype features

- Responsive home page and world-discovery cards.
- Three.js first-person voxel sandbox with WASD movement, jumping, block placement/removal, and a hotbar.
- Creative, Survival, and Parkour world/mode selection (the current simulation is creative building in each world).
- Locally saved display name, XP, coins, avatar color, settings, and equipped cosmetics.
- Demo Super rank progression, cosmetic catalog, and local demo currency.
- Local-only chat panel, settings, and profile dialog.

## Important prototype limits

This is a front-end single-player demo. Worlds, chat, ranks, and purchases are stored locally or simulated; they do not sync between players. Cosmetic buttons spend demo coins only and do not process real payments. The YouTuber/creator badge is not implemented as a self-assignable account privilege: public creator ranks should be granted by a trusted server/admin workflow. Do not treat browser local storage as secure, authoritative account or purchase data.

## Next engineering steps

1. Add automated tests and split UI/game code into smaller modules.
2. Implement server-authoritative accounts, multiplayer sessions, world persistence, and moderation.
3. Design a secure creator-rank verification flow.
4. Add a payment provider and server-side fulfillment before offering paid cosmetics.
5. Add accessibility checks, performance budgets, and deployment configuration.
