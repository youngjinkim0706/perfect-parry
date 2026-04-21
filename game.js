// Perfect Parry - 리듬 패링 게임 (수정판)
class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        
        // 게임 상태
        this.combo = 0;
        this.score = 0;
        this.playerHP = 100;
        this.bossHP = 100;
        this.maxBossHP = 100;
        this.isPlaying = false;
        this.gameOver = false;
        
        // 타이밍 윈도우 (초)
        this.PERFECT_WINDOW = 0.05;   // ±50ms
        this.GOOD_WINDOW = 0.15;      // ±150ms
        this.OK_WINDOW = 0.30;        // ±300ms
        
        // 리듬 설정
        this.bpm = 120;
        this.beatInterval = 60.0 / this.bpm;
        this.currentBeat = 0;
        this.attackTimes = [];
        this.hitAttacks = new Set();
        
        // 보스 패턴 (비트 번호)
        this.bossPattern = [0, 2, 4, 6, 8, 11, 13, 16, 18, 20, 23, 25, 28, 30, 32, 35, 37, 40];
        
        // 화살표 배열
        this.arrows = [];
    }
    
    preload() {
        const loadingText = this.add.text(400, 300, '로딩 중...', {
            fontSize: '32px',
            color: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        this.createAssets();
    }
    
    createAssets() {
        // 배경
        const bgGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        bgGraphics.fillStyle(0x1a1a2e);
        bgGraphics.fillRect(0, 0, 800, 600);
        bgGraphics.generateTexture('background', 800, 600);
        
        // 보스
        const bossGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        bossGraphics.fillStyle(0xff6b6b);
        bossGraphics.fillCircle(50, 50, 50);
        bossGraphics.fillStyle(0xffffff);
        bossGraphics.fillCircle(35, 40, 10);
        bossGraphics.fillCircle(65, 40, 10);
        bossGraphics.lineStyle(3, 0xffffff);
        bossGraphics.lineBetween(40, 60, 60, 60);
        bossGraphics.generateTexture('boss', 100, 100);
        
        // 플레이어
        const playerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        playerGraphics.fillStyle(0x4ecdc4);
        playerGraphics.fillCircle(30, 30, 30);
        playerGraphics.fillStyle(0xffffff);
        playerGraphics.fillCircle(30, 30, 20);
        playerGraphics.generateTexture('player', 60, 60);
        
        // 화살표
        const arrowGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        arrowGraphics.fillStyle(0xffd93d);
        arrowGraphics.fillTriangle(20, 0, 0, 40, 40, 40);
        arrowGraphics.generateTexture('arrow', 40, 40);
        
        // 패링 효과
        const parryGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        parryGraphics.fillStyle(0x9b59b6, 0.8);
        parryGraphics.fillCircle(50, 50, 50);
        parryGraphics.fillStyle(0xffffff, 0.6);
        parryGraphics.fillCircle(50, 50, 30);
        parryGraphics.generateTexture('parry_effect', 100, 100);
    }
    
    create() {
        this.add.image(400, 300, 'background');
        
        this.uiContainer = this.add.container();
        this.createHPBar();
        
        this.scoreText = this.add.text(20, 70, 'SCORE: 0', {
            fontSize: '24px', color: '#fff', fontStyle: 'bold'
        });
        this.uiContainer.add(this.scoreText);
        
        this.comboText = this.add.text(20, 110, 'COMBO: 0', {
            fontSize: '24px', color: '#ffd93d', fontStyle: 'bold'
        });
        this.uiContainer.add(this.comboText);
        
        this.boss = this.add.image(400, 150, 'boss').setScale(2);
        this.player = this.add.image(400, 450, 'player').setScale(1.5);
        
        this.touchZone = this.add.rectangle(400, 500, 300, 100, 0x4ecdc4, 0.3);
        this.touchText = this.add.text(400, 500, 'TAP HERE!', {
            fontSize: '28px', color: '#fff', fontStyle: 'bold'
        }).setOrigin(0.5);
        
        this.startText = this.add.text(400, 300, '터치하여 시작!', {
            fontSize: '36px', color: '#fff', fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // 터치 이벤트 - 모든 방식 추가
        this.input.on('pointerdown', this.handleTap, this);
        this.input.on('touchstart', this.handleTap, this);
        this.input.keyboard.on('keydown-SPACE', this.handleTap, this);
        this.input.keyboard.on('keydown-ENTER', this.handleTap, this);
        
        this.touchZone.setInteractive();
        this.touchZone.on('pointerdown', this.handleTap, this);
        this.touchZone.on('touchstart', this.handleTap, this);
        
        this.isPlaying = false;
        this.gameOver = false;
    }
    
    createHPBar() {
        this.playerHPBarBg = this.add.rectangle(100, 30, 200, 20, 0x333333);
        this.playerHPBar = this.add.rectangle(100, 30, 200, 20, 0x4ecdc4);
        this.playerHPText = this.add.text(210, 20, 'PLAYER', { fontSize: '16px', color: '#fff' });
        
        this.bossHPBarBg = this.add.rectangle(500, 30, 200, 20, 0x333333);
        this.bossHPBar = this.add.rectangle(500, 30, 200, 20, 0xff6b6b);
        this.bossHPText = this.add.text(710, 20, 'BOSS', { fontSize: '16px', color: '#fff' });
        
        this.uiContainer.add(
            this.playerHPBarBg, this.playerHPBar, this.playerHPText,
            this.bossHPBarBg, this.bossHPBar, this.bossHPText
        );
    }
    
    handleTap() {
        if (this.gameOver) {
            this.scene.restart();
            return;
        }
        
        if (!this.isPlaying) {
            this.startGame();
            return;
        }
        
        this.checkParry();
    }
    
    startGame() {
        this.isPlaying = true;
        this.startText.destroy();
        this.touchText.setText('TAP TO PARRY!');
        this.generateAttackPattern();
        this.gameStartTime = this.time.now;
    }
    
    generateAttackPattern() {
        this.attackTimes = [];
        this.bossPattern.forEach(beat => {
            this.attackTimes.push(beat * this.beatInterval);
        });
    }
    
    checkParry() {
        const currentTime = (this.time.now - this.gameStartTime) / 1000;
        
        let closestAttack = null;
        let minDiff = Infinity;
        
        this.attackTimes.forEach((attackTime, index) => {
            if (this.hitAttacks.has(index)) return;
            
            const diff = Math.abs(currentTime - attackTime);
            if (diff < minDiff) {
                minDiff = diff;
                closestAttack = { time: attackTime, index: index };
            }
        });
        
        if (!closestAttack || minDiff > this.OK_WINDOW) {
            this.showFeedback('MISS', 0xff0000);
            this.takeDamage(10);
            this.combo = 0;
            this.updateCombo();
            return;
        }
        
        let timing, damage, scoreAdd;
        
        if (minDiff <= this.PERFECT_WINDOW) {
            timing = 'PERFECT!'; damage = 15; scoreAdd = 300;
        } else if (minDiff <= this.GOOD_WINDOW) {
            timing = 'GOOD'; damage = 10; scoreAdd = 200;
        } else {
            timing = 'OK'; damage = 5; scoreAdd = 100;
        }
        
        this.hitAttacks.add(closestAttack.index);
        this.dealDamage(damage);
        this.addScore(scoreAdd);
        this.combo++;
        this.updateCombo();
        this.showFeedback(timing, this.getTimingColor(timing));
        this.showParryEffect();
    }
    
    getTimingColor(timing) {
        switch(timing) {
            case 'PERFECT!': return 0xffd93d;
            case 'GOOD': return 0x4ecdc4;
            case 'OK': return 0x95a5a6;
            default: return 0xff0000;
        }
    }
    
    showFeedback(text, color) {
        const feedback = this.add.text(400, 300, text, {
            fontSize: '48px',
            color: '#' + color.toString(16).padStart(6, '0'),
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: feedback,
            alpha: 0, y: 250, duration: 800,
            onComplete: () => feedback.destroy()
        });
    }
    
    showParryEffect() {
        const effect = this.add.image(400, 450, 'parry_effect').setAlpha(0.8);
        
        this.tweens.add({
            targets: effect,
            scale: 2, alpha: 0, duration: 300,
            onComplete: () => effect.destroy()
        });
        
        this.tweens.add({
            targets: this.player,
            x: 410, duration: 50, yoyo: true, repeat: 3
        });
    }
    
    dealDamage(amount) {
        this.bossHP -= amount;
        if (this.bossHP < 0) this.bossHP = 0;
        
        const barWidth = (this.bossHP / this.maxBossHP) * 200;
        this.bossHPBar.width = barWidth;
        this.bossHPBar.x = 500 + (200 - barWidth) / 2;
        
        this.tweens.add({
            targets: this.boss,
            x: 410, duration: 50, yoyo: true, repeat: 3
        });
        
        if (this.bossHP <= 0) {
            this.winGame();
        }
    }
    
    takeDamage(amount) {
        this.playerHP -= amount;
        if (this.playerHP < 0) this.playerHP = 0;
        
        const barWidth = (this.playerHP / 100) * 200;
        this.playerHPBar.width = barWidth;
        this.playerHPBar.x = 100 + (200 - barWidth) / 2;
        
        this.tweens.add({
            targets: this.player,
            x: 410, duration: 50, yoyo: true, repeat: 3
        });
        
        if (this.playerHP <= 0) {
            this.gameOver = true;
            this.showGameOver();
        }
    }
    
    addScore(points) {
        const multiplier = this.getComboMultiplier();
        this.score += points * multiplier;
        this.scoreText.setText(`SCORE: ${this.score}`);
    }
    
    getComboMultiplier() {
        if (this.combo >= 100) return 2.0;
        if (this.combo >= 50) return 1.5;
        if (this.combo >= 20) return 1.2;
        if (this.combo >= 10) return 1.1;
        return 1.0;
    }
    
    updateCombo() {
        this.comboText.setText(`COMBO: ${this.combo}`);
        
        if (this.combo > 0 && this.combo % 10 === 0) {
            const comboText = this.add.text(400, 350, `${this.combo} COMBO!`, {
                fontSize: '36px', color: '#ffd93d', fontStyle: 'bold'
            }).setOrigin(0.5);
            
            this.tweens.add({
                targets: comboText,
                alpha: 0, y: 300, duration: 1000,
                onComplete: () => comboText.destroy()
            });
        }
    }
    
    showGameOver() {
        this.isPlaying = false;
        
        const gameOverText = this.add.text(400, 250, 'GAME OVER', {
            fontSize: '64px', color: '#ff0000', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5);
        
        const scoreText = this.add.text(400, 320, `SCORE: ${this.score}`, {
            fontSize: '36px', color: '#fff'
        }).setOrigin(0.5);
        
        const restartText = this.add.text(400, 400, '터치하여 재시도', {
            fontSize: '28px', color: '#4ecdc4'
        }).setOrigin(0.5);
        
        this.uiContainer.add(gameOverText, scoreText, restartText);
    }
    
    winGame() {
        this.isPlaying = false;
        this.gameOver = true;
        
        this.tweens.add({
            targets: this.boss,
            scale: 0, alpha: 0, duration: 1000,
            onComplete: () => {
                const winText = this.add.text(400, 250, 'VICTORY!', {
                    fontSize: '64px', color: '#ffd93d', fontStyle: 'bold',
                    stroke: '#000000', strokeThickness: 8
                }).setOrigin(0.5);
                
                const scoreText = this.add.text(400, 320, `SCORE: ${this.score}`, {
                    fontSize: '36px', color: '#fff'
                }).setOrigin(0.5);
                
                const restartText = this.add.text(400, 400, '터치하여 재시도', {
                    fontSize: '28px', color: '#4ecdc4'
                }).setOrigin(0.5);
                
                this.uiContainer.add(winText, scoreText, restartText);
            }
        });
    }
    
    update() {
        if (!this.isPlaying || this.gameOver) return;
        
        const currentTime = (this.time.now - this.gameStartTime) / 1000;
        
        // 화살표 관리 (배열 사용)
        this.attackTimes.forEach((attackTime, index) => {
            if (this.hitAttacks.has(index)) return;
            
            const timeDiff = attackTime - currentTime;
            
            if (timeDiff < 1 && timeDiff > -0.5) {
                const progress = 1 - timeDiff;
                const y = 200 + progress * 250;
                
                // 기존 화살표 찾기
                let arrow = this.arrows.find(a => a.index === index);
                
                if (!arrow) {
                    // 새 화살표 생성
                    const newArrow = this.add.image(400, y, 'arrow');
                    this.arrows.push({ arrow: newArrow, index: index });
                } else {
                    // 기존 화살표 위치 업데이트
                    arrow.arrow.y = y;
                }
            }
        });
        
        // 화살표 정리
        for (let i = this.arrows.length - 1; i >= 0; i--) {
            const arrowData = this.arrows[i];
            const attackTime = this.attackTimes[arrowData.index];
            
            // 지나간 화살표
            if (currentTime > attackTime + 0.5 && !this.hitAttacks.has(arrowData.index)) {
                this.hitAttacks.add(arrowData.index);
                this.takeDamage(10);
                this.combo = 0;
                this.updateCombo();
                this.showFeedback('MISS', 0xff0000);
                arrowData.arrow.destroy();
                this.arrows.splice(i, 1);
                continue;
            }
            
            // 히트한 화살표
            if (this.hitAttacks.has(arrowData.index)) {
                arrowData.arrow.destroy();
                this.arrows.splice(i, 1);
            }
        }
    }
}

// 게임 설정
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: MainScene
};

const game = new Phaser.Game(config);

window.addEventListener('load', () => {
    document.getElementById('loading').style.display = 'none';
});
