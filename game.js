/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
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
      if (this.finished) return;
      this.playTone(440, 55, 0.6, 'sawtooth');
      this.finish('A drone caught you!');
    });
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.input.keyboard.on('keydown-M', () => this.toggleMusic());
    this.events.once('shutdown', () => this.stopMusic());
    const ctx = this.sound.context;
    if (ctx && ctx.state === 'running') this.startMusic();
    else this.input.keyboard.once('keydown', () => this.startMusic());
  }

  // Loop a 4-bar chiptune (melody + bass), scheduled ahead on the AudioContext clock.
  startMusic() {
    const ctx = this.sound.context;
    if (!ctx || this.music || this.finished) return;
    if (ctx.state === 'suspended') ctx.resume();
    const gain = ctx.createGain();
    gain.gain.value = this.registry.get('musicMuted') ? 0 : 0.05;
    gain.connect(ctx.destination);
    this.music = { gain, step: 0, next: ctx.currentTime + 0.1 };
    this.music.timer = this.time.addEvent({ delay: 100, loop: true, callback: this.scheduleMusic, callbackScope: this });
    this.scheduleMusic();
  }

  scheduleMusic() {
    const ctx = this.sound.context, m = this.music, beat = 60 / 140 / 2;
    const melody = [72, 76, 79, 76, 84, 79, 76, 79, 72, 76, 81, 76, 84, 81, 76, 72,
      77, 81, 84, 81, 77, 72, 74, 76, 79, 74, 71, 74, 79, 0, 74, 0];
    const roots = [48, 45, 41, 43], bass = [0, 12, 0, 7];
    if (m.next < ctx.currentTime) m.next = ctx.currentTime + 0.05;
    while (m.next < ctx.currentTime + 0.3) {
      const i = m.step % 32;
      if (melody[i]) this.musicNote(melody[i], m.next, beat * 0.9, 'square', 0.7);
      if (i % 2 === 0) this.musicNote(roots[i >> 3] + bass[(i >> 1) % 4], m.next, beat * 1.8, 'triangle', 1);
      m.next += beat;
      m.step++;
    }
  }

  musicNote(midi, time, seconds, wave, volume) {
    const ctx = this.sound.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(440 * Math.pow(2, (midi - 69) / 12), time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + seconds);
    osc.connect(gain).connect(this.music.gain);
    osc.start(time);
    osc.stop(time + seconds + 0.02);
  }

  stopMusic() {
    if (!this.music) return;
    const { gain, timer } = this.music, now = this.sound.context.currentTime;
    timer.remove();
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.05);
    setTimeout(() => gain.disconnect(), 400);
    this.music = null;
  }

  toggleMusic() {
    const muted = !this.registry.get('musicMuted');
    this.registry.set('musicMuted', muted);
    if (this.music) this.music.gain.gain.setTargetAtTime(muted ? 0 : 0.05, this.sound.context.currentTime, 0.02);
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

  update() {
    if (this.finished) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Coins: ${this.score}                       Time: ${seconds}s`);
    if (seconds === 0) this.finish('Time is up!');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    this.stopMusic();
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
