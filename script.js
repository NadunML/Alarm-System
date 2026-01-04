// Configuration
const TIME_UNIT = 30; 
const STUDY_TIME_UNIT = 60 * 25; // Testing mode (1 min). Change to (25 * 60) for real usage.
const BREAK_TIME = 5 * 60;

// State Management
let totalTimeMinutes = 120; 
let totalCycles = 4;        
let cyclesCompleted = 0;    
let isRunning = false;
let timerInterval;
let currentSeconds = STUDY_TIME_UNIT; 
let currentPhase = 'study';
let isMusicPlaying = false; 
let currentVolume = 50; 
let youtubePlayer = null;
let isPlayerReady = false;
let shouldPlayOnReady = false; // NEW FLAG: To handle async loading
let currentPlaybackTime = 0;
let playbackInterval;

// Elements
const display = document.getElementById('timer-display');
const statusDisplay = document.getElementById('cycle-status');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const timeSelector = document.getElementById('total-time'); 
const youtubeLinkInput = document.getElementById('youtube-link'); 
const videoContainer = document.getElementById('video-player-container'); 
const alarmSound = document.getElementById('alarm-sound'); 
const musicToggleBtn = document.getElementById('music-toggle-btn');
const volumeUpBtn = document.getElementById('volume-up-btn');
const volumeDownBtn = document.getElementById('volume-down-btn');
const secondaryControls = document.querySelector('.secondary-controls');

// ==========================================
// YOUTUBE API HANDLING (The Critical Part)
// ==========================================

// 1. Load API Script automatically if not present
if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// 2. API Ready Callback
window.onYouTubeIframeAPIReady = function() {
    console.log("✅ YouTube API is Ready");
    // We don't load the video yet. We wait for user action.
};

function getVideoId(url) {
    if (!url) return null;
    const match = url.trim().match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^#\&\?]{11})/) || url.trim().match(/^([a-zA-Z0-9_-]{11})$/);
    return match ? match[1] : null;
}

function updateMusicControlsVisibility() {
    const hasMusic = youtubeLinkInput.value.trim().length > 0;
    secondaryControls.style.display = hasMusic ? 'flex' : 'none';
    if(hasMusic) {
        musicToggleBtn.disabled = false;
        volumeUpBtn.disabled = false;
        volumeDownBtn.disabled = false;
    }
}

