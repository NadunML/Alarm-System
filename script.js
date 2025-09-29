// Cycle Timer
const TIME_UNIT = 30; // 30 minutes
const STUDY_TIME_UNIT = 20 * 60; // 20 min in seconds
const REVIEW_TIME = 5 * 60;  // 5 min
const BREAK_TIME = 5 * 60;   // 5 min
const PHASE_TRANSITION_DELAY = 1500; // 1.5 seconds

// Global Variables
let totalTimeMinutes; 
let totalCycles;        
let cyclesCompleted = 0;    
let isRunning = false;
let timerInterval;
let currentSeconds; 
let currentPhase;

// DOM Elements
const display = document.getElementById('timer-display');
const statusDisplay = document.getElementById('cycle-status');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const timeSelector = document.getElementById('total-time'); 
const alarmSound = document.getElementById('alarm-sound'); 

// Core Functions

// 1.Cycle count
function calculateCycles() {
   
    if (timeSelector) {
        totalTimeMinutes = parseInt(timeSelector.value); 
    } else {
        totalTimeMinutes = 120;
    }
    
    totalCycles = totalTimeMinutes / TIME_UNIT; 
    
    currentSeconds = STUDY_TIME_UNIT; 
    currentPhase = 'study';
    cyclesCompleted = 0; 
}

// 2. Display update
function updateDisplay() {
    display.textContent = formatTime(currentSeconds);
    
    const cycleStatusText = ` ${getPhaseName(currentPhase)} (Cycle ${cyclesCompleted + 1}/${totalCycles})`; 
    statusDisplay.textContent = cycleStatusText;
}

// 3. Time format karana eka
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
}

// 4. Phase eke nama ganna
function getPhaseName(phase) {
    if (phase === 'study') return 'STUDY TIME';
    if (phase === 'review') return 'REVIEW TIME';
    return 'BREAK TIME'; 
}

// 5. Timer eka nawaththala next phase ekata yanna
function nextPhase() {
    alarmSound.pause();
    alarmSound.currentTime = 0; 
    alarmSound.play(); 

    let isFinished = false;
    
    if (currentPhase === 'study') {
        currentPhase = 'review';
        currentSeconds = REVIEW_TIME;
        
    } else if (currentPhase === 'review') {
        cyclesCompleted++; 
        
        // Final Cycle Break
        if (cyclesCompleted < totalCycles) {
            currentPhase = 'break';
            currentSeconds = BREAK_TIME;
        } else {
            isFinished = true; // End final Round
        }

    } else { // currentPhase === 'break'
        currentPhase = 'study';
        currentSeconds = STUDY_TIME_UNIT;
    }
    
    // When all cycles are done
    if (isFinished) {
        resetTimer(true); 
        return;
    }

    // start after a short delay
    setTimeout(() => {
        alarmSound.pause();
        alarmSound.currentTime = 0;
        updateDisplay();
        startTimer(); 
        
    }, PHASE_TRANSITION_DELAY); 
}

// 6. Main tick function
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

// 7. Start button
function startTimer() {
    if (currentSeconds <= 0 && !isRunning) {
        calculateCycles();
        updateDisplay();
    }
    
    if (isRunning) return;
    
    isRunning = true;
    startBtn.textContent = 'Running...';
    startBtn.disabled = true; 
    timeSelector.disabled = true; 
    
    timerInterval = setInterval(tick, 1000); 
}

// 8. Stop/Reset button eka
function resetTimer(completed = false) {
    clearInterval(timerInterval);
    isRunning = false;
    
    calculateCycles(); 
    
    startBtn.textContent = 'Start';
    startBtn.disabled = false; 
    timeSelector.disabled = false; 
    
    alarmSound.pause();
    alarmSound.currentTime = 0;
    
    if (completed) {
        display.textContent = "DONE!";
        statusDisplay.textContent = `${totalTimeMinutes/60} HOURS COMPLETED! GREAT WORK! 🥳`;
    } else {
        updateDisplay();
    }
}

// 9. Initial Load function
function initialize() {
    calculateCycles(); 
    updateDisplay();
}

document.addEventListener('DOMContentLoaded', () => {
    // Button Clicks
    startBtn.addEventListener('click', startTimer);
    stopBtn.addEventListener('click', () => resetTimer(false)); 

    timeSelector.addEventListener('change', initialize); 
    
    initialize();
});