/**
 * Audit Engine V1.0
 * Handles the multi-step quiz, AI integration, and lead capture.
 */

window.AuditEngine = {
    currentStep: 0,
    answers: {},
    isSubmitting: false,

    nextStep: function() {
        const steps = document.querySelectorAll('.audit-step');
        steps[this.currentStep].classList.remove('active');
        this.currentStep++;
        if (steps[this.currentStep]) {
            steps[this.currentStep].classList.add('active');
        }
    },

    select: function(step, value) {
        this.answers[`q${step}`] = value;
        
        // Visual feedback
        const currentStepEl = document.getElementById(`audit-step-${step}`);
        const buttons = currentStepEl.querySelectorAll('.audit-opt');
        buttons.forEach(btn => {
            if (btn.textContent === value) {
                btn.style.borderColor = 'var(--accent2)';
                btn.style.background = 'rgba(0, 195, 255, 0.1)';
            } else {
                btn.style.borderColor = '';
                btn.style.background = '';
            }
        });


        
        if (this._stepTimeout) clearTimeout(this._stepTimeout);
        this._stepTimeout = setTimeout(() => this.nextStep(), 400);
    },

    submitGoal: function() {
        const input = document.getElementById('audit-goal-input');
        const value = input ? input.value.trim() : '';
        if (!value) {
            input.style.borderColor = '#ff4444';
            input.placeholder = "Please enter a core goal...";
            return;
        }
        this.answers['q5_goal'] = value;
        this.nextStep();
    },

    submit: async function() {
        const emailInput = document.getElementById('audit-email');
        const email = emailInput.value.trim();
        const errorEl = document.getElementById('audit-error-msg');
        const statusOverlay = document.querySelector('.decryption-status');
        const progressBar = document.getElementById('audit-progress-bar');

        // Strict Email Validation Regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email || !emailRegex.test(email)) {
            this.showError('PROTOCOL ERROR: Invalid Email Signal');
            return;
        }

        if (this.isSubmitting) return;
        this.isSubmitting = true;

        const btn = document.getElementById('audit-submit-btn');
        const originalText = btn.textContent;
        btn.textContent = 'CONNECTING...';
        btn.disabled = true;

        try {
            // Clear any existing errors
            if (errorEl) errorEl.style.opacity = '0';

            // 1. Call the backend to generate advice
            const response = await fetch('/api/audit/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    answers: this.answers
                })
            });

            const result = await response.json();

            if (result.success) {
                // Start Decryption Sequence
                if (statusOverlay && progressBar) {
                    statusOverlay.classList.add('active');
                    
                    // Animate Progress Bar
                    await new Promise(resolve => {
                        if (window.gsap) {
                            gsap.to(progressBar, {
                                width: '100%',
                                duration: 1.8,
                                ease: "power2.inOut",
                                onComplete: resolve
                            });
                        } else {
                            // Fallback if GSAP fails
                            progressBar.style.transition = 'width 1.8s ease-in-out';
                            progressBar.style.width = '100%';
                            setTimeout(resolve, 1800);
                        }
                    });
                }

                // Smooth transition to results
                const captureStep = document.getElementById('audit-capture');
                const resultStep = document.getElementById('audit-result');
                const adviceEl = document.getElementById('audit-advice-content');
                
                if (window.gsap) {
                    const tl = gsap.timeline();
                    
                    tl.to(captureStep, { 
                        opacity: 0, 
                        y: -40, 
                        duration: 0.8, 
                        ease: "power4.in",
                        onComplete: () => {
                            captureStep.classList.remove('active');
                            resultStep.classList.add('active');
                            adviceEl.innerHTML = this.formatAdvice(result.advice);
                        }
                    });

                    tl.fromTo(resultStep, 
                        { opacity: 0, y: 40, scale: 0.95 },
                        { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: "power4.out" }
                    );

                    // Tactical Reveal of Advice
                    const pTags = adviceEl.querySelectorAll('p');
                    tl.from(pTags, {
                        opacity: 0,
                        x: -15,
                        stagger: 0.6,
                        duration: 1.2,
                        ease: "power2.out"
                    }, "-=0.6");
                } else {
                    captureStep.classList.remove('active');
                    resultStep.classList.add('active');
                    adviceEl.innerHTML = this.formatAdvice(result.advice);
                }
            } else {
                throw new Error(result.message || 'Calibration Failed');
            }
        } catch (e) {
            console.error(e);
            this.showError('SYSTEM ERROR: ' + e.message);
            if (statusOverlay) statusOverlay.classList.remove('active');
        } finally {
            this.isSubmitting = false;
            btn.textContent = originalText;
            btn.disabled = false;
            if (progressBar) progressBar.style.width = '0%';
        }
    },

    showError: function(msg) {
        let errorEl = document.getElementById('audit-error-msg');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = 'audit-error-msg';
            errorEl.style.color = '#ff4444';
            errorEl.style.fontSize = '0.75rem';
            errorEl.style.marginTop = '10px';
            errorEl.style.fontWeight = '700';
            errorEl.style.letterSpacing = '1px';
            errorEl.style.transition = 'all 0.3s ease';
            document.querySelector('.audit-form').appendChild(errorEl);
        }
        errorEl.textContent = msg;
        errorEl.style.opacity = '1';
        
        if (window.gsap) {
            gsap.fromTo(errorEl, { x: -10 }, { x: 0, duration: 0.1, repeat: 3, yoyo: true });
        }
    },

    formatAdvice: function(text) {
        if (!text) return '';
        const paragraphs = text.split(/\n\s*\n/);
        
        let formattedHtml = paragraphs.map(p => {
            let cleaned = p.trim().replace(/`/g, '');
            cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            cleaned = cleaned.replace(/\n/g, '<br>');
            return `<p>${cleaned}</p>`;
        }).join('');

        // Add a tactical header badge
        const bonusBadge = `
            <div style="margin-bottom: 20px; display: inline-flex; align-items: center; gap: 8px; background: rgba(0, 195, 255, 0.1); border: 1px solid rgba(0, 195, 255, 0.3); padding: 5px 12px; border-radius: 4px; font-family: 'Space Grotesk', sans-serif; font-size: 0.75rem; color: #00c3ff; letter-spacing: 1px; font-weight: 700; text-transform: uppercase;">
                <span style="width: 6px; height: 6px; background: #00c3ff; border-radius: 50%; box-shadow: 0 0 5px #00c3ff;"></span>
                Start Transmission
            </div>
        `;
        
        return bonusBadge + formattedHtml;
    },

    reset: function() {
        this.currentStep = 0;
        this.answers = {};
        const steps = document.querySelectorAll('.audit-step');
        steps.forEach(s => {
            s.classList.remove('active');
            s.style.opacity = '';
            s.style.transform = '';
        });
        steps[0].classList.add('active');
        
        const adviceEl = document.getElementById('audit-advice-content');
        if (adviceEl) adviceEl.innerHTML = '';
        
        const emailInput = document.getElementById('audit-email');
        if (emailInput) emailInput.value = '';
        const errorEl = document.getElementById('audit-error-msg');
        if (errorEl) errorEl.style.opacity = '0';
        
        const statusOverlay = document.querySelector('.decryption-status');
        if (statusOverlay) statusOverlay.classList.remove('active');
        
        const progressBar = document.getElementById('audit-progress-bar');
        if (progressBar) progressBar.style.width = '0%';
        
        const goalInput = document.getElementById('audit-goal-input');
        if (goalInput) { 
            goalInput.value = ''; 
            goalInput.style.borderColor = ''; 
        }
        
        const buttons = document.querySelectorAll('.audit-opt');
        buttons.forEach(btn => {
            btn.style.borderColor = '';
            btn.style.background = '';
        });
        
        // Smooth scroll back to top of audit card
        const card = document.querySelector('.audit-card');
        if (card) {
            const yOffset = -100; // Account for fixed header
            const y = card.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({top: y, behavior: 'smooth'});
        }
    }
};

// Initial setup for Enter key and input clearing
document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('audit-email');
    if (emailInput) {
        emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.AuditEngine.submit();
            }
        });
        emailInput.addEventListener('input', () => {
            const errorEl = document.getElementById('audit-error-msg');
            if (errorEl) errorEl.style.opacity = '0';
        });
    }

    // Goal Input Enter Key
    const goalInput = document.getElementById('audit-goal-input');
    if (goalInput) {
        goalInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { // Allow shift+enter for new lines
                e.preventDefault();
                window.AuditEngine.submitGoal();
            }
        });
    }
});