function loadVideoPlayer() {
    // If player already exists, don't recreate it
    if (youtubePlayer) return true;

    const videoId = getVideoId(youtubeLinkInput.value);
    if (!videoId) {
        console.log("❌ No valid video ID");
        return false;
    }

    console.log("⏳ Creating YouTube Player...");
    videoContainer.innerHTML = '<div id="youtube-player"></div>';
    
    youtubePlayer = new YT.Player('youtube-player', {
        videoId: videoId,
        playerVars: { 
            'controls': 0, 
            'modestbranding': 1, 
            'autoplay': 0, // We handle play manually
            'loop': 1, 
            'playlist': videoId,
            'rel': 0,
            'origin': window.location.origin // Helps with CORS/Autoplay policies
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
    return true;
}

function onPlayerReady(event) {
    console.log("✅ Player Loaded & Ready!");
    isPlayerReady = true;
    event.target.setVolume(currentVolume);
    updateMusicControlsVisibility();
    
    // THIS IS THE FIX:
    // Check if we were waiting to play music
    if (shouldPlayOnReady) {
        console.log("▶️ Playing because 'shouldPlayOnReady' is true");
        event.target.playVideo();
        shouldPlayOnReady = false; // Reset flag
    }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        isMusicPlaying = true;
        musicToggleBtn.innerHTML = '<i class="fas fa-pause"></i> Pause Music';
        musicToggleBtn.classList.add('playing');
        statusDisplay.classList.add('playing-music');
        startPlaybackTracking();
    } else if (event.data === YT.PlayerState.PAUSED) {
        isMusicPlaying = false;
        resetMusicUI();
        stopPlaybackTracking();
    } else if (event.data === YT.PlayerState.ENDED) {
        if (isRunning) {
            youtubePlayer.playVideo(); // Force Loop
        }
    }
}

function onPlayerError(e) {
    console.error("YouTube Error:", e);
    // Error 150/101 means video doesn't allow embedding
    if(e.data === 150 || e.data === 101) {
        showMessage("This video cannot be played (Copyright). Try another link.", "error");
    }
}

function resetMusicUI() {
    musicToggleBtn.innerHTML = '<i class="fas fa-music"></i> Play Music';
    musicToggleBtn.classList.remove('playing');
    statusDisplay.classList.remove('playing-music');
}

function startPlaybackTracking() {
    stopPlaybackTracking();
    playbackInterval = setInterval(() => {
        if (youtubePlayer && youtubePlayer.getCurrentTime) {
            currentPlaybackTime = youtubePlayer.getCurrentTime();
        }
    }, 1000);
}

function stopPlaybackTracking() {
    if (playbackInterval) clearInterval(playbackInterval);
}

// ==========================================
// CONTROLS
// ==========================================

function playMusic() {
    // If player doesn't exist, Create it AND set flag to play when ready
    if (!youtubePlayer) {
        shouldPlayOnReady = true; // Set flag
        const success = loadVideoPlayer();
        if (!success) shouldPlayOnReady = false;
        return;
    }

    // If player exists but not ready yet
    if (!isPlayerReady) {
        shouldPlayOnReady = true;
        return;
    }
    
    // If ready, just play
    youtubePlayer.playVideo();
}

function pauseMusic() {
    shouldPlayOnReady = false;
    if (youtubePlayer && isPlayerReady) {
        youtubePlayer.pauseVideo();
    }
}

function toggleMusic() {
    if (isMusicPlaying) {
        pauseMusic();
    } else {
        playMusic();
    }
}

function changeVolume(direction) {
    if (!youtubePlayer) return;
    currentVolume = direction === 'up' ? Math.min(100, currentVolume + 10) : Math.max(0, currentVolume - 10);
    youtubePlayer.setVolume(currentVolume);
    showMessage(`Volume: ${currentVolume}%`);
}

// ==========================================
// TIMER LOGIC
// ==========================================

function calculateCycles() {
    totalTimeMinutes = parseInt(timeSelector ? timeSelector.value : 120); 
    totalCycles = Math.floor(totalTimeMinutes / TIME_UNIT); 
    currentSeconds = STUDY_TIME_UNIT; 
    currentPhase = 'study';
    cyclesCompleted = 0; 
}

function formatTime(s) {
    return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

function updateDisplay() {
    display.textContent = formatTime(currentSeconds);
    statusDisplay.textContent = `${currentPhase === 'study' ? 'Study!!' : 'Interval!!'} (Cycle ${cyclesCompleted + 1}/${totalCycles})`;
}

function startTimer() {
    if (isRunning) return;
    if (currentSeconds <= 0) calculateCycles();
    
    // 1. Handle Music Logic First
    if (youtubeLinkInput.value.trim().length > 0) {
        playMusic(); // This handles creation + autoplay logic
    }
    
    // 2. UI Updates
    isRunning = true;
    startBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Running...';
    startBtn.disabled = true;
    timeSelector.disabled = true;
    youtubeLinkInput.disabled = true;
    display.classList.add('pulse');
    
    // 3. Start Loop
    timerInterval = setInterval(tick, 1000);
}

function tick() {
    if (currentSeconds > 0) {
        currentSeconds--;
        updateDisplay();
    } else {
        clearInterval(timerInterval);
        isRunning = false;
        nextPhase();
    }
}

function nextPhase() {
    alarmSound.play().catch(() => {});

    if (currentPhase === 'study') {
        cyclesCompleted++;
        if (cyclesCompleted < totalCycles) {
            currentPhase = 'break';
            currentSeconds = BREAK_TIME;
            showMessage("Break Time!");
            pauseMusic(); // Stop music on break
        } else {
            // Session Complete
            display.textContent = "DONE!";
            statusDisplay.textContent = "Session Completed!";
            pauseMusic();
            setTimeout(() => resetTimer(true), 3000);
            return;
        }
    } else {
        currentPhase = 'study';
        currentSeconds = STUDY_TIME_UNIT;
        showMessage("Focus Mode!");
        playMusic(); // Start music on study
    }
    
    setTimeout(() => {
        alarmSound.currentTime = 0;
        updateDisplay();
        
        // Resume timer
        isRunning = true;
        timerInterval = setInterval(tick, 1000);
    }, 4000);
}

function resetTimer(completed = false) {
    clearInterval(timerInterval);
    isRunning = false;
    display.classList.remove('pulse');
    
    pauseMusic();
    shouldPlayOnReady = false;
    
    calculateCycles();
    
    startBtn.innerHTML = '<i class="fas fa-play"></i> Start Focus';
    startBtn.disabled = timeSelector.disabled = youtubeLinkInput.disabled = false;
    
    if (!completed) {
        statusDisplay.textContent = "Ready to Start";
        updateDisplay();
    }
}

function showMessage(msg, type = "info") {
    let div = document.getElementById('message-display');
    if (!div) {
        div = document.createElement('div');
        div.id = 'message-display';
        document.body.appendChild(div);
    }
    div.textContent = msg;
    div.style.opacity = '1';
    div.style.backgroundColor = type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)';
    setTimeout(() => div.style.opacity = '0', 3000);
}

// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    startBtn.addEventListener('click', startTimer);
    stopBtn.addEventListener('click', () => resetTimer(false));
    musicToggleBtn.addEventListener('click', toggleMusic);
    volumeUpBtn.addEventListener('click', () => changeVolume('up'));
    volumeDownBtn.addEventListener('click', () => changeVolume('down'));
    
    timeSelector.addEventListener('change', () => {
        calculateCycles();
        updateDisplay();
    });
    
    youtubeLinkInput.addEventListener('input', function() {
        updateMusicControlsVisibility();
    });
    
    calculateCycles();
    updateDisplay();
});
