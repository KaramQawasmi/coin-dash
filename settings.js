// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  // Theme cycle: the game alternates dark/light every themeSeconds (scene clock, so it freezes on pause).
  themeSeconds: 5,
  themes: {
    dark: { background: 0x101c31, grid: 0x24334b, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a,
      text: '#ffffff', overlay: 0x0a1120, shield: 0x5fb4ff, slow: 0xc792ff },
    light: { background: 0xeef2f7, grid: 0xaebbd0, player: 0x0f8a74, coin: 0xb07800, drone: 0xd62839,
      text: '#13213a', overlay: 0xffffff, shield: 0x1f6fd1, slow: 0x7b3fd1 }
  },
  // Power-ups: a star pickup appears every spawnEvery ms and vanishes after lifetime ms.
  powerUps: {
    spawnEvery: 8000,
    lifetime: 5000,
    shieldSeconds: 5,
    slowSeconds: 5,
    slowFactor: 0.5,
    colors: { shield: 0x5fb4ff, slow: 0xc792ff }
  }
};
// The dark palette doubles as the default colours (e.g. the Phaser config background).
COIN_DASH.colors = COIN_DASH.themes.dark;
