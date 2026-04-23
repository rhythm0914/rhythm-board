// ========== GAME STATE ==========
var isHolding = {
  s: false,
  d: false,
  f: false,
  ' ': false,
  j: false,
  k: false,
  l: false
};

var hits = { perfect: 0, good: 0, bad: 0, miss: 0 };
var multiplier = {
  perfect: 1,
  good: 0.8,
  bad: 0.5,
  miss: 0,
  combo40: 1.05,
  combo80: 1.10
};

var isPlaying = false;
var isPaused = false;
var speed = 0;
var combo = 0;
var maxCombo = 0;
var score = 0;
var animation = 'moveDown';
var startTime;
var pauseStartTime = 0;
var totalPausedTime = 0;
var trackContainer;
var tracks;
var keypress;
var comboText;
var songDurationInterval;
var audioElement;
var menuElement;
var summaryElement;
var pauseOverlay;

// ========== TOUCH SUPPORT VARIABLES ==========
var touchActive = false;
var touchTimeout;

// ========== INITIALIZATION ==========
var initializeNotes = function () {
  if (!trackContainer) {
    console.error('Track container not found');
    return;
  }
  
  var noteElement;
  var trackElement;

  while (trackContainer.hasChildNodes()) {
    trackContainer.removeChild(trackContainer.lastChild);
  }

  song.sheet.forEach(function (key, index) {
    trackElement = document.createElement('div');
    trackElement.classList.add('track');
    trackElement.setAttribute('data-track-index', index);

    key.notes.forEach(function (note) {
      noteElement = document.createElement('div');
      noteElement.classList.add('note');
      noteElement.classList.add('note--' + index);
      noteElement.style.backgroundColor = key.color;
      noteElement.style.animationName = animation;
      noteElement.style.animationTimingFunction = 'linear';
      noteElement.style.animationDuration = Math.max(0.5, note.duration - speed) + 's';
      noteElement.style.animationDelay = note.delay + speed + 's';
      noteElement.style.animationPlayState = 'paused';
      trackElement.appendChild(noteElement);
    });

    trackContainer.appendChild(trackElement);
    tracks = document.querySelectorAll('.track');
  });
};

// ========== O2JAM STYLE COLUMN HIGHLIGHT ==========
var highlightColumn = function (index) {
  if (!tracks || !tracks[index]) return;
  
  tracks[index].classList.add('highlight');
  setTimeout(function() {
    if (tracks && tracks[index]) {
      tracks[index].classList.remove('highlight');
    }
  }, 120);
};

// ========== SPEED SETUP ==========
var setupSpeed = function () {
  var buttons = document.querySelectorAll('.config__speed .btn--small');

  buttons.forEach(function (button) {
    button.addEventListener('click', function (e) {
      e.preventDefault();
      var speedText = this.innerHTML;
      
      if (speedText === '1x') {
        buttons[0].className = 'btn btn--small btn--selected';
        buttons[1].className = 'btn btn--small';
        buttons[2].className = 'btn btn--small';
        speed = 0;
      } else if (speedText === '2x') {
        buttons[0].className = 'btn btn--small';
        buttons[1].className = 'btn btn--small btn--selected';
        buttons[2].className = 'btn btn--small';
        speed = 1;
      } else if (speedText === '3x') {
        buttons[0].className = 'btn btn--small';
        buttons[1].className = 'btn btn--small';
        buttons[2].className = 'btn btn--small btn--selected';
        speed = 2;
      }

      initializeNotes();
    });
  });
};

// ========== CHALLENGE MODE ==========
var setupChallenge = function () {
  var enabled = false;
  var challenge = document.querySelector('.config__challenge .btn--small');
  if (challenge) {
    challenge.addEventListener('click', function (e) {
      e.preventDefault();
      if (enabled) {
        this.className = 'btn btn--small';
        enabled = false;
        animation = 'moveDown';
        initializeNotes();
      } else {
        this.className = 'btn btn--small btn--selected';
        enabled = true;
        animation = 'moveDownFade';
        initializeNotes();
      }
    });
  }
};

// ========== TIMER ==========
var startTimer = function (duration) {
  var display = document.querySelector('.summary__timer');
  if (!display) return;
  
  var timer = duration;
  var minutes;
  var seconds;

  display.style.display = 'block';
  display.style.opacity = 1;

  songDurationInterval = setInterval(function () {
    if (isPaused) return;
    
    minutes = Math.floor(timer / 60);
    seconds = timer % 60;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    display.innerHTML = minutes + ':' + seconds;

    if (--timer < 0) {
      clearInterval(songDurationInterval);
      showResult();
      if (comboText) {
        comboText.style.transition = 'all 1s';
        comboText.style.opacity = 0;
      }
    }
  }, 1000);
};

