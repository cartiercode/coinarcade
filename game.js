const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
    scene: { preload, create, update },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

let player, enemies, cursors, bullets, score = 0, scoreText;

const game = new Phaser.Game(config);

function preload() {
    this.load.image('ship', 'https://via.placeholder.com/32x32.png?text=Ship');
this.load.image('enemy', 'https://via.placeholder.com/32x32.png?text=Enemy');
this.load.image('bullet', 'https://via.placeholder.com/8x8.png?text=Bullet');
}

function create() {
    // Input
    cursors = this.input.keyboard.createCursorKeys();

    // Player
    player = this.physics.add.sprite(400, 550, 'ship').setCollideWorldBounds(true);
    player.setScale(0.5); // Adjust size if needed

    // Bullets
    bullets = this.physics.add.group();

    // Enemies
    enemies = this.physics.add.group();
    for (let i = 0; i < 10; i++) {
        let enemy = enemies.create(100 + i * 60, 50, 'enemy');
        enemy.setVelocityY(50);
        enemy.setScale(0.5);
    }

    // Collisions
    this.physics.add.collider(bullets, enemies, (bullet, enemy) => {
        bullet.destroy();
        enemy.destroy();
        score += 10;
        scoreText.setText('Score: ' + score);
    });

    // Score display
    scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', fill: '#fff' });

    // Touch controls for mobile (basic)
    this.input.addPointer(1); // Enable one touch pointer
}

function update() {
    // Player movement (keyboard)
    player.setVelocityX(0);
    if (cursors.left.isDown) player.setVelocityX(-200);
    if (cursors.right.isDown) player.setVelocityX(200);

    // Player movement (touch)
    if (this.input.activePointer.isDown) {
        if (this.input.activePointer.x < 400) player.setVelocityX(-200);
        else player.setVelocityX(200);
    }

    // Shooting
    if (cursors.space.isDown && !this.lastFired) {
        let bullet = bullets.create(player.x, player.y - 20, 'bullet');
        bullet.setVelocityY(-400);
        this.lastFired = true;
        setTimeout(() => this.lastFired = false, 200);
    }

    // Enemy reset
    enemies.getChildren().forEach(enemy => {
        if (enemy.y > 600) enemy.setY(0);
    });
}
