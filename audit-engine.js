/**
 * Audit Engine V1.0
 * Handles the multi-step quiz, AI integration, and lead capture.
 */

window.AuditEngine = {
    currentStep: 0,
    answers: {},
    isSubmitting: false,

    isNavigating: false,

    nextStep: function() {
        if (this.isNavigating) return;
        this.isNavigating = true;

        const steps = document.querySelectorAll('.audit-step');
        steps[this.currentStep].classList.remove('active');
        this.currentStep++;
        if (steps[this.currentStep]) {
            steps[this.currentStep].classList.add('active');
        }

        setTimeout(() => this.isNavigating = false, 600);
    },

    prevStep: function() {
        if (this.isNavigating || this.currentStep <= 0) return;
        this.isNavigating = true;

        const steps = document.querySelectorAll('.audit-step');
        steps[this.currentStep].classList.remove('active');
        this.currentStep--;
        if (steps[this.currentStep]) {
            steps[this.currentStep].classList.add('active');
        }

        setTimeout(() => this.isNavigating = false, 600);
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

            const goal = this.answers.q1 || 'Progress';
            const hurdle = this.answers.q2 || 'The Unknown';
            const platform = this.answers.q3 || 'The Web';
            const vibe = this.answers.q4 || 'Visionary';
            const specificGoal = this.answers.q5_goal || 'Excellence';

            // 1. Try OTP Backend Securely
            let advice = "";
            let success = false;

            try {
                const response = await fetch('/api/audit/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, answers: this.answers })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.advice) {
                        advice = data.advice;
                        success = true;
                    }
                }
            } catch (e) { 
                console.warn("Backend link severed, pivoting to emergency protocol..."); 
            }

            // 2. Client-Side Fallback (Ultimate Fail-Safe)
            // If the server didn't respond or returned an error, we MUST provide value.
            if (!success) {
                console.log("⚠️ Activating Local Emergency Protocol.");
                advice = `**THE DIAGNOSIS.**
The Neural Link is currently jammed by high-traffic interference. However, your intent signal was strong enough to trigger this local cache.

**THE PLAN.**
1. **The Immediate Pivot**: Whatever you were hesitating on, execute it now. Do not wait for a perfect signal.
2. **The Visuals**: Strip away the noise. Go dark mode. High contrast.
3. **The Protocol**: Commit to the "Drafting Phase" for 60 minutes uninterrupted.

**THE FORTUNE.**
"True signal is found in the silence of action."`;
                success = true; // Force success
            }

            // 4. Success Animation
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
                
                // Hide back button on result
                const backBtn = captureStep.querySelector('.audit-back-btn');
                if(backBtn) backBtn.style.display = 'none';

                tl.to(captureStep, { 
                    opacity: 0, 
                    y: -40, 
                    duration: 0.8, 
                    ease: "power4.in",
                    onComplete: () => {
                        captureStep.classList.remove('active');
                        resultStep.classList.add('active');
                        // Trigger Typewriter instead of instant HTML
                        this.typewrite(adviceEl, this.formatAdvice(advice));
                    }
                });

                tl.fromTo(resultStep, 
                    { opacity: 0, y: 40, scale: 0.95 },
                    { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: "power4.out" }
                );

                // No staggers needed for typewriter, it handles its own timing
            } else {
                captureStep.classList.remove('active');
                resultStep.classList.add('active');
                this.typewrite(adviceEl, this.formatAdvice(advice));
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

    // TYPEWRITER ENGINE
    typewrite: async function(targetEl, htmlContent) {
        targetEl.innerHTML = ''; // Clear
        targetEl.classList.add('audit-terminal');
        
        // Create a temporary container to parse the HTML
        const parser = document.createElement('div');
        parser.innerHTML = htmlContent;

        // Cursor Element
        const cursor = document.createElement('span');
        cursor.className = 'typewriter-cursor';
        targetEl.appendChild(cursor);

        const typeNode = async (node, parent) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                for (let i = 0; i < text.length; i++) {
                    const charNode = document.createTextNode(text[i]);
                    // If we are at root, insert before cursor. If nested, just append (parent is already before cursor)
                    if (parent === targetEl) {
                        parent.insertBefore(charNode, cursor);
                    } else {
                        parent.appendChild(charNode);
                    }
                    
                    // Randomize typing speed slightly for realism
                    // Faster typing (5-15ms) to prevent boredom
                    await new Promise(r => setTimeout(r, Math.random() * 10 + 5));
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = document.createElement(node.tagName);
                // Copy attributes
                Array.from(node.attributes).forEach(attr => {
                    el.setAttribute(attr.name, attr.value);
                });
                
                // Insert element
                if (parent === targetEl) {
                    parent.insertBefore(el, cursor);
                } else {
                    parent.appendChild(el);
                }
                
                // Recurse for children
                for (const child of Array.from(node.childNodes)) {
                    await typeNode(child, el);
                }
            }
        };

        // Start Typing Process
        for (const child of Array.from(parser.childNodes)) {
            await typeNode(child, targetEl);
        }
    },

    formatAdvice: function(text) {
        if (!text) return '';
        
        // Local Escape
        const escape = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        const lines = text.split('\n');
        let html = '';

        lines.forEach(line => {
            let cleanLine = line.trim();
            if (!cleanLine) return; // Skip empty lines

            // Remove markdown
            cleanLine = cleanLine.replace(/`/g, '');
            
            // Bold (**text**)
            let safeLine = escape(cleanLine);
            safeLine = safeLine.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--accent2);">$1</strong>');

            const upper = safeLine.toUpperCase();

            // Headers
            if (upper.includes('THE DIAGNOSIS') || upper.includes('THE PLAN') || upper.includes('THE FORTUNE') || upper.includes('THE TRUTH')) {
                html += `<div class="advice-header">${safeLine}</div>`;
            } 
            // List Items
            else if (cleanLine.match(/^(\d+\.|-|\*)/)) {
                html += `<div class="advice-list-item">${safeLine}</div>`;
            } 
            // Standard Text
            else {
                html += `<div class="advice-row">${safeLine}</div>`;
            }
        });

        // Tactical Badge
        const bonusBadge = `
            <div class="audit-badge-transmission">
                <span style="width: 6px; height: 6px; background: #00c3ff; border-radius: 50%; box-shadow: 0 0 5px #00c3ff;"></span>
                Start Transmission
            </div>
        `;
        
        return bonusBadge + html;
    },

    reset: function() {
        this.currentStep = 0;
        this.answers = {};
        this.isSubmitting = false;
        this.isNavigating = false;
        const steps = document.querySelectorAll('.audit-step');
        steps.forEach(s => {
            s.classList.remove('active');
            s.style.opacity = '';
            s.style.transform = '';
        });
        steps[0].classList.add('active');
        
        const adviceEl = document.getElementById('audit-advice-content');
        if (adviceEl) {
            adviceEl.innerHTML = '';
            adviceEl.classList.remove('audit-terminal');
        }
        
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

        // Ensure back buttons are effectively reset
        const backBtns = document.querySelectorAll('.audit-back-btn');
        backBtns.forEach(b => {
             b.style.display = '';
             b.style.opacity = '1';
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
        goalInput.addEventListener('input', () => {
             goalInput.style.borderColor = '';
        });
        goalInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { // Allow shift+enter for new lines
                e.preventDefault();
                window.AuditEngine.submitGoal();
            }
        });
    }
});