// ========== SHOW RESULTS ==========
var showResult = function () {
  var perfectCount = document.querySelector('.perfect__count');
  var goodCount = document.querySelector('.good__count');
  var badCount = document.querySelector('.bad__count');
  var missCount = document.querySelector('.miss__count');
  var comboCount = document.querySelector('.combo__count');
  var scoreCount = document.querySelector('.score__count');
  var timerDisplay = document.querySelector('.summary__timer');
  var resultDisplay = document.querySelector('.summary__result');
  var summary = document.querySelector('.summary');
  
  if (perfectCount) perfectCount.innerHTML = hits.perfect;
  if (goodCount) goodCount.innerHTML = hits.good;
  if (badCount) badCount.innerHTML = hits.bad;
  if (missCount) missCount.innerHTML = hits.miss;
  if (comboCount) comboCount.innerHTML = maxCombo;
  if (scoreCount) scoreCount.innerHTML = Math.floor(score);
  
  if (timerDisplay) {
    timerDisplay.style.opacity = 0;
  }
  
  if (summary) {
    summary.classList.add('visible');
  }
  
  if (resultDisplay) {
    resultDisplay.style.opacity = 1;
  }
  
// In showResult function, replace the save call with:
if (typeof saveScoreToLeaderboard !== 'undefined') {
    saveScoreToLeaderboard(score, {
        perfect: hits.perfect,
        good: hits.good,
        bad: hits.bad,
        miss: hits.miss,
        maxCombo: maxCombo
    });
}
  
  var actionButtons = document.querySelector('.action-buttons');
  if (actionButtons) {
    actionButtons.style.display = 'flex';
    actionButtons.style.opacity = '0';
    actionButtons.style.transform = 'translateY(20px)';
    
    setTimeout(function() {
      actionButtons.style.transition = 'all 0.5s ease';
      actionButtons.style.opacity = '1';
      actionButtons.style.transform = 'translateY(0)';
    }, 100);
  }
};

// ========== NOTE MISS DETECTION ==========
var setupNoteMiss = function () {
  if (!trackContainer) return;
  
  trackContainer.addEventListener('animationend', function (event) {
    if (!event.target.classList) return;
    var classList = event.target.classList;
    if (classList.length < 2) return;
    
    var className = classList.item(1);
    if (className && className[6]) {
      var index = parseInt(className[6]);
      if (!isNaN(index)) {
        displayAccuracy('miss');
        updateHits('miss');
        updateCombo('miss');
        updateMaxCombo();
        if (event.target.parentNode && event.target) {
          removeNoteFromTrack(event.target.parentNode, event.target);
        }
        updateNext(index);
      }
    }
  });
};

// ========== KEYBOARD CONTROLS ==========
var setupKeys = function () {
  document.addEventListener('keydown', function (event) {
    // ESC key for pause
    if (event.key === 'Escape' && isPlaying && !isPaused) {
      event.preventDefault();
      pauseGame();
      return;
    }
    
    var keyIndex = getKeyIndex(event.key);

    if (Object.keys(isHolding).indexOf(event.key) !== -1 && !isHolding[event.key]) {
      event.preventDefault();
      isHolding[event.key] = true;
      
      // O2Jam style column highlight
      if (keyIndex !== -1) {
        highlightColumn(keyIndex);
      }
      
      if (keypress && keypress[keyIndex]) {
        keypress[keyIndex].style.display = 'block';
      }

      if (isPlaying && !isPaused && tracks && tracks[keyIndex] && tracks[keyIndex].firstChild) {
        judge(keyIndex);
      }
    }
  });

  document.addEventListener('keyup', function (event) {
    if (Object.keys(isHolding).indexOf(event.key) !== -1) {
      event.preventDefault();
      var keyIndex = getKeyIndex(event.key);
      isHolding[event.key] = false;
      if (keypress && keypress[keyIndex]) {
        keypress[keyIndex].style.display = 'none';
      }
    }
  });
};

// ========== PAUSE FUNCTIONALITY ==========
var pauseGame = function () {
  if (!isPlaying || isPaused) return;
  
  isPaused = true;
  pauseStartTime = Date.now();
  
  // Pause all note animations
  var notes = document.querySelectorAll('.note');
  notes.forEach(function (note) {
    var currentStyle = window.getComputedStyle(note);
    var currentTop = currentStyle.top;
    note.style.animationPlayState = 'paused';
    note.style.top = currentTop;
  });
  
  // Pause audio
  if (audioElement) {
    audioElement.pause();
  }
  
  // Show pause overlay
  if (pauseOverlay) {
    pauseOverlay.classList.add('visible');
  }
};

