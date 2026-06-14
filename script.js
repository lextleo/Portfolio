// ==========================================
// TAVIONYX OS - PORTFOLIO INTERACTION ENGINE
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    // State Variables
    let activePage = 0;
    const totalPages = 4;
    let touchStartX = 0;
    let touchEndX = 0;
    let audioEnabled = false;
    let audioCtx = null;

    // DOM Elements
    const slider = document.getElementById("desktop-slider");
    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");
    const clockElement = document.getElementById("taskbar-clock");
    const startBtn = document.getElementById("start-btn");
    const startMenu = document.getElementById("start-menu");
    const taskButtons = document.querySelectorAll(".task-btn");
    const startItems = document.querySelectorAll(".start-item");
    const desktopIcons = document.querySelectorAll(".desktop-icon");
    
    // Audio elements
    const soundToggleBtn = document.getElementById("sound-toggle-btn");
    const soundInitOverlay = document.getElementById("sound-init-overlay");
    const bootWithSoundBtn = document.getElementById("boot-with-sound");
    const bootSilentBtn = document.getElementById("boot-silent");
    const closeOverlayBtn = document.querySelector(".close-overlay-btn");

    // Video/Modal elements
    const videoModal = document.getElementById("video-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalPlayer = document.getElementById("modal-player");
    const modalDescription = document.getElementById("modal-description");
    const binIcon = document.getElementById("icon-bin");
    const binModal = document.getElementById("bin-modal");

    // Longform Video Player elements
    const longformVideo = document.getElementById("longform-video");
    const mediaPlayBtn = document.getElementById("media-play-btn");
    const mediaStopBtn = document.getElementById("media-stop-btn");
    const mediaTimeDisplay = document.getElementById("media-time-display");
    const playlistItems = document.querySelectorAll("#longform-playlist .playlist-item");
    const longformDesc = document.getElementById("longform-desc");

    // Properties Tab elements
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    // Close buttons on windows
    const closeWindowBtns = document.querySelectorAll(".close-btn");

    // ==========================================
    // AUDIO SYNTH ENGINE (Web Audio API)
    // ==========================================
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playBootSound() {
        if (!audioEnabled || !audioCtx) return;
        
        const now = audioCtx.currentTime;
        
        // Classic retro warm pad chime
        // Waveform chords: C Major -> C Maj7 -> C6
        const frequencies = [
            [130.81, 196.00, 261.63, 329.63], // C3, G3, C4, E4
            [130.81, 196.00, 261.63, 392.00], // C3, G3, C4, B4
            [130.81, 220.00, 293.66, 440.00]  // C3, A3, D4, A4
        ];
        
        frequencies.forEach((chord, chordIdx) => {
            const chordTime = now + (chordIdx * 0.4);
            chord.forEach((freq) => {
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                
                // Warm retro square/triangle mix
                osc.type = freq < 200 ? 'sawtooth' : 'triangle';
                osc.frequency.setValueAtTime(freq, chordTime);
                
                // Low-pass filter to make it warmer and less harsh
                const filter = audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(800, chordTime);
                
                // Volume Envelope
                gainNode.gain.setValueAtTime(0, chordTime);
                gainNode.gain.linearRampToValueAtTime(0.08, chordTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, chordTime + 1.8);
                
                osc.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                osc.start(chordTime);
                osc.stop(chordTime + 2.0);
            });
        });
    }

    function playBeep(freq = 440, duration = 0.08, type = 'sine') {
        if (!audioEnabled || !audioCtx) return;
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    // Play click sound
    function playClick() {
        playBeep(600, 0.04, 'triangle');
    }

    // Play navigation sound
    function playNavSound() {
        if (!audioEnabled || !audioCtx) return;
        const now = audioCtx.currentTime;
        
        // Mini ascending arpeggio
        playBeep(400, 0.05, 'sine');
        setTimeout(() => playBeep(600, 0.05, 'sine'), 40);
    }

    // Play close sound
    function playCloseSound() {
        if (!audioEnabled || !audioCtx) return;
        playBeep(400, 0.05, 'sine');
        setTimeout(() => playBeep(250, 0.08, 'sine'), 50);
    }

    // ==========================================
    // NAVIGATION & TRANSITION ENGINE
    // ==========================================
    function updateSlider() {
        // Move track
        slider.style.transform = `translateX(-${activePage * 100 / totalPages}%)`;
        
        // Toggle Prev / Next arrows
        if (activePage === 0) {
            btnPrev.classList.add("disabled");
        } else {
            btnPrev.classList.remove("disabled");
        }
        
        if (activePage === totalPages - 1) {
            btnNext.classList.add("disabled");
        } else {
            btnNext.classList.remove("disabled");
        }
        
        // Sync Taskbar program active states
        taskButtons.forEach(btn => {
            const target = parseInt(btn.getAttribute("data-target"));
            if (target === activePage) {
                btn.classList.add("active-task");
            } else {
                btn.classList.remove("active-task");
            }
        });
        
        // Pause longform video if navigating away from longform page (page 2)
        if (activePage !== 2 && longformVideo) {
            longformVideo.pause();
            mediaPlayBtn.innerHTML = "▶ Play";
        }
    }

    function navigateToPage(pageIndex) {
        if (pageIndex < 0 || pageIndex >= totalPages) return;
        if (pageIndex !== activePage) {
            activePage = pageIndex;
            playNavSound();
            updateSlider();
        }
    }

    // Event listeners for arrows
    btnPrev.addEventListener("click", () => {
        navigateToPage(activePage - 1);
    });

    btnNext.addEventListener("click", () => {
        navigateToPage(activePage + 1);
    });

    // Keyboard navigation (arrows)
    document.addEventListener("keydown", (e) => {
        // Only navigate if user is not typing in the contact form
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
            return;
        }
        if (e.key === "ArrowLeft") {
            navigateToPage(activePage - 1);
        } else if (e.key === "ArrowRight") {
            navigateToPage(activePage + 1);
        }
    });

    // Touch Swipe Support
    document.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener("touchend", (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const threshold = 80; // Min swipe distance in pixels
        const swipeDistance = touchEndX - touchStartX;
        
        // Swipe Left (Go Next)
        if (swipeDistance < -threshold) {
            navigateToPage(activePage + 1);
        }
        // Swipe Right (Go Prev)
        else if (swipeDistance > threshold) {
            navigateToPage(activePage - 1);
        }
    }

    // Taskbar shortcuts
    taskButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = parseInt(btn.getAttribute("data-target"));
            navigateToPage(target);
            playClick();
        });
    });

    // Start menu item shortcuts
    startItems.forEach(item => {
        item.addEventListener("click", () => {
            const target = item.getAttribute("data-target");
            if (target !== null) {
                navigateToPage(parseInt(target));
            }
            startMenu.classList.add("hidden");
            startBtn.classList.remove("active");
            playClick();
        });
    });

    // Desktop icons double-click / tap
    desktopIcons.forEach(icon => {
        // Desktop navigation icons
        const target = icon.getAttribute("data-target");
        if (target !== null) {
            icon.addEventListener("dblclick", () => {
                navigateToPage(parseInt(target));
            });
            // Support single tap for mobile screens
            icon.addEventListener("click", (e) => {
                // Clear selection on other icons
                desktopIcons.forEach(i => i.classList.remove("selected"));
                icon.classList.add("selected");
                
                // On mobile/touch, navigate immediately on click
                if (window.innerWidth <= 768) {
                    navigateToPage(parseInt(target));
                }
                playClick();
            });
        }
    });

    // Close window action goes back to home desktop
    closeWindowBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            navigateToPage(0);
            playCloseSound();
        });
    });

    // Clean selection when clicking empty area on home desktop
    document.getElementById("screen-home").addEventListener("click", (e) => {
        if (e.target.id === "screen-home") {
            desktopIcons.forEach(icon => icon.classList.remove("selected"));
        }
    });

    // ==========================================
    // INTERACTIVE SYSTEM UTILITIES
    // ==========================================

    // Start Menu Toggle
    startBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        startMenu.classList.toggle("hidden");
        startBtn.classList.toggle("active");
        playClick();
    });

    // Close start menu when clicking outside
    document.addEventListener("click", (e) => {
        if (!startBtn.contains(e.target) && !startMenu.contains(e.target)) {
            startMenu.classList.add("hidden");
            startBtn.classList.remove("active");
        }
    });

    // Shutdown Action
    document.getElementById("start-shutdown").addEventListener("click", () => {
        playCloseSound();
        alert("Preparing to reboot system...\nClick OK to restart Tavionyx OS.");
        window.location.reload();
    });

    // Live Taskbar Clock
    function updateClock() {
        const date = new Date();
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12; // hour '0' should be '12'
        const timeStr = `${hours}:${minutes} ${ampm}`;
        clockElement.textContent = timeStr;
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ==========================================
    // SOUND INITIALIZATION DIALOGS
    // ==========================================
    bootWithSoundBtn.addEventListener("click", () => {
        audioEnabled = true;
        soundInitOverlay.classList.add("hidden");
        initAudio();
        playBootSound();
        soundToggleBtn.innerHTML = "🔊";
    });

    bootSilentBtn.addEventListener("click", () => {
        audioEnabled = false;
        soundInitOverlay.classList.add("hidden");
        soundToggleBtn.innerHTML = "🔇";
    });

    closeOverlayBtn.addEventListener("click", () => {
        soundInitOverlay.classList.add("hidden");
    });

    // Sound toggle button on Taskbar
    soundToggleBtn.addEventListener("click", () => {
        audioEnabled = !audioEnabled;
        if (audioEnabled) {
            soundToggleBtn.innerHTML = "🔊";
            initAudio();
            playBeep(500, 0.05, 'sine');
        } else {
            soundToggleBtn.innerHTML = "🔇";
        }
    });

    // ==========================================
    // SHORT FORM PORTFOLIO: VIDEO MODAL
    // ==========================================
    window.openVideoModal = function(title, src, description) {
        modalTitle.textContent = `▶ Media Player - ${title}`;
        modalPlayer.src = src;
        modalDescription.textContent = description;
        videoModal.classList.remove("hidden");
        
        initAudio();
        playClick();
        
        // Autoplay the video in modal
        modalPlayer.play().catch(err => {
            console.log("Autoplay blocked by browser, waiting for user click.");
        });
    };

    window.closeVideoModal = function() {
        modalPlayer.pause();
        modalPlayer.src = "";
        videoModal.classList.add("hidden");
        playCloseSound();
    };

    // Close modal when clicking overlay
    videoModal.addEventListener("click", (e) => {
        if (e.target === videoModal) {
            closeVideoModal();
        }
    });

    // Recycle Bin modal toggle
    binIcon.addEventListener("click", (e) => {
        e.stopPropagation();
        desktopIcons.forEach(i => i.classList.remove("selected"));
        binIcon.classList.add("selected");
    });
    
    binIcon.addEventListener("dblclick", () => {
        binModal.classList.remove("hidden");
        playClick();
    });

    // Support touch for bin icon on mobile
    binIcon.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
            binModal.classList.remove("hidden");
            playClick();
        }
    });

    window.closeBinModal = function() {
        binModal.classList.add("hidden");
        playCloseSound();
    };

    binModal.addEventListener("click", (e) => {
        if (e.target === binModal) {
            closeBinModal();
        }
    });

    // ==========================================
    // LONG FORM SHOWCASE: MEDIA PLAYER LOGIC
    // ==========================================
    playlistItems.forEach(item => {
        item.addEventListener("click", () => {
            // Remove active track class from all
            playlistItems.forEach(p => p.classList.remove("active-track"));
            
            // Add active class
            item.classList.add("active-track");
            
            // Load source details
            const src = item.getAttribute("data-src");
            const desc = item.getAttribute("data-desc");
            
            longformVideo.src = src;
            longformDesc.innerHTML = `<strong>Description:</strong> ${desc}`;
            
            playClick();
            
            // Play video
            longformVideo.play().catch(err => {
                console.log("Play failed, waiting for user.");
            });
            mediaPlayBtn.innerHTML = "⏸ Pause";
        });
    });

    // Play/Pause button
    mediaPlayBtn.addEventListener("click", () => {
        initAudio();
        playClick();
        if (longformVideo.paused) {
            longformVideo.play();
            mediaPlayBtn.innerHTML = "⏸ Pause";
        } else {
            longformVideo.pause();
            mediaPlayBtn.innerHTML = "▶ Play";
        }
    });

    // Stop Button
    mediaStopBtn.addEventListener("click", () => {
        playClick();
        longformVideo.pause();
        longformVideo.currentTime = 0;
        mediaPlayBtn.innerHTML = "▶ Play";
    });

    // Track time updates
    if (longformVideo) {
        longformVideo.addEventListener("timeupdate", () => {
            const cur = formatTime(longformVideo.currentTime);
            const dur = formatTime(longformVideo.duration || 0);
            mediaTimeDisplay.textContent = `${cur} / ${dur}`;
            
            // Update custom progress bar slider
            const pct = (longformVideo.currentTime / (longformVideo.duration || 1)) * 100;
            document.querySelector(".slider-progress").style.width = `${pct}%`;
        });
    }

    function formatTime(secs) {
        const m = Math.floor(secs / 60).toString().padStart(2, "0");
        const s = Math.floor(secs % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    }

    // ==========================================
    // PROPERTIES DIALOG TABS ENGINE
    // ==========================================
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            // Remove active classes
            tabButtons.forEach(b => b.classList.remove("active-tab"));
            tabContents.forEach(c => c.classList.add("hidden"));
            
            // Add active class to clicked button
            btn.classList.add("active-tab");
            
            // Show corresponding content
            const targetTab = btn.getAttribute("data-tab");
            document.getElementById(targetTab).classList.remove("hidden");
            
            playClick();
        });
    });

    // Initialize layout
    updateSlider();
});
