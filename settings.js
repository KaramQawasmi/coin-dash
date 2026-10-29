// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a },
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