var resumeGame = function () {
  if (!isPlaying || !isPaused) return;
  
  isPaused = false;
  totalPausedTime += (Date.now() - pauseStartTime);
  
  // Resume note animations
  var notes = document.querySelectorAll('.note');
  notes.forEach(function (note) {
    note.style.animationPlayState = 'running';
    note.style.top = '';
  });
  
  // Resume audio
  if (audioElement) {
    audioElement.play().catch(function(e) {
      console.log('Audio resume failed:', e);
    });
  }
  
  // Hide pause overlay
  if (pauseOverlay) {
    pauseOverlay.classList.remove('visible');
  }
};

var restartFromPause = function () {
  if (pauseOverlay) {
    pauseOverlay.classList.remove('visible');
  }
  resetGame();
  setTimeout(function() {
    startGame();
  }, 100);
};

var homeFromPause = function () {
  window.location.href = 'index.html';
};

// ========== SETUP PAUSE OVERLAY ==========
var setupPauseOverlay = function () {
  pauseOverlay = document.createElement('div');
  pauseOverlay.className = 'pause-overlay';
  pauseOverlay.innerHTML = `
    <div class="pause-title">⏸ GAME PAUSED</div>
    <div class="pause-buttons">
      <button class="pause-btn pause-btn--resume" id="resumeBtn">▶ Resume</button>
      <button class="pause-btn pause-btn--restart" id="pauseRestartBtn">🔄 Restart</button>
      <button class="pause-btn pause-btn--home" id="pauseHomeBtn">🏠 Home</button>
    </div>
  `;
  document.querySelector('main').appendChild(pauseOverlay);
  
  document.getElementById('resumeBtn').addEventListener('click', resumeGame);
  document.getElementById('pauseRestartBtn').addEventListener('click', restartFromPause);
  document.getElementById('pauseHomeBtn').addEventListener('click', homeFromPause);
};

// ========== TOUCH CONTROLS ==========
var getKeyCharFromElement = function (key) {
  var text = key.querySelector('span')?.innerText?.toLowerCase();
  if (text === 's') return 's';
  if (text === 'd') return 'd';
  if (text === 'f') return 'f';
  if (text === 'space') return ' ';
  if (text === 'j') return 'j';
  if (text === 'k') return 'k';
  if (text === 'l') return 'l';
  return null;
};

var addTouchFeedback = function (element) {
  element.classList.add('key-touch-active');
  if (touchTimeout) clearTimeout(touchTimeout);
  touchTimeout = setTimeout(function() {
    element.classList.remove('key-touch-active');
  }, 150);
};

var simulateKeyPress = function (key, index) {
  if (!isHolding[key]) {
    isHolding[key] = true;
    
    // O2Jam style column highlight for touch
    highlightColumn(index);
    
    if (keypress && keypress[index]) {
      keypress[index].style.display = 'block';
    }
    if (isPlaying && !isPaused && tracks && tracks[index] && tracks[index].firstChild) {
      judge(index);
    }
  }
};

var simulateKeyRelease = function (key, index) {
  if (isHolding[key]) {
    isHolding[key] = false;
    if (keypress && keypress[index]) {
      keypress[index].style.display = 'none';
    }
  }
};

var setupTouchControls = function () {
  var keys = document.querySelectorAll('.key');
  
  keys.forEach(function (key, index) {
    key.addEventListener('touchstart', function (e) {
      e.preventDefault();
      var keyChar = getKeyCharFromElement(key);
      if (keyChar) {
        simulateKeyPress(keyChar, index);
        addTouchFeedback(key);
      }
    }, { passive: false });
    
    key.addEventListener('touchend', function (e) {
      e.preventDefault();
      var keyChar = getKeyCharFromElement(key);
      if (keyChar) {
        simulateKeyRelease(keyChar, index);
      }
    }, { passive: false });
    
    key.addEventListener('touchcancel', function (e) {
      var keyChar = getKeyCharFromElement(key);
      if (keyChar) {
        simulateKeyRelease(keyChar, index);
      }
    });
    
    key.addEventListener('mousedown', function (e) {
      var keyChar = getKeyCharFromElement(key);
      if (keyChar) {
        simulateKeyPress(keyChar, index);
        addTouchFeedback(key);
      }
    });
    
    key.addEventListener('mouseup', function (e) {
      var keyChar = getKeyCharFromElement(key);
      if (keyChar) {
        simulateKeyRelease(keyChar, index);
      }
    });
    
    key.addEventListener('mouseleave', function (e) {
      var keyChar = getKeyCharFromElement(key);
      if (keyChar) {
        simulateKeyRelease(keyChar, index);
      }
    });
  });
};

