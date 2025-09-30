// Cycle Configuration
const TIME_UNIT = 30; 
const STUDY_TIME_UNIT = 20 * 60; // 20 minutes study
const REVIEW_TIME = 5 * 60;      // 5 minutes review  
const BREAK_TIME = 5 * 60;       // 5 minutes break
const PHASE_TRANSITION_DELAY = 2000; 

// Global Variables
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

// DOM Elements
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

// YouTube Player API Functions
window.onYouTubeIframeAPIReady = function() {
    console.log("✅ YouTube API Ready - Player can be created");
    // Auto-load player if there's already a YouTube link
    if (youtubeLinkInput.value.trim()) {
        loadVideoPlayer();
    }
};

// Improved video ID extraction
function getVideoId(url) {
    if (!url) return null;
    
    // Remove any extra spaces
    url = url.trim();
    
    // Handle various YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^#\&\?]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (let pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            console.log("✅ Extracted Video ID:", match[1]);
            return match[1];
        }
    }
    
    console.log("❌ Could not extract Video ID from:", url);
    return null;
}

function updateMusicControlsVisibility() {
    const hasValidMusic = youtubeLinkInput.value.trim().length > 0;
    
    if (hasValidMusic) {
        secondaryControls.style.display = 'flex';
        musicToggleBtn.style.display = 'inline-block';
        volumeUpBtn.style.display = 'inline-block';
        volumeDownBtn.style.display = 'inline-block';
    } else {
        secondaryControls.style.display = 'none';
        musicToggleBtn.style.display = 'none';
        volumeUpBtn.style.display = 'none';
        volumeDownBtn.style.display = 'none';
    }
}

function loadVideoPlayer() {
    const url = youtubeLinkInput.value.trim();
    const videoId = getVideoId(url);
    
    console.log("🎵 Loading video player for:", url);
    console.log("🎵 Video ID:", videoId);
    
    if (!videoId) {
        console.log("❌ Invalid YouTube URL or ID");
        showMessage("Please enter a valid YouTube URL", "error");
        videoContainer.innerHTML = '';
        youtubePlayer = null;
        isPlayerReady = false;
        updateMusicControlsVisibility();
        return false;
    }

    // Clear previous player
    videoContainer.innerHTML = '<div id="youtube-player"></div>';
    
    try {
        youtubePlayer = new YT.Player('youtube-player', {
            videoId: videoId,
            playerVars: {
                'controls': 0,
                'modestbranding': 1,
                'rel': 0,
                'autoplay': 0,
                'loop': 1,
                'playlist': videoId,
                'enablejsapi': 1
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });
        
        console.log("✅ YouTube player created successfully");
        showMessage("Music player loaded successfully!", "success");
        return true;
    } catch (error) {
        console.error("❌ Error creating YouTube player:", error);
        showMessage("Error loading music player", "error");
        return false;
    }
}

function onPlayerReady(event) {
    console.log("✅ YouTube Player Ready");
    isPlayerReady = true;
    event.target.setVolume(currentVolume);
    updateMusicControlsVisibility();
    
    // Update button text
    musicToggleBtn.innerHTML = '<i class="fas fa-play"></i> Play Music';
    musicToggleBtn.classList.remove('playing');
    isMusicPlaying = false;
    
    showMessage("Music player ready! Click 'Play Music' to start", "success");
}

function onPlayerStateChange(event) {
    console.log("🎵 YouTube Player State Changed:", getStateName(event.data));
    
    switch(event.data) {
        case YT.PlayerState.PLAYING:
            isMusicPlaying = true;
            musicToggleBtn.innerHTML = '<i class="fas fa-pause"></i> Pause Music';
            musicToggleBtn.classList.add('playing');
            statusDisplay.classList.add('playing-music');
            showMessage("Music is now playing", "success");
            break;
            
        case YT.PlayerState.PAUSED:
            isMusicPlaying = false;
            musicToggleBtn.innerHTML = '<i class="fas fa-play"></i> Play Music';
            musicToggleBtn.classList.remove('playing');
            statusDisplay.classList.remove('playing-music');
            break;
            
        case YT.PlayerState.ENDED:
            isMusicPlaying = false;
            musicToggleBtn.innerHTML = '<i class="fas fa-play"></i> Play Music';
            musicToggleBtn.classList.remove('playing');
            statusDisplay.classList.remove('playing-music');
            console.log("🔄 Music ended, restarting...");
            // Auto-restart if in study phase
            if (currentPhase === 'study' && isRunning) {
                setTimeout(() => youtubePlayer.playVideo(), 1000);
            }
            break;
            
        case YT.PlayerState.BUFFERING:
            console.log("⏳ Music buffering...");
            break;
            
        case YT.PlayerState.CUED:
            console.log("✅ Music cued and ready");
            break;
    }
}

function getStateName(state) {
    const states = {
        [-1]: 'UNSTARTED',
        [0]: 'ENDED',
        [1]: 'PLAYING',
        [2]: 'PAUSED',
        [3]: 'BUFFERING',
        [5]: 'CUED'
    };
    return states[state] || 'UNKNOWN';
}

function onPlayerError(event) {
    console.error("❌ YouTube Player Error:", event.data);
    const errorMessages = {
        2: "Invalid video ID",
        5: "HTML5 player error",
        100: "Video not found",
        101: "Video not embeddable",
        150: "Video not embeddable"
    };
    const message = errorMessages[event.data] || "Unknown error occurred";
    showMessage(`Music error: ${message}`, "error");
}

function playMusic() {
    if (!youtubePlayer || !isPlayerReady) {
        console.log("⏳ Player not ready, attempting to load...");
        showMessage("Loading music player...", "info");
        if (loadVideoPlayer()) {
            // Wait a bit for player to initialize
            setTimeout(() => {
                if (youtubePlayer && youtubePlayer.playVideo) {
                    console.log("🎵 Attempting to play music after loading");
                    youtubePlayer.playVideo();
                }
            }, 2000);
        }
        return;
    }
    
    try {
        console.log("🎵 Playing music...");
        youtubePlayer.playVideo();
    } catch (error) {
        console.error("❌ Error playing music:", error);
        showMessage("Error playing music", "error");
    }
}

function pauseMusic() {
    if (!youtubePlayer || !isPlayerReady) return;
    
    try {
        console.log("⏸️ Pausing music...");
        youtubePlayer.pauseVideo();
    } catch (error) {
        console.error("❌ Error pausing music:", error);
    }
}

function toggleMusic() {
    console.log("🎵 Toggle music called, isMusicPlaying:", isMusicPlaying);
    
    if (!youtubePlayer || !isPlayerReady) {
        console.log("⏳ Player not ready, loading...");
        showMessage("Loading music player...", "info");
        if (loadVideoPlayer()) {
            // Wait for player to be ready then play
            const waitForReady = setInterval(() => {
                if (isPlayerReady) {
                    clearInterval(waitForReady);
                    playMusic();
                }
            }, 100);
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(waitForReady);
                showMessage("Music player timeout. Please try again.", "error");
            }, 5000);
        }
        return;
    }
    
    if (isMusicPlaying) {
        pauseMusic();
    } else {
        playMusic();
    }
}

