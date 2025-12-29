// --- Configuration and Initial Data ---
const SUBJECTS = {
    'Physics': { icon: 'fas fa-atom', color: 'var(--color-physics)' },
    'Chemistry': { icon: 'fas fa-flask', color: 'var(--color-chemistry)' },
    'Math': { icon: 'fas fa-calculator', color: 'var(--color-math)' },
    'Biology': { icon: 'fas fa-leaf', color: 'var(--color-biology)' },
    'Bangla': { icon: 'fas fa-language', color: 'var(--color-bangla)' },
    'English': { icon: 'fas fa-pencil-alt', color: 'var(--color-english)' },
    'GK': { icon: 'fas fa-globe-asia', color: 'var(--color-gk)' }
};

// --- DOM Elements ---
const subjectListEl = document.getElementById('subject-list');
const dailyTotalTimeEl = document.getElementById('daily-total-time');
const activeSubjectEl = document.getElementById('active-subject');
const timerDisplayEl = {
    hours: document.getElementById('hours'),
    minutes: document.getElementById('minutes'),
    seconds: document.getElementById('seconds')
};
const startPauseBtn = document.getElementById('start-pause-btn');
const stopBtn = document.getElementById('stop-btn');
const sessionLogEl = document.getElementById('session-log');

// --- State Variables ---
let trackerData = {};
let activeSubject = null;
let timerInterval = null;
let elapsedTimeSeconds = 0; // Current session time in seconds
let isRunning = false;
let sessionStartTime = 0;

// --- Helper Functions ---