// ========== HELPER FUNCTIONS ==========
var getKeyIndex = function (key) {
  if (key === 's') return 0;
  if (key === 'd') return 1;
  if (key === 'f') return 2;
  if (key === ' ') return 3;
  if (key === 'j') return 4;
  if (key === 'k') return 5;
  if (key === 'l') return 6;
  return -1;
};

// ========== JUDGEMENT ==========
var judge = function (index) {
  var adjustedTime = Date.now() - totalPausedTime;
  var timeInSecond = (adjustedTime - startTime) / 1000;
  var nextNoteIndex = song.sheet[index].next;
  var nextNote = song.sheet[index].notes[nextNoteIndex];
  
  if (!nextNote) return;
  
  var perfectTime = nextNote.duration + nextNote.delay;
  var accuracy = Math.abs(timeInSecond - perfectTime);
  var hitJudgement;
  var maxAccuracy = (nextNote.duration - speed) / 4;

  if (accuracy > maxAccuracy) {
    return;
  }

  hitJudgement = getHitJudgement(accuracy);
  displayAccuracy(hitJudgement);
  showHitEffect(index);
  updateHits(hitJudgement);
  updateCombo(hitJudgement);
  updateMaxCombo();
  calculateScore(hitJudgement);
  
  if (tracks[index] && tracks[index].firstChild) {
    removeNoteFromTrack(tracks[index], tracks[index].firstChild);
  }
  updateNext(index);
};

var getHitJudgement = function (accuracy) {
  if (accuracy < 0.1) return 'perfect';
  if (accuracy < 0.2) return 'good';
  if (accuracy < 0.25) return 'bad';
  return 'miss';
};

var displayAccuracy = function (accuracy) {
  var hitDiv = document.querySelector('.hit');
  if (!hitDiv) return;
  
  var accuracyDiv = document.querySelector('.hit__accuracy');
  if (accuracyDiv) {
    accuracyDiv.remove();
  }
  
  var accuracyText = document.createElement('div');
  accuracyText.classList.add('hit__accuracy');
  accuracyText.classList.add('hit__accuracy--' + accuracy);
  accuracyText.innerHTML = accuracy.toUpperCase();
  hitDiv.appendChild(accuracyText);
  
  setTimeout(function() {
    if (accuracyText && accuracyText.remove) {
      accuracyText.remove();
    }
  }, 800);
};

var showHitEffect = function (index) {
  var keys = document.querySelectorAll('.key');
  if (!keys[index]) return;
  
  var key = keys[index];
  var hitEffect = document.createElement('div');
  hitEffect.classList.add('key__hit');
  key.appendChild(hitEffect);
  
  setTimeout(function() {
    if (hitEffect && hitEffect.remove) {
      hitEffect.remove();
    }
  }, 800);
};

var updateHits = function (judgement) {
  hits[judgement]++;
};

var updateCombo = function (judgement) {
  if (judgement === 'bad' || judgement === 'miss') {
    combo = 0;
    if (comboText) {
      comboText.innerHTML = '';
    }
  } else {
    combo++;
    if (comboText) {
      comboText.innerHTML = combo;
    }
  }
};

var updateMaxCombo = function () {
  maxCombo = maxCombo > combo ? maxCombo : combo;
};

var calculateScore = function (judgement) {
  var baseScore = 1000 * multiplier[judgement];
  
  if (combo >= 80) {
    score += baseScore * multiplier.combo80;
  } else if (combo >= 40) {
    score += baseScore * multiplier.combo40;
  } else {
    score += baseScore;
  }
  
  if (score < 0) score = 0;
};

var removeNoteFromTrack = function (parent, child) {
  if (parent && child && parent.contains(child)) {
    parent.removeChild(child);
  }
};

var updateNext = function (index) {
  if (song.sheet[index] && song.sheet[index].next !== undefined) {
    song.sheet[index].next++;
  }
};

// ========== GAME CONTROL ==========
var setupStartButton = function () {
  var startButton = document.querySelector('.btn--start');
  if (startButton) {
    startButton.addEventListener('click', function (e) {
      e.preventDefault();
      startGame();
    });
  }
};

var startGame = function () {
  isPlaying = true;
  isPaused = false;
  totalPausedTime = 0;
  startTime = Date.now();

  startTimer(song.duration);
  
  var menu = document.querySelector('.menu');
  if (menu) {
    menu.classList.add('hidden');
    menu.style.opacity = '0';
  }
  
  audioElement = document.querySelector('.song');
  if (audioElement) {
    audioElement.currentTime = 0;
    audioElement.play().catch(function(e) {
      console.log('Audio play failed:', e);
    });
  }
  
  var notes = document.querySelectorAll('.note');
  notes.forEach(function (note) {
    note.style.animationPlayState = 'running';
  });
};

