//Cycle Configuration 
const TIME_UNIT = 30; 
const STUDY_TIME_UNIT = 25 * 60 ; // 25 minutes study
const BREAK_TIME = 5 * 60 ;       // 5 minutes break
const PHASE_TRANSITION_DELAY = 4000; 

//Global Variables
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
let userManuallyPaused = false;
let currentPlaybackTime = 0;

//DOM Elements
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

//YouTube Player API Functions
window.onYouTubeIframeAPIReady = function() {
    console.log("✅ YouTube API Ready - Player can be created");
    if (youtubeLinkInput.value.trim()) {
        loadVideoPlayer();
    }
};

function getVideoId(url) {
    if (!url) return null;
    url = url.trim();
    
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
        
        musicToggleBtn.disabled = false;
        volumeUpBtn.disabled = false;
        volumeDownBtn.disabled = false;
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
    
    musicToggleBtn.innerHTML = '<i class="fas fa-play"></i> Play Music';
    musicToggleBtn.classList.remove('playing');
    isMusicPlaying = false;
    userManuallyPaused = false;
    
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
            userManuallyPaused = false;
            
            //Start tracking playback time when music plays
            startPlaybackTracking();
            break;
            
        case YT.PlayerState.PAUSED:
            isMusicPlaying = false;
            musicToggleBtn.innerHTML = '<i class="fas fa-play"></i> Play Music';
            musicToggleBtn.classList.remove('playing');
            statusDisplay.classList.remove('playing-music');
            
            //Stop tracking playback time when music is paused
            stopPlaybackTracking();
            break;
            
        case YT.PlayerState.ENDED:
            isMusicPlaying = false;
            musicToggleBtn.innerHTML = '<i class="fas fa-play"></i> Play Music';
            musicToggleBtn.classList.remove('playing');
            statusDisplay.classList.remove('playing-music');
            console.log("🔄 Music ended, restarting...");
            
            //Reset playback time when music ends
            currentPlaybackTime = 0;
            stopPlaybackTracking();
            
            if (isRunning && !userManuallyPaused) {
                setTimeout(() => {
                    if (youtubePlayer && youtubePlayer.playVideo) {
                        youtubePlayer.playVideo();
                    }
                }, 1000);
            }
            break;
    }
}

//Function to track current playback time
let playbackInterval;
function startPlaybackTracking() {
    playbackInterval = setInterval(() => {
        if (youtubePlayer && youtubePlayer.getCurrentTime) {
            currentPlaybackTime = youtubePlayer.getCurrentTime();
            console.log("⏱️ Current playback time:", currentPlaybackTime);
        }
    }, 1000); //Update every second
}

// Function to stop tracking playback time
function stopPlaybackTracking() {
    if (playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = null;
    }
}

