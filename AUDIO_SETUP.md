# Audio Setup Guide

Your BlockDrop game now supports background music and sound effects! However, you need to add your own audio files.

## ⚠️ Important: Copyright Notice

The **"Original Tetris theme"** is **copyrighted music** and cannot be used legally in your game without permission. Instead, you should use **royalty-free music**.

## 🎵 Where to Get Free Music & Sound Effects

### Background Music (Royalty-Free)

1. **Pixabay** (https://pixabay.com/music/)
   - Free for commercial use
   - No attribution required
   - Search for: "8-bit game music" or "retro arcade music"

2. **FreeMusicArchive** (https://freemusicarchive.org/)
   - Filter by "Creative Commons" licenses
   - Search for: "chiptune" or "game music"

3. **OpenGameArt** (https://opengameart.org/)
   - Specifically for game developers
   - Search for: "tetris-style music" or "puzzle game music"

4. **Incompetech** (https://incompetech.com/)
   - Free music by Kevin MacLeod
   - Requires attribution in your game

### Sound Effects

1. **Freesound** (https://freesound.org/)
   - Free sound effects
   - Search for: "glass break", "pop", "clear", "explosion"

2. **ZapSplat** (https://www.zapsplat.com/)
   - Free sound effects
   - Requires free account

3. **SoundBible** (http://soundbible.com/)
   - Free sound effects
   - Check license for each sound

## 📁 Required Files

You need to add these two audio files to your BlockDrop folder:

1. **`music.mp3`** - Background music (looping)
   - Recommended length: 1-3 minutes (it will loop)
   - Suggested style: Upbeat 8-bit/chiptune music

2. **`clear.mp3`** - Sound effect when line clears
   - Recommended length: 0.5-1 second
   - Suggested sounds: Pop, shatter, glass break, ding

## 🎮 How to Add Your Audio Files

### Step 1: Download Audio Files

1. Visit one of the free music websites above
2. Download a background music file (MP3 format)
3. Download a sound effect file (MP3 format)

### Step 2: Rename and Add to Project

1. Rename your background music to: **`music.mp3`**
2. Rename your sound effect to: **`clear.mp3`**
3. Put both files in your BlockDrop folder (same folder as index.html)

### Step 3: Test It!

1. Open your game: http://localhost:8000/index.html
2. Click START GAME
3. Background music should start playing
4. Clear a line - you should hear the sound effect!

## 🔊 Audio Features

Your game now has:
- ✅ Background music plays when game starts
- ✅ Music loops continuously
- ✅ Music pauses when you pause the game
- ✅ Music stops when game is over
- ✅ Sound effect plays when clearing lines
- ✅ Music resumes when you play again
- ✅ Volume: Music at 30%, Sound effect at 50%

## 🛠️ Customizing Volume

If you want to adjust the volume, edit `game.js` and find these lines (around line 796-799):

```javascript
if (bgMusic) {
    bgMusic.volume = 0.3;  // Change this (0.0 to 1.0)
}
if (clearSound) {
    clearSound.volume = 0.5;  // Change this (0.0 to 1.0)
}
```

- `0.0` = Silent
- `0.5` = 50% volume
- `1.0` = 100% volume

## 💡 Suggested Music Search Terms

When looking for music, try searching for:
- "8-bit arcade"
- "chiptune puzzle"
- "retro game music"
- "tetris-style"
- "puzzle game background"

## 🎯 Quick Recommendations

**For Background Music:**
- Look for upbeat, energetic 8-bit style music
- 120-140 BPM is good for Tetris-style games
- Should not be too distracting

**For Sound Effect:**
- Short (under 1 second)
- Clear and satisfying sound
- "Pop", "ding", or "glass break" sounds work well

## ⚖️ License Reminder

Make sure to:
1. Check the license of any audio you download
2. Give proper attribution if required
3. Never use copyrighted music without permission

Enjoy your game with sound! 🎮🎵
