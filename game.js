const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
    scene: { preload, create, update },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};

let player, enemies, cursors, bullets, score = 0, scoreText, gameOver = false, gameOverText, lifetimePointsText;

const game = new Phaser.Game(config);

function preload() {
    this.load.image('ship', 'https://via.placeholder.com/32x32.png?text=Ship');
    this.load.image('enemy', 'https://via.placeholder.com/32x32.png?text=Enemy');
    this.load.image('bullet', 'https://via.placeholder.com/8x8.png?text=Bullet');
}

function create() {
    cursors = this.input.keyboard.createCursorKeys();
    this.input.addPointer(1);

    player = this.physics.add.sprite(400, 550, 'ship').setCollideWorldBounds(true);
    player.setScale(0.5);

    bullets = this.physics.add.group();

    enemies = this.physics.add.group();
    for (let i = 0; i < 10; i++) {
        let enemy = enemies.create(100 + i * 60, 50, 'enemy');
        enemy.setScale(0.5);
        this.tweens.add({
            targets: enemy,
            x: { value: 400, duration: 2000, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 },
            y: { value: 200, duration: 3000, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 }
        });
    }

    this.physics.add.collider(bullets, enemies, (bullet, enemy) => {
        bullet.destroy();
        enemy.destroy();
        score += 10;
        scoreText.setText('Score: ' + score);
    });

    this.physics.add.collider(player, enemies, () => {
        gameOver = true;
        player.setVisible(false);
        let lifetimePoints = window.lifetimePoints || 0;
        let gameOverMessage = window.tronLink ? 'Game Over\nScore: ' + score + '\nLifetime Points: ' + lifetimePoints : 'Game Over\nScore: ' + score + '\n(Pay to track lifetime points)';
        gameOverText = this.add.text(400, 300, gameOverMessage, { 
            fontSize: '40px', fill: '#fff', align: 'center' 
        }).setOrigin(0.5);
        this.physics.pause();
        submitScoreToLeaderboard(score);
        document.getElementById('shareButton').style.display = 'block';
    });

    scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', fill: '#fff' });
    lifetimePointsText = this.add.text(10, 40, 'Lifetime Points: 0', { fontSize: '20px', fill: '#fff' });

    document.getElementById('shareButton').style.display = 'none';
}

function update() {
    if (gameOver) return;

    player.setVelocityX(0);
    if (cursors.left.isDown) player.setVelocityX(-200);
    if (cursors.right.isDown) player.setVelocityX(200);

    if (this.input.activePointer.isDown) {
        if (this.input.activePointer.x < 400) player.setVelocityX(-200);
        else player.setVelocityX(200);
    }

    if (cursors.space.isDown && !this.lastFired) {
        let bullet = bullets.create(player.x, player.y - 20, 'bullet');
        bullet.setVelocityY(-400);
        this.lastFired = true;
        setTimeout(() => this.lastFired = false, 200);
    }
}

function submitScoreToLeaderboard(score) {
    window.submitScore(score);
    window.currentScore = score;
}
