# Rhythm-Board | Kataware Doki Rhythm Tap Game

![Game Screenshot](./img/screenshot.gif)

## 📌 Project Overview

**Rhythm-Board** is a precision-based 7-key rhythm tap game featuring the beautiful piano piece **"Kataware Doki" (片割れ時)** from Makoto Shinkai's acclaimed anime film **"Your Name" (君の名は)**. 

This project was developed as the **Web Systems & Technologies Final Project** for **UPHSD Molino - College of Computer Studies**, completed in a 2-week sprint by a team of two developers.

### 🎮 Game Concept (Rhythm Tap Genre)

Players must time their key presses perfectly with musical beats and visual scrolling notes. The game features:

- **7 vertical lanes** corresponding to keys: S, D, F, SPACE, J, K, L
- **4 judgment levels**: PERFECT, GOOD, BAD, MISS
- **Combo multiplier system**: 1.05x at 40 combo, 1.10x at 80 combo
- **Speed adjustments**: 1x, 2x, or 3x note speed
- **Challenge mode**: Fading notes for increased difficulty
- **Pause functionality**: Press ESC to pause/resume

### 🏆 Core Mechanic

The game judges your timing accuracy against each note's perfect hit window:

| Judgment | Timing Window | Score Multiplier |
|----------|---------------|------------------|
| PERFECT  | ≤ 0.1 seconds  | 1.00x + combo    |
| GOOD     | ≤ 0.2 seconds  | 0.80x + combo    |
| BAD      | ≤ 0.25 seconds | 0.50x + combo    |
| MISS     | > 0.25 seconds | 0x (resets combo)|

## 👥 Development Team

| Role | Developer | Responsibilities |
|------|-----------|------------------|
| **Lead Developer & Game Logic** | Ryan Cañano | Core rhythm game mechanics, judgment system, combo scoring, note timing algorithms, game loop implementation |
| **UI/UX Designer & Frontend Developer** | Adiel Sedigo | Website portal design, CSS styling, responsive layouts, leaderboard integration, Firebase authentication |

## 🎵 Music Credits

- **Original Composition**: Yojiro Noda (RADWIMPS) - "Kataware Doki" from "Your Name" (君の名は)
- **Piano Synthesia Arrangement**: [Theishter](http://www.theishter.com/)
- **Game Inspiration**: O2Jam, Guitar Hero, osu!

## 🕹️ How To Play

### Keyboard Controls

| Key | Lane | Color |
|-----|------|-------|
| S | Lane 1 | Blue |
| D | Lane 2 | Red |
| F | Lane 3 | Blue |
| SPACE | Lane 4 | Orange |
| J | Lane 5 | Blue |
| K | Lane 6 | Red |
| L | Lane 7 | Blue |

**Additional Controls:**
- `ESC` - Pause / Resume game
- Mouse/Touch - Click on-screen keys

### Game Instructions

1. **Launch the game** from the website portal
2. **Configure settings**: Choose speed (1x/2x/3x) and optionally enable Challenge Mode
3. **Click START** to begin the 56-second song
4. **Watch the notes** fall down each lane
5. **Press the matching key** exactly when the note reaches the hit zone
6. **Build your combo** by chaining accurate hits
7. **Complete the song** to see your final score
8. **Sign in** to save your score to the global leaderboard!

## 🛠️ Technical Implementation

### Technologies Used

| Technology | Purpose |
|------------|---------|
| HTML5 | Game structure and layout |
| CSS3 | Styling, animations, responsive design |
| Vanilla JavaScript | Core game logic, note animation, judgment system |
| Firebase Auth | User authentication (login/signup) |
| Firestore | Leaderboard data storage and retrieval |
| Web Audio API | Music playback and timing |

### Key Features Implemented

- ✅ **Complete Game Loop**: Menu → Gameplay → Score/Game Over screen
- ✅ **7-Key Rhythm System**: Fully functional note tracking and judgment
- ✅ **Combo Multiplier**: Dynamic scoring based on consecutive hits
- ✅ **Speed Settings**: Adjustable note fall speed (3 presets)
- ✅ **Challenge Mode**: Fading notes option
- ✅ **Pause System**: ESC to pause/resume gameplay
- ✅ **User Authentication**: Firebase login/signup
- ✅ **Global Leaderboard**: Saves and displays top player scores
- ✅ **Responsive Design**: Works on desktop, tablet, and mobile
- ✅ **Touch Support**: On-screen keys for mobile devices

## 📁 Project Structure