// Function to seek to saved playback time
function resumeFromLastPosition() {
    if (youtubePlayer && youtubePlayer.seekTo && currentPlaybackTime > 0) {
        console.log("⏩ Resuming from:", currentPlaybackTime, "seconds");
        youtubePlayer.seekTo(currentPlaybackTime, true);
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
    showMessage("Error loading music video", "error");
}

//MANUAL music control (user clicks play/pause)
function playMusic() {
    if (!youtubePlayer || !isPlayerReady) {
        console.log("⏳ Player not ready, attempting to load...");
        showMessage("Loading music player...", "info");
        if (loadVideoPlayer()) {
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
        console.log("🎵 MANUALLY playing music...");
        userManuallyPaused = false;
        
        // Resume from last position if available
        if (currentPlaybackTime > 0) {
            resumeFromLastPosition();
        }
        
        youtubePlayer.playVideo();
    } catch (error) {
        console.error("❌ Error playing music:", error);
        showMessage("Error playing music", "error");
    }
}

//MANUAL pause (user clicks pause)
function pauseMusic() {
    if (!youtubePlayer || !isPlayerReady) return;
    
    try {
        console.log("⏸️ MANUALLY pausing music...");
        userManuallyPaused = true;
        youtubePlayer.pauseVideo();
    } catch (error) {
        console.error("❌ Error pausing music:", error);
    }
}

function toggleMusic() {
    console.log("🎵 Toggle music called, isMusicPlaying:", isMusicPlaying);
    console.log("🎵 User manually paused:", userManuallyPaused);
    
    if (!youtubePlayer || !isPlayerReady) {
        console.log("⏳ Player not ready, loading...");
        showMessage("Loading music player...", "info");
        if (loadVideoPlayer()) {
            const waitForReady = setInterval(() => {
                if (isPlayerReady) {
                    clearInterval(waitForReady);
                    playMusic();
                }
            }, 100);
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

// NEW: Function to play completion alarm
function playCompletionAlarm() {
    try {
        console.log("🎉 Playing completion alarm!");
        alarmSound.currentTime = 0;
        alarmSound.play().then(() => {
            console.log("✅ Completion alarm started playing");
            // Play the alarm for longer duration (8 seconds)
            setTimeout(() => {
                alarmSound.pause();
                alarmSound.currentTime = 0;
                console.log("⏹️ Completion alarm stopped");
            }, 8000);
        }).catch(e => {
            console.log("❌ Completion alarm play failed:", e);
        });
    } catch (error) {
        console.log("❌ Completion alarm error:", error);
    }
}

//Utility Functions
function showMessage(message, type = "info") {
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
    
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}

//Core Timer Logic
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
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getPhaseName(phase) {
    if (phase === 'study') return 'Study!!';
    return 'Interval!!'; // Only study and break phases
}

function updateDisplay() {
    display.textContent = formatTime(currentSeconds);
    const cycleStatusText = `${getPhaseName(currentPhase)} (Cycle ${cyclesCompleted + 1}/${totalCycles})`; 
    statusDisplay.textContent = cycleStatusText;
    
    updateMusicControlsVisibility();
    
    //AUTO-PLAY music only during study phase AND if user hasn't manually paused
    if (isRunning && youtubePlayer && isPlayerReady && currentPhase === 'study' && !isMusicPlaying && !userManuallyPaused) {
        console.log("🎵 AUTO-playing music for study phase");
        playMusic();
    }
}

function nextPhase() {
    // Play alarm for phase transition
    try {
        alarmSound.currentTime = 0;
        alarmSound.play().catch(e => console.log("Alarm sound play failed:", e));
    } catch (error) {
        console.log("Alarm sound error:", error);
    }

    let isFinished = false;

    //Phase transitions - Only study and break phases
    if (currentPhase === 'study') {
        cyclesCompleted++; 
        if (cyclesCompleted < totalCycles) {
            currentPhase = 'break';
            currentSeconds = BREAK_TIME;
            showMessage("Break Time! Relax for a bit");
            
            // Auto-pause music during break time
            if (youtubePlayer && isPlayerReady && isMusicPlaying) {
                console.log("⏸️ Auto-pausing music for break time");
                youtubePlayer.pauseVideo();
            }
            
        } else {
            isFinished = true; 
        }
    } else {
        currentPhase = 'study';
        currentSeconds = STUDY_TIME_UNIT;
        showMessage("Study Time! Focus mode activated");
        
        //Reset manual pause when starting new study session
        userManuallyPaused = false;
        
        // Auto-resume music from last position when study starts
        if (youtubePlayer && isPlayerReady && !isMusicPlaying && !userManuallyPaused) {
            console.log("🎵 Auto-resuming music for study time from position:", currentPlaybackTime);
            setTimeout(() => {
                resumeFromLastPosition();
                youtubePlayer.playVideo();
            }, 500);
        }
    }
    
    if (isFinished) {
        // ⭐⭐ CHANGED: Play completion alarm before resetting timer
        console.log("🎉 Session completed! Playing completion alarm...");
        playCompletionAlarm();
        
        // Show completion message immediately
        display.textContent = "DONE!";
        statusDisplay.textContent = `${totalTimeMinutes/60} hrs Done! GREAT! 🥳`;
        showMessage("Session completed! Great job! 🎉");
        
        // Reset timer after alarm plays
        setTimeout(() => {
            resetTimer(true);
        }, 3000);
        return;
    }

    setTimeout(() => {
        // REMOVED: alarmSound.pause() - Let alarm play fully
        alarmSound.currentTime = 0;
        updateDisplay();
        startTimer(); 
    }, 4000); 
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
    
    if (youtubeLinkInput.value.trim().length > 0 && !youtubePlayer) {
        console.log("🎵 Starting timer with music");
        loadVideoPlayer();
    }
    
    isRunning = true;
    startBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Running...';
    startBtn.disabled = true; 
    timeSelector.disabled = true; 
    youtubeLinkInput.disabled = true; 
    
    musicToggleBtn.disabled = false;
    volumeUpBtn.disabled = false;
    volumeDownBtn.disabled = false;
    
    display.classList.add('pulse');
    
    timerInterval = setInterval(tick, 1000); 
    showMessage("Timer started! Keep up the focus! 🚀");
}

function resetTimer(completed = false) {
    clearInterval(timerInterval);
    isRunning = false;
    
    display.classList.remove('pulse');
    
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
    
    musicToggleBtn.disabled = false;
    volumeUpBtn.disabled = false;
    volumeDownBtn.disabled = false;
    
    //Reset manual pause state
    userManuallyPaused = false;
    
    // Reset playback time
    currentPlaybackTime = 0;
    stopPlaybackTracking();
    
    updateMusicControlsVisibility();
    
    // Stop any playing alarm
    alarmSound.pause();
    alarmSound.currentTime = 0;
    
    if (completed) {
        // Completion message is already shown in nextPhase()
        display.textContent = "DONE!";
        statusDisplay.textContent = `${totalTimeMinutes/60} HOURS COMPLETED! GREAT WORK! 🥳`;
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

//Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ DOM loaded, initializing...");
    
    if (!window.YT) {
        console.log("⚠️ YouTube API not loaded, loading now...");
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
    
    startBtn.addEventListener('click', startTimer);
    stopBtn.addEventListener('click', () => resetTimer(false)); 
    musicToggleBtn.addEventListener('click', toggleMusic); 
    volumeUpBtn.addEventListener('click', () => changeVolume('up')); 
    volumeDownBtn.addEventListener('click', () => changeVolume('down')); 
    
    timeSelector.addEventListener('change', initialize); 
    
    youtubeLinkInput.addEventListener('input', function() {
        console.log("🎵 YouTube input changed:", this.value);
        updateMusicControlsVisibility();
        
        if (this.value.trim().length > 0 && !youtubePlayer) {
            loadVideoPlayer();
        }
    });
    
    initialize();
    
    console.log("✅ App initialized successfully");
    showMessage("Study Focus Timer Ready! 🚀", "success");
});