function changeVolume(direction) {
    if (!youtubePlayer || !isPlayerReady) {
        showMessage("Music player not ready", "error");
        return;
    }

    const volumeStep = 10;
    let newVolume = currentVolume;

    if (direction === 'up') {
        newVolume = Math.min(100, currentVolume + volumeStep);
    } else if (direction === 'down') {
        newVolume = Math.max(0, currentVolume - volumeStep);
    }

    if (newVolume !== currentVolume) {
        currentVolume = newVolume;
        youtubePlayer.setVolume(currentVolume);
        console.log("🔊 Volume set to:", currentVolume);
        showMessage(`Volume: ${currentVolume}%`, "info");
    }
}

// Utility Functions
function showMessage(message, type = "info") {
    // Create a temporary message display
    let messageDiv = document.getElementById('message-display');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'message-display';
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 500;
            z-index: 10000;
            max-width: 80%;
            text-align: center;
            transition: all 0.3s ease;
        `;
        document.body.appendChild(messageDiv);
    }
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#6366f1',
        warning: '#f59e0b'
    };
    
    messageDiv.textContent = message;
    messageDiv.style.backgroundColor = colors[type] || colors.info;
    messageDiv.style.color = 'white';
    messageDiv.style.opacity = '1';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}

// Core Timer Logic
function calculateCycles() {
    if (timeSelector) {
        totalTimeMinutes = parseInt(timeSelector.value); 
    } else {
        totalTimeMinutes = 120;
    }
    totalCycles = Math.floor(totalTimeMinutes / TIME_UNIT); 
    currentSeconds = STUDY_TIME_UNIT; 
    currentPhase = 'study';
    cyclesCompleted = 0; 
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
}

function getPhaseName(phase) {
    if (phase === 'study') return 'STUDY!!';
    if (phase === 'review') return 'REVIEW !!';
    return 'BREAK TIME'; 
}

function updateDisplay() {
    display.textContent = formatTime(currentSeconds);
    const cycleStatusText = `${getPhaseName(currentPhase)} (Cycle ${cyclesCompleted + 1}/${totalCycles})`; 
    statusDisplay.textContent = cycleStatusText;
    
    updateMusicControlsVisibility();
    
    // Auto-play/pause music based on phase
    if (isRunning && youtubePlayer && isPlayerReady) {
        if (currentPhase === 'study' && !isMusicPlaying) {
            console.log("🎵 Auto-playing music for study phase");
            playMusic();
        } else if (currentPhase !== 'study' && isMusicPlaying) {
            console.log("⏸️ Auto-pausing music for break phase");
            pauseMusic();
        }
    }
}

function nextPhase() {
    // Play alarm sound
    try {
        alarmSound.currentTime = 0;
        alarmSound.play().catch(e => console.log("Alarm sound play failed:", e));
    } catch (error) {
        console.log("Alarm sound error:", error);
    }

    let isFinished = false;
    
    // Pause music during transitions
    pauseMusic();

    // Phase transitions
    if (currentPhase === 'study') {
        currentPhase = 'review';
        currentSeconds = REVIEW_TIME;
        showMessage("Review Time! Take notes", "info");
    } else if (currentPhase === 'review') {
        cyclesCompleted++; 
        if (cyclesCompleted < totalCycles) {
            currentPhase = 'break';
            currentSeconds = BREAK_TIME;
            showMessage("Break Time! Relax for a bit", "success");
        } else {
            isFinished = true; 
        }
    } else {
        currentPhase = 'study';
        currentSeconds = STUDY_TIME_UNIT;
        showMessage("Study Time! Focus mode activated", "info");
    }
    
    if (isFinished) {
        resetTimer(true); 
        return;
    }

    setTimeout(() => {
        alarmSound.pause();
        alarmSound.currentTime = 0;
        updateDisplay();
        startTimer(); 
    }, PHASE_TRANSITION_DELAY); 
}

function tick() {
    if (currentSeconds > 0) {
        currentSeconds--;
    } else {
        clearInterval(timerInterval); 
        isRunning = false; 
        nextPhase();
        return;
    }
    updateDisplay();
}

function startTimer() {
    if (isRunning) return;
    
    if (currentSeconds <= 0) {
        calculateCycles();
        updateDisplay();
    }
    
    // Load YouTube player if music link is provided
    if (youtubeLinkInput.value.trim().length > 0 && !youtubePlayer) {
        console.log("🎵 Starting timer with music");
        loadVideoPlayer();
    }
    
    isRunning = true;
    startBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Running...';
    startBtn.disabled = true; 
    timeSelector.disabled = true; 
    youtubeLinkInput.disabled = true; 
    
    display.classList.add('pulse');
    
    timerInterval = setInterval(tick, 1000); 
    showMessage("Timer started! Good luck with your study session", "success");
}

function resetTimer(completed = false) {
    clearInterval(timerInterval);
    isRunning = false;
    
    display.classList.remove('pulse');
    
    // Stop music and destroy player
    pauseMusic();
    if (youtubePlayer) {
        youtubePlayer.destroy();
        youtubePlayer = null;
        isPlayerReady = false;
    }
    videoContainer.innerHTML = '';
    
    calculateCycles(); 
    
    startBtn.innerHTML = '<i class="fas fa-play"></i> Start Focus';
    startBtn.disabled = false; 
    timeSelector.disabled = false; 
    youtubeLinkInput.disabled = false; 
    
    updateMusicControlsVisibility();
    
    // Reset alarm sound
    alarmSound.pause();
    alarmSound.currentTime = 0;
    
    if (completed) {
        display.textContent = "DONE!";
        statusDisplay.textContent = `${totalTimeMinutes/60} HOURS COMPLETED! GREAT WORK! 🥳`;
        showMessage("Session completed! Great job! 🎉", "success");
    } else {
        statusDisplay.textContent = "Ready to Start";
        updateDisplay();
        showMessage("Timer reset", "info");
    }
}

function initialize() {
    calculateCycles(); 
    statusDisplay.textContent = "Ready to Start"; 
    updateMusicControlsVisibility();
    updateDisplay();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ DOM loaded, initializing...");
    
    // Check if YouTube API is loaded
    if (!window.YT) {
        console.log("⚠️ YouTube API not loaded, loading now...");
        // Create and load YouTube IFrame API script
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
    
    // Timer controls
    startBtn.addEventListener('click', startTimer);
    stopBtn.addEventListener('click', () => resetTimer(false)); 
    
    // Music controls
    musicToggleBtn.addEventListener('click', toggleMusic); 
    volumeUpBtn.addEventListener('click', () => changeVolume('up')); 
    volumeDownBtn.addEventListener('click', () => changeVolume('down')); 
    
    // Settings
    timeSelector.addEventListener('change', initialize); 
    
    // YouTube input changes
    youtubeLinkInput.addEventListener('input', function() {
        console.log("🎵 YouTube input changed:", this.value);
        updateMusicControlsVisibility();
        
        // If there's a valid link and no player, pre-load it
        if (this.value.trim().length > 0 && !youtubePlayer) {
            loadVideoPlayer();
        }
    });
    
    // Initialize the app
    initialize();
    
    console.log("✅ App initialized successfully");
    showMessage("Study Focus Timer Ready! 🚀", "success");
});