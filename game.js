/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
    this.paused = false;
    this.time.paused = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace', color: '#ffffff' });
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
    }
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.playTone(988, 1976, 0.15, 'square');
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => {
      if (this.finished || this.power?.kind === 'shield') return;
      this.playTone(440, 55, 0.6, 'sawtooth');
      this.finish('A drone caught you!');
    });
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    this.setupPowerUps();
  }

  // --- Power-ups: all timing uses this.time, so it freezes whenever the scene clock is paused.
  setupPowerUps() {
    const p = COIN_DASH.powerUps;
    this.power = null; // active power-up: { kind, timer }
    this.pickupTimer = null; // the scene instance survives restarts, so drop the old clock's timer
    this.powerHud = this.add.text(COIN_DASH.width - 18, 12, '', { font: '18px monospace' }).setOrigin(1, 0);
    this.pickup = this.add.star(0, 0, 5, 7, 15, p.colors.shield).setVisible(false);
    this.physics.add.existing(this.pickup);
    this.pickup.body.enable = false;
    this.physics.add.overlap(this.player, this.pickup, () => this.collectPowerUp());
    this.spawnTimer = this.time.addEvent({ delay: p.spawnEvery, loop: true, callback: this.spawnPowerUp, callbackScope: this });
  }

  spawnPowerUp() {
    if (this.finished || this.pickup.visible) return;
    const c = COIN_DASH;
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 80);
    this.pickupKind = Phaser.Math.RND.pick(['shield', 'slow']);
    this.pickup.setPosition(x, y).setFillStyle(c.powerUps.colors[this.pickupKind]).setVisible(true);
    this.pickup.body.reset(x, y);
    this.pickup.body.enable = true;
    this.pickupTimer = this.time.delayedCall(c.powerUps.lifetime, this.hidePickup, [], this);
  }

  hidePickup() {
    this.pickupTimer?.remove();
    this.pickup.setVisible(false);
    this.pickup.body.enable = false;
  }

  collectPowerUp() {
    if (this.finished || !this.pickup.visible) return;
    const p = COIN_DASH.powerUps, kind = this.pickupKind;
    this.hidePickup();
    this.endPower(); // a new pickup replaces any power-up that is still running
    const seconds = kind === 'shield' ? p.shieldSeconds : p.slowSeconds;
    this.power = { kind, timer: this.time.delayedCall(seconds * 1000, this.endPower, [], this) };
    if (kind === 'shield') this.player.setStrokeStyle(4, p.colors.shield);
    else this.setDroneSpeed(COIN_DASH.droneSpeed * p.slowFactor);
  }

  endPower() {
    if (!this.power) return;
    this.power.timer.remove();
    if (this.power.kind === 'shield') this.player.setStrokeStyle();
    else this.setDroneSpeed(COIN_DASH.droneSpeed);
    this.power = null;
  }

  // Rescale each drone's velocity, keeping its current direction.
  setDroneSpeed(speed) {
    this.drones.getChildren().forEach(drone => drone.body.velocity.setLength(speed));
  }

  updatePowerHud() {
    if (!this.power) return this.powerHud.setText('');
    const color = COIN_DASH.powerUps.colors[this.power.kind];
    const label = this.power.kind === 'shield' ? 'Shield' : 'Slow drones';
    this.powerHud.setColor('#' + color.toString(16).padStart(6, '0'))
      .setText(`${label}: ${Math.ceil(this.power.timer.getRemainingSeconds())}s`);
  }

  stopPowerUps() {
    this.spawnTimer.remove();
    this.hidePickup();
    this.endPower();
    this.powerHud.setText('');
  }

  // Synthesize a short sliding tone, so the game still needs no audio files.
  playTone(fromHz, toHz, seconds, wave) {
    const ctx = this.sound.context;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(fromHz, now);
    osc.frequency.exponentialRampToValueAtTime(toHz, now + seconds);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + seconds);
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  togglePause() {
    if (this.finished) return;
    this.paused = !this.paused;
    this.time.paused = this.paused;
    if (this.paused) {
      this.pausedAt = this.time.now;
      this.physics.pause();
      const c = COIN_DASH;
      this.pauseOverlay = this.add.container(c.width / 2, c.height / 2, [
        this.add.rectangle(0, 0, 460, 90, 0x0a1120, 0.95),
        this.add.text(0, 0, 'Paused — press P to resume',
          { font: '24px monospace', color: '#ffffff' }).setOrigin(0.5)
      ]);
    } else {
      // this.time.now keeps advancing while the clock is paused, so shift the deadline.
      this.deadline += this.time.now - this.pausedAt;
      this.physics.resume();
      this.pauseOverlay.destroy();
    }
  }

  update() {
    if (this.finished || this.paused) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Coins: ${this.score}                       Time: ${seconds}s`);
    this.updatePowerHud();
    if (seconds === 0) this.finish('Time is up!');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    this.stopPowerUps();
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 460, 150, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins collected\nPress R to try again`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
  }
}
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.colors.background,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: CoinDash
});