/** Converts seconds into HH:MM:SS format string */
function formatTime(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/** Gets today's date string (YYYY-MM-DD) */
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

/** Loads data from localStorage or initializes default structure */
function loadData() {
    const storedData = localStorage.getItem('hscStudyTrackerData');
    if (storedData) {
        trackerData = JSON.parse(storedData);
    } else {
        // Initialize for the first time
        trackerData = {
            subjects: {},
            lastAccessDate: getTodayDate()
        };
        for (const [name, info] of Object.entries(SUBJECTS)) {
            trackerData.subjects[name] = {
                color: info.color,
                totalTimeSeconds: 0,
                sessions: []
            };
        }
    }
    // Check if the day changed and reset daily total if needed
    if (trackerData.lastAccessDate !== getTodayDate()) {
        trackerData.lastAccessDate = getTodayDate();
        // You might want to reset session logs for the UI but keep main totals
    }
}

/** Saves the current trackerData object to localStorage */
function saveData() {
    localStorage.setItem('hscStudyTrackerData', JSON.stringify(trackerData));
}

// --- UI Rendering Functions ---

function renderSubjectCards() {
    subjectListEl.innerHTML = '';
    for (const [name, info] of Object.entries(SUBJECTS)) {
        const totalTime = trackerData.subjects[name] ? trackerData.subjects[name].totalTimeSeconds : 0;
        const card = document.createElement('div');
        card.className = `subject-card ${name === activeSubject ? 'selected' : ''}`;
        card.style.borderLeftColor = info.color;
        card.setAttribute('data-subject', name);
        card.innerHTML = `
            <div class="subject-info">
                <strong><i class="${info.icon}"></i> ${name}</strong>
                <small>Total: ${formatTime(totalTime)}</small>
            </div>
            <button class="select-btn">Select</button>
        `;
        card.addEventListener('click', () => selectSubject(name));
        subjectListEl.appendChild(card);
    }
}

function renderDailyStats() {
    const today = getTodayDate();
    let totalToday = 0;
    
    // Calculate today's total time
    for (const subjectName in trackerData.subjects) {
        const subject = trackerData.subjects[subjectName];
        const todaySession = subject.sessions.find(s => s.date === today);
        if (todaySession) {
            totalToday += todaySession.durationSeconds;
        }
    }
    dailyTotalTimeEl.textContent = formatTime(totalToday);
}

function renderSessionLog() {
    const today = getTodayDate();
    let logHTML = '';
    let hasSessions = false;
    
    for (const subjectName in trackerData.subjects) {
        const subject = trackerData.subjects[subjectName];
        const todaySession = subject.sessions.find(s => s.date === today);
        
        if (todaySession && todaySession.durationSeconds > 0) {
            hasSessions = true;
            logHTML += `
                <div class="log-entry">
                    <span class="log-subject" style="color:${subject.color};">${subjectName}</span>
                    <span class="log-duration">${formatTime(todaySession.durationSeconds)} today</span>
                </div>
            `;
        }
    }

    if (!hasSessions) {
        sessionLogEl.innerHTML = '<p>No sessions logged today. Start tracking!</p>';
    } else {
        sessionLogEl.innerHTML = logHTML;
    }
}

function updateTimerDisplay() {
    const time = formatTime(elapsedTimeSeconds);
    const parts = time.split(':');
    timerDisplayEl.hours.textContent = parts[0];
    timerDisplayEl.minutes.textContent = parts[1];
    timerDisplayEl.seconds.textContent = parts[2];
}

// --- Timer Control Logic ---

function selectSubject(subjectName) {
    if (isRunning) return; // Cannot change subject while timer is running

    activeSubject = subjectName;
    activeSubjectEl.textContent = `Active: ${subjectName}`;
    activeSubjectEl.style.color = SUBJECTS[subjectName].color;
    
    startPauseBtn.disabled = false;
    
    // Update card selection UI
    document.querySelectorAll('.subject-card').forEach(card => card.classList.remove('selected'));
    document.querySelector(`[data-subject="${subjectName}"]`).classList.add('selected');
}

function startTimer() {
    if (isRunning) return;

    isRunning = true;
    sessionStartTime = Date.now() - (elapsedTimeSeconds * 1000);
    
    startPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
    startPauseBtn.classList.remove('primary');
    startPauseBtn.classList.add('secondary');
    stopBtn.disabled = false;

    timerInterval = setInterval(() => {
        elapsedTimeSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
        updateTimerDisplay();
    }, 1000);
}

function pauseTimer() {
    if (!isRunning) return;

    isRunning = false;
    clearInterval(timerInterval);
    startPauseBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
    startPauseBtn.classList.remove('secondary');
    startPauseBtn.classList.add('primary');
}

function stopAndSave() {
    if (!activeSubject) return;

    pauseTimer(); // Ensure timer is stopped
    
    const duration = elapsedTimeSeconds;
    if (duration < 60) {
        // Optionally ignore sessions less than 60 seconds
        alert('Session too short to save (min 60 seconds).');
    } else {
        const today = getTodayDate();
        const subjectData = trackerData.subjects[activeSubject];

        // 1. Update All-Time Total
        subjectData.totalTimeSeconds += duration;

        // 2. Update Today's Session Log
        let todaySession = subjectData.sessions.find(s => s.date === today);
        if (!todaySession) {
            todaySession = { date: today, durationSeconds: 0 };
            subjectData.sessions.push(todaySession);
        }
        todaySession.durationSeconds += duration;
        
        // 3. Save Data and Update UI
        saveData();
        renderSubjectCards();
        renderDailyStats();
        renderSessionLog();
        alert(`Saved ${formatTime(duration)} for ${activeSubject}!`);
    }

    // Reset UI State
    elapsedTimeSeconds = 0;
    activeSubject = null;
    isRunning = false;
    updateTimerDisplay();
    activeSubjectEl.textContent = 'Select a Subject to Start';
    activeSubjectEl.style.color = 'var(--color-accent)';
    startPauseBtn.innerHTML = '<i class="fas fa-play"></i> Start';
    startPauseBtn.classList.remove('secondary');
    startPauseBtn.classList.add('primary');
    startPauseBtn.disabled = true;
    stopBtn.disabled = true;
    
    document.querySelectorAll('.subject-card').forEach(card => card.classList.remove('selected'));
}

// --- Event Listeners ---
startPauseBtn.addEventListener('click', () => {
    if (!activeSubject) {
        alert('Please select a subject first!');
        return;
    }
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
});

stopBtn.addEventListener('click', stopAndSave);

// --- Initialization ---
function init() {
    loadData();
    renderSubjectCards();
    renderDailyStats();
    renderSessionLog();
    saveData(); // Save initial structure if it was a fresh start
}

init();
