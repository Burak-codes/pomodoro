(function () {
    'use strict';

    const AudioEngine = {
        ctx: null,

        init() {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        },

        playTone(frequency, duration, type = 'sine', volume = 0.3) {
            this.init();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = type;
            osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.start(this.ctx.currentTime);
            osc.stop(this.ctx.currentTime + duration);
        },

        playBreakStart() {
            this.init();
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, i) => {
                setTimeout(() => {
                    this.playTone(freq, 0.5, 'sine', 0.25);
                }, i * 180);
            });
            setTimeout(() => this.speak('Ara vakti! Biraz dinlenin.'), 900);
        },

        playBreakEnd() {
            this.init();
            const pattern = [
                { f: 880, d: 0.15, t: 0 },
                { f: 988, d: 0.15, t: 150 },
                { f: 1108, d: 0.15, t: 300 },
                { f: 1318, d: 0.3, t: 450 },
                { f: 1318, d: 0.15, t: 700 },
                { f: 1480, d: 0.4, t: 850 },
            ];
            pattern.forEach(({ f, d, t }) => {
                setTimeout(() => this.playTone(f, d, 'triangle', 0.28), t);
            });
            setTimeout(() => this.speak('Mola bitti! Odaklanma zamanı.'), 1300);
        },

        playTick() {
            this.init();
            this.playTone(1000, 0.05, 'square', 0.08);
        },

        playFinish() {
            this.init();
            const melody = [
                { f: 523, d: 0.2, t: 0 },
                { f: 659, d: 0.2, t: 200 },
                { f: 784, d: 0.2, t: 400 },
                { f: 1047, d: 0.5, t: 600 },
            ];
            melody.forEach(({ f, d, t }) => {
                setTimeout(() => this.playTone(f, d, 'sine', 0.2), t);
            });
        },

        speak(text) {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'tr-TR';
                utterance.rate = 0.9;
                utterance.pitch = 1.1;
                utterance.volume = 0.8;
                window.speechSynthesis.speak(utterance);
            }
        }
    };

    const STORAGE_KEY = 'pomodoro_data_v2';

    const defaultState = {
        focusDuration: 30,
        breakDuration: 5,
        sessions: [],
    };

    function loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...defaultState, ...parsed };
            }
        } catch (e) {
            console.error('Failed to load state:', e);
        }
        return { ...defaultState };
    }

    function saveState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error('Failed to save state:', e);
        }
    }

    let appState = loadState();

    let timerInterval = null;
    let timeRemaining = appState.focusDuration * 60;
    let totalTime = appState.focusDuration * 60;
    let isRunning = false;
    let isPaused = false;
    let currentMode = 'focus';
    let sessionStartTime = null;
    let elapsedFocusSeconds = 0;

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const els = {
        timerTime: $('#timerTime'),
        timerProgress: $('#timerProgress'),
        timerStatus: $('#timerStatus'),
        timerLabel: $('#timerLabel'),
        timerSection: $('#timerSection'),
        startBtn: $('#startBtn'),
        resetBtn: $('#resetBtn'),
        finishBtn: $('#finishBtn'),
        playIcon: $('#playIcon'),
        pauseIcon: $('#pauseIcon'),
        focusTab: $('#focusTab'),
        breakTab: $('#breakTab'),
        focusDuration: $('#focusDuration'),
        breakDuration: $('#breakDuration'),
        todaySessions: $('#todaySessions'),
        todayMinutes: $('#todayMinutes'),
        totalSessions: $('#totalSessions'),
        totalMinutes: $('#totalMinutes'),
        avgDaily: $('#avgDaily'),
        streak: $('#streak'),
        focusBadge: $('#focusBadge'),
        focusEmoji: $('#focusEmoji'),
        focusLevel: $('#focusLevel'),
        focusMeterFill: $('#focusMeterFill'),
        suggestionText: $('#suggestionText'),
        historyList: $('#historyList'),
        clearHistoryBtn: $('#clearHistoryBtn'),
        notificationOverlay: $('#notificationOverlay'),
        notifIcon: $('#notifIcon'),
        notifTitle: $('#notifTitle'),
        notifMessage: $('#notifMessage'),
        notifBtn: $('#notifBtn'),
    };

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function updateDisplay() {
        els.timerTime.textContent = formatTime(timeRemaining);

        const circumference = 2 * Math.PI * 126;
        const progress = timeRemaining / totalTime;
        const offset = circumference * progress;
        els.timerProgress.style.strokeDashoffset = circumference - offset;

        const modeText = currentMode === 'focus' ? '🎯 Odak' : '☕ Mola';
        document.title = `${formatTime(timeRemaining)} — ${modeText} | Pomodoro`;
    }

    function setMode(mode) {
        currentMode = mode;
        const isBreak = mode === 'break';

        els.focusTab.classList.toggle('active', !isBreak);
        els.breakTab.classList.toggle('active', isBreak);
        if (isBreak) {
            els.breakTab.classList.add('break-mode');
        } else {
            els.breakTab.classList.remove('break-mode');
        }

        const breakElements = [els.timerProgress, els.timerStatus, els.timerTime];
        breakElements.forEach(el => el.classList.toggle('break-mode', isBreak));
        els.startBtn.classList.toggle('break-mode', isBreak);

        totalTime = (isBreak ? appState.breakDuration : appState.focusDuration) * 60;
        timeRemaining = totalTime;
        els.timerLabel.textContent = isBreak ? 'Mola Süresi' : 'Odaklanma Süresi';
        els.timerStatus.textContent = 'Hazır';

        updateDisplay();
    }

    function startTimer() {
        AudioEngine.init();

        if (isPaused) {
            isPaused = false;
            isRunning = true;
            els.timerStatus.textContent = currentMode === 'focus' ? 'Odaklanıyor...' : 'Mola...';
            els.timerSection.classList.add('running');
            els.playIcon.style.display = 'none';
            els.pauseIcon.style.display = 'block';
            timerInterval = setInterval(tick, 1000);
            return;
        }

        if (isRunning) {
            clearInterval(timerInterval);
            isRunning = false;
            isPaused = true;
            els.timerStatus.textContent = 'Duraklatıldı';
            els.timerSection.classList.remove('running');
            els.playIcon.style.display = 'block';
            els.pauseIcon.style.display = 'none';
            return;
        }

        isRunning = true;
        isPaused = false;
        sessionStartTime = Date.now();
        elapsedFocusSeconds = 0;
        els.timerStatus.textContent = currentMode === 'focus' ? 'Odaklanıyor...' : 'Mola...';
        els.timerSection.classList.add('running');
        els.playIcon.style.display = 'none';
        els.pauseIcon.style.display = 'block';
        timerInterval = setInterval(tick, 1000);
    }

    function tick() {
        timeRemaining--;

        if (currentMode === 'focus') {
            elapsedFocusSeconds++;
        }

        if (timeRemaining <= 10 && timeRemaining > 0) {
            AudioEngine.playTick();
        }

        updateDisplay();

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            isRunning = false;
            isPaused = false;
            els.timerSection.classList.remove('running');
            els.playIcon.style.display = 'block';
            els.pauseIcon.style.display = 'none';

            if (currentMode === 'focus') {
                recordSession(totalTime / 60, true);
                AudioEngine.playBreakStart();
                showNotification(
                    '☕',
                    'Ara Vakti!',
                    `Harika! ${totalTime / 60} dakika odaklandınız. Şimdi biraz dinlenin.`,
                    () => {
                        setMode('break');
                        startTimer();
                    }
                );
            } else {
                AudioEngine.playBreakEnd();
                showNotification(
                    '🔥',
                    'Mola Bitti!',
                    'Dinlendiniz, şimdi odaklanma zamanı! Hazır olduğunuzda başlayın.',
                    () => {
                        setMode('focus');
                    }
                );
            }
        }
    }

    function resetTimer() {
        clearInterval(timerInterval);
        isRunning = false;
        isPaused = false;
        timeRemaining = totalTime;
        elapsedFocusSeconds = 0;
        sessionStartTime = null;
        els.timerStatus.textContent = 'Hazır';
        els.timerSection.classList.remove('running');
        els.playIcon.style.display = 'block';
        els.pauseIcon.style.display = 'none';
        updateDisplay();
    }

    function finishTimer() {
        if (!isRunning && !isPaused) return;

        clearInterval(timerInterval);
        isRunning = false;
        isPaused = false;
        els.timerSection.classList.remove('running');
        els.playIcon.style.display = 'block';
        els.pauseIcon.style.display = 'none';

        if (currentMode === 'focus' && elapsedFocusSeconds >= 60) {
            const minutes = Math.round(elapsedFocusSeconds / 60);
            recordSession(minutes, false);
            AudioEngine.playFinish();
            showNotification(
                '✅',
                'Oturum Bitirildi',
                `${minutes} dakika odaklandınız. İyi iş!`,
                () => {
                    setMode('focus');
                }
            );
        } else {
            setMode(currentMode);
        }

        elapsedFocusSeconds = 0;
        sessionStartTime = null;
    }

    function recordSession(minutes, completed) {
        const session = {
            date: new Date().toISOString(),
            duration: minutes,
            completed: completed,
            type: 'focus',
        };
        appState.sessions.push(session);
        saveState(appState);
        updateStats();
        updateHistory();
    }

    function showNotification(icon, title, message, onDismiss) {
        els.notifIcon.textContent = icon;
        els.notifTitle.textContent = title;
        els.notifMessage.textContent = message;
        els.notificationOverlay.classList.add('active');

        if (Notification.permission === 'granted') {
            new Notification(title, { body: message, icon: '🍅' });
        }

        els.notifBtn.onclick = () => {
            els.notificationOverlay.classList.remove('active');
            if (onDismiss) onDismiss();
        };
    }

    function getTodayStr() {
        return new Date().toISOString().split('T')[0];
    }

    function getWeekDates() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            dates.push(d.toISOString().split('T')[0]);
        }
        return dates;
    }

    function calculateFocusLevel(sessions) {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentSessions = sessions.filter(s => new Date(s.date) >= weekAgo);
        const totalMinutes = recentSessions.reduce((sum, s) => sum + s.duration, 0);
        const completedCount = recentSessions.filter(s => s.completed).length;
        const dailyAvg = totalMinutes / 7;

        let score = 0;
        score += Math.min(dailyAvg / 2, 30);
        score += Math.min(completedCount * 4, 40);
        score += Math.min(totalMinutes / 10, 30);

        score = Math.min(Math.round(score), 100);

        let level, emoji, cssClass, suggestion;

        if (score < 25) {
            level = 'Az';
            emoji = '🌱';
            cssClass = 'level-low';
            suggestion = getRandomSuggestion('low');
        } else if (score < 50) {
            level = 'Orta';
            emoji = '🌿';
            cssClass = 'level-medium';
            suggestion = getRandomSuggestion('medium');
        } else if (score < 75) {
            level = 'İyi';
            emoji = '🌳';
            cssClass = 'level-good';
            suggestion = getRandomSuggestion('good');
        } else {
            level = 'Çok İyi';
            emoji = '🏆';
            cssClass = 'level-great';
            suggestion = getRandomSuggestion('great');
        }

        return { score, level, emoji, cssClass, suggestion, totalMinutes, completedCount, dailyAvg };
    }

    function getRandomSuggestion(level) {
        const suggestions = {
            low: [
                'Küçük adımlarla başlayın! Günde en az 1 pomodoro oturumu yaparak alışkanlık oluşturun.',
                'Telefonunuzu başka bir odaya bırakarak dikkat dağıtıcıları azaltın.',
                'Sabah ilk iş olarak en önemli görevinizle başlayın.',
                'Çalışma ortamınızı düzenleyin — temiz bir masa odaklanmayı artırır.',
                '5 dakikalık kısa oturumlarla başlayın, sonra süreyi artırın.',
            ],
            medium: [
                'İyi ilerliyorsunuz! Günde 3-4 pomodoro oturumu hedefleyin.',
                'Oturumlar arasında kısa yürüyüşler yaparak beyin yorgunluğunu azaltın.',
                'Günün en verimli saatlerinizi belirleyin ve önemli işleri o saatlere planlayın.',
                'Bir yapılacaklar listesi tutarak her oturum başında hedefinizi netleştirin.',
                '"İki dakika kuralı"nı deneyin — 2 dakikadan kısa işleri hemen yapın.',
            ],
            good: [
                'Harika gidiyorsunuz! Şimdi derin çalışma tekniklerini deneyin.',
                'Flow (akış) durumuna ulaşmak için 45 dakikalık uzun oturumlar deneyin.',
                'Haftalık hedefler belirleyerek gelişiminizi somutlaştırın.',
                'Pomodoro sonunda kısa notlar alarak öğrenmenizi pekiştirin.',
                'Müzik dinleyerek çalışıyorsanız enstrümantal müzik tercih edin.',
            ],
            great: [
                'Olağanüstü! Odak seviyeniz çok yüksek. Bu tempoyu koruyun!',
                'Başkalarına mentorluk yaparak hem onlara hem kendinize fayda sağlayın.',
                'Yeni beceriler öğrenmek için zamanınızın %20\'sini ayırın.',
                'Fiziksel egzersiz ve meditasyonla odak kapasitenizi daha da artırın.',
                'Haftalık geri dönüş yaparak verimlilik stratejilerinizi geliştirin.',
            ],
        };
        const pool = suggestions[level];
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function calculateStreak(sessions) {
        if (sessions.length === 0) return 0;

        const sessionDates = new Set(sessions.map(s => s.date.split('T')[0]));
        const today = new Date();
        let streak = 0;

        const todayStr = getTodayStr();
        if (!sessionDates.has(todayStr)) {
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            if (!sessionDates.has(yesterdayStr)) return 0;
        }

        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const checkStr = checkDate.toISOString().split('T')[0];
            if (sessionDates.has(checkStr)) {
                streak++;
            } else {
                if (i === 0) continue;
                break;
            }
        }

        return streak;
    }

    function updateStats() {
        const todayStr = getTodayStr();
        const todaySessions = appState.sessions.filter(s => s.date.startsWith(todayStr));
        const todayMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0);

        els.todaySessions.textContent = todaySessions.length;
        els.todayMinutes.textContent = todayMinutes;
        els.totalSessions.textContent = appState.sessions.length;
        els.totalMinutes.textContent = appState.sessions.reduce((sum, s) => sum + s.duration, 0);

        els.streak.textContent = calculateStreak(appState.sessions);

        const focus = calculateFocusLevel(appState.sessions);
        els.avgDaily.textContent = Math.round(focus.dailyAvg);

        els.focusEmoji.textContent = focus.emoji;
        els.focusLevel.textContent = focus.level;
        els.focusBadge.className = `focus-badge ${focus.cssClass}`;
        els.focusMeterFill.style.width = `${focus.score}%`;
        els.suggestionText.textContent = focus.suggestion;

        updateWeeklyChart();
    }

    function updateWeeklyChart() {
        const weekDates = getWeekDates();
        const todayStr = getTodayStr();
        let maxMinutes = 1;

        const dailyMinutes = weekDates.map(date => {
            const dayMinutes = appState.sessions
                .filter(s => s.date.startsWith(date))
                .reduce((sum, s) => sum + s.duration, 0);
            maxMinutes = Math.max(maxMinutes, dayMinutes);
            return { date, minutes: dayMinutes };
        });

        dailyMinutes.forEach((day, i) => {
            const bar = $(`#bar-${i}`);
            const height = Math.max(4, (day.minutes / maxMinutes) * 80);
            bar.style.height = `${height}px`;
            bar.classList.toggle('today', day.date === todayStr);
            bar.title = `${day.minutes} dakika`;
        });
    }

    function updateHistory() {
        const recent = [...appState.sessions].reverse().slice(0, 15);

        if (recent.length === 0) {
            els.historyList.innerHTML = `
                <div class="empty-history">
                    <span>📋</span>
                    <p>Henüz oturum kaydı yok</p>
                </div>
            `;
            return;
        }

        els.historyList.innerHTML = recent.map(session => {
            const date = new Date(session.date);
            const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
            const statusText = session.completed ? 'Tamamlandı' : 'Erken bitirildi';
            const dotClass = session.completed ? 'completed' : '';

            return `
                <div class="history-item">
                    <div class="history-item-left">
                        <div class="history-dot ${dotClass}"></div>
                        <div class="history-item-info">
                            <strong>${statusText}</strong>
                            <span>${dateStr} • ${timeStr}</span>
                        </div>
                    </div>
                    <div class="history-item-duration">${session.duration} dk</div>
                </div>
            `;
        }).join('');
    }

    function changeDuration(target, action) {
        if (isRunning || isPaused) return;

        const key = target === 'focus' ? 'focusDuration' : 'breakDuration';
        const min = target === 'focus' ? 5 : 1;
        const max = target === 'focus' ? 90 : 30;
        const step = 5;

        if (action === 'increase') {
            appState[key] = Math.min(appState[key] + step, max);
        } else {
            appState[key] = Math.max(appState[key] - step, min);
        }

        saveState(appState);

        if (target === 'focus') {
            els.focusDuration.textContent = appState.focusDuration;
        } else {
            els.breakDuration.textContent = appState.breakDuration;
        }

        if ((target === 'focus' && currentMode === 'focus') || (target === 'break' && currentMode === 'break')) {
            totalTime = appState[key] * 60;
            timeRemaining = totalTime;
            updateDisplay();
        }
    }

    function bindEvents() {
        els.startBtn.addEventListener('click', startTimer);
        els.resetBtn.addEventListener('click', resetTimer);
        els.finishBtn.addEventListener('click', finishTimer);

        els.focusTab.addEventListener('click', () => {
            if (!isRunning && !isPaused) setMode('focus');
        });
        els.breakTab.addEventListener('click', () => {
            if (!isRunning && !isPaused) setMode('break');
        });

        $$('.dur-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                changeDuration(btn.dataset.target, btn.dataset.action);
            });
        });

        els.clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Tüm oturum geçmişi silinecek. Emin misiniz?')) {
                appState.sessions = [];
                saveState(appState);
                updateStats();
                updateHistory();
            }
        });

        els.notifBtn.addEventListener('click', () => {
            els.notificationOverlay.classList.remove('active');
        });

        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.closest('input, textarea, button')) {
                e.preventDefault();
                startTimer();
            }
            if (e.code === 'Escape') {
                if (els.notificationOverlay.classList.contains('active')) {
                    els.notifBtn.click();
                }
            }
            if (e.code === 'KeyR' && !e.target.closest('input, textarea, button')) {
                resetTimer();
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && isRunning) {
            }
        });
    }

    function init() {
        els.focusDuration.textContent = appState.focusDuration;
        els.breakDuration.textContent = appState.breakDuration;
        totalTime = appState.focusDuration * 60;
        timeRemaining = totalTime;

        updateDisplay();
        updateStats();
        updateHistory();
        bindEvents();

        document.addEventListener('click', () => AudioEngine.init(), { once: true });

        console.log('🍅 Pomodoro Timer initialized!');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