// ========== RESET GAME ==========
var resetGame = function () {
    isPlaying = false;
    isPaused = false;
	
	if (typeof resetScoreSavedFlag !== 'undefined') {
        resetScoreSavedFlag();
    }
    
    if (pauseOverlay) {
      pauseOverlay.classList.remove('visible');
    }
    
    if (songDurationInterval) {
        clearInterval(songDurationInterval);
        songDurationInterval = null;
    }
    
    hits = { perfect: 0, good: 0, bad: 0, miss: 0 };
    combo = 0;
    maxCombo = 0;
    score = 0;
    
    song.sheet.forEach(function(key) {
        key.next = 0;
    });
    
    if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
    }
    
    var tracksList = document.querySelectorAll('.track');
    tracksList.forEach(function(track) {
        while (track.firstChild) {
            track.removeChild(track.firstChild);
        }
    });
    
    initializeNotes();
    
    var summary = document.querySelector('.summary');
    if (summary) {
        summary.classList.remove('visible');
    }
    
    var summaryResult = document.querySelector('.summary__result');
    if (summaryResult) {
        summaryResult.style.opacity = 0;
    }
    
    var actionButtons = document.querySelector('.action-buttons');
    if (actionButtons) {
        actionButtons.style.display = 'none';
    }
    
    var menu = document.querySelector('.menu');
    if (menu) {
        menu.classList.remove('hidden');
        menu.style.opacity = '1';
    }
    
    if (comboText) {
        comboText.innerHTML = '';
        comboText.style.opacity = 1;
    }
    
    var timerDisplay = document.querySelector('.summary__timer');
    if (timerDisplay) {
        timerDisplay.style.opacity = 0;
        timerDisplay.innerHTML = '';
        timerDisplay.style.display = 'none';
    }
    
    var accuracyDiv = document.querySelector('.hit__accuracy');
    if (accuracyDiv) {
        accuracyDiv.innerHTML = '';
    }
    
    if (keypress) {
        keypress.forEach(function(kp) {
            if (kp) kp.style.display = 'none';
        });
    }
    
    for (var key in isHolding) {
        isHolding[key] = false;
    }
};

// ========== ACTION BUTTONS - SIMPLIFIED (Only Replay & Home) ==========
var setupActionButtons = function () {
    document.body.addEventListener('click', function(e) {
        var target = e.target;
        var btn = target.closest('.action-btn');
        
        if (!btn) return;
        if (btn.classList.contains('action-btn--processing')) return;
        
        // Home button
        if (btn.id === 'homeBtn' || btn.classList.contains('action-btn--home')) {
            btn.classList.add('action-btn--processing');
            window.location.href = 'index.html';
        }
        
        // Replay button (replaces both restart and replay)
        if (btn.id === 'replayBtn' || btn.classList.contains('action-btn--replay')) {
            btn.classList.add('action-btn--processing');
            resetGame();
            setTimeout(function() {
                startGame();
                btn.classList.remove('action-btn--processing');
            }, 150);
        }
    });
};

var hideActionButtons = function() {
  var actionButtons = document.querySelector('.action-buttons');
  if (actionButtons) {
    actionButtons.style.display = 'none';
  }
};

// ========== PREVENT ZOOM ON DOUBLE TAP ==========
var preventZoomOnDoubleTap = function() {
  document.addEventListener('touchstart', function(e) {
    if (e.target.closest('.key') || e.target.closest('.action-btn') || e.target.closest('.btn')) {
      e.preventDefault();
    }
  }, { passive: false });
};

// ========== WINDOW ONLOAD ==========
window.onload = function () {
  trackContainer = document.querySelector('.track-container');
  keypress = document.querySelectorAll('.keypress');
  comboText = document.querySelector('.hit__combo');
  audioElement = document.querySelector('.song');
  menuElement = document.querySelector('.menu');
  summaryElement = document.querySelector('.summary');

  if (!trackContainer) {
    console.error('Required elements not found!');
    return;
  }

  initializeNotes();
  setupSpeed();
  setupChallenge();
  setupStartButton();
  setupKeys();
  setupTouchControls();
  setupNoteMiss();
  setupActionButtons();
  setupPauseOverlay();
  hideActionButtons();
  preventZoomOnDoubleTap();
  
  console.log('Game initialized with Pause feature and O2Jam highlights!');
};