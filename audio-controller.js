// ==========================================
// UNIVERSAL AUDIO CONTROLLER (audio-controller.js)
// ==========================================

(function () {
    // 1. Initialize Audio Objects
    const SOUNDS = {
        hover: new Audio('audio/hover.wav'),
        click: new Audio('audio/click.mp3'),
        castleLoad: new Audio('audio/castle-load in.mp3'),
        castleZoom: new Audio('audio/castle-zoom.mp3#t=2')
    };

    // 2. Set Volumes & Properties
    SOUNDS.castleZoom.currentTime = 2;
    SOUNDS.hover.volume = 0.5;
    SOUNDS.click.volume = 0.8;
    SOUNDS.castleZoom.volume = 0.8;
    SOUNDS.castleLoad.volume = 0.8;
    SOUNDS.castleLoad.loop = true;

    // --- Save Audio Progress Across Pages ---
    function saveAudioProgress() {
        if (SOUNDS.castleLoad && !isNaN(SOUNDS.castleLoad.currentTime)) {
            sessionStorage.setItem('castleLoad_time', SOUNDS.castleLoad.currentTime);
        }
    }

    // Save timestamp continuously & on page unload
    SOUNDS.castleLoad.addEventListener('timeupdate', saveAudioProgress);
    window.addEventListener('beforeunload', saveAudioProgress);
    window.addEventListener('pagehide', saveAudioProgress);

    // Helper to play one-shot sound effects
    function playSound(audio) {
        if (!audio) return;
        audio.currentTime = 0; // Rewind
        audio.play().catch(err => console.warn("Audio play blocked or file missing:", err));
    }

    // Function to handle looping background audio with position persistence
    function playCastleLoad() {
        if (!SOUNDS.castleLoad) return;

        // Restore saved position if coming from another page
        const savedTime = sessionStorage.getItem('castleLoad_time');
        if (savedTime !== null) {
            const timeToSet = parseFloat(savedTime);
            
            // Wait for audio metadata to be ready before setting currentTime
            if (SOUNDS.castleLoad.readyState >= 1) {
                SOUNDS.castleLoad.currentTime = timeToSet;
            } else {
                SOUNDS.castleLoad.addEventListener('loadedmetadata', function onMeta() {
                    SOUNDS.castleLoad.currentTime = timeToSet;
                    SOUNDS.castleLoad.removeEventListener('loadedmetadata', onMeta);
                });
            }
        }

        // Only play if tab is active and audio is paused
        if (SOUNDS.castleLoad.paused && !document.hidden) {
            SOUNDS.castleLoad.play().catch(err => {
                console.warn("Autoplay blocked by browser. Awaiting user interaction...", err);
            });
        }
    }

    // 3. Page Detection Logic
    const targetPages = ['index.html', 'journey.html', 'about.html' , 'members.html' , 'support.html'];
    const currentPath = window.location.pathname.split('/').pop().toLowerCase();
    const isTargetPage = targetPages.includes(currentPath) || currentPath === '';

    // 4. Auto-Play Logic for Target Pages
    if (isTargetPage) {
        const attemptPlay = () => {
            if (!document.hidden) {
                playCastleLoad();
            }

            // Remove fallback listeners if playing succeeds
            if (!SOUNDS.castleLoad.paused) {
                document.removeEventListener('click', attemptPlay);
                document.removeEventListener('keydown', attemptPlay);
                document.removeEventListener('touchstart', attemptPlay);
            }
        };

        if (document.readyState === 'interactive' || document.readyState === 'complete') {
            attemptPlay();
        } else {
            document.addEventListener('DOMContentLoaded', attemptPlay);
        }

        // Fallback interaction listeners for browser autoplay policies
        document.addEventListener('click', attemptPlay);
        document.addEventListener('keydown', attemptPlay);
        document.addEventListener('touchstart', attemptPlay);
    }

    // 5. Tabbed-Out Handling (Pause when hidden, resume when visible)
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            saveAudioProgress();
            SOUNDS.castleLoad.pause();
        } else {
            if (isTargetPage) {
                playCastleLoad();
            }
        }
    });

    // 6. Global Event Listeners for UI interaction sounds
    document.addEventListener('mouseover', function (e) {
        const target = e.target.closest('button, a, .interactive');
        if (target) playSound(SOUNDS.hover);
    });

    document.addEventListener('click', function (e) {
        const target = e.target.closest('button, a, .interactive');
        if (target) playSound(SOUNDS.click);
    });

    // 7. Globally Exposed Triggers
    window.playHoverSound = function () { playSound(SOUNDS.hover); };
    window.playClickSound = function () { playSound(SOUNDS.click); };
    window.playCastleZoom = function () { playSound(SOUNDS.castleZoom); };
    window.playCastleLoad = playCastleLoad;
})();