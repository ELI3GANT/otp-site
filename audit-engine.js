/**
 * Audit Engine V1.0
 * Handles the multi-step quiz, AI integration, and lead capture.
 */

window.AuditEngine = {
    currentStep: 0,
    answers: {},
    isSubmitting: false,

    isNavigating: false,
    typingIteration: 0,

    nextStep: function() {
        if (this.isNavigating) return;
        this.isNavigating = true;

        const steps = document.querySelectorAll('.audit-step');
        if (!steps[this.currentStep]) return;
        steps[this.currentStep].classList.remove('active');
        this.currentStep++;
        if (steps[this.currentStep]) {
            steps[this.currentStep].classList.add('active');
        }
        
        // Mobile Back Button Logic
        const backBtns = document.querySelectorAll('.audit-back-btn');
        if (this.currentStep > 0) {
            backBtns.forEach(btn => btn.style.display = 'flex');
        } else {
            backBtns.forEach(btn => btn.style.display = 'none');
        }

        setTimeout(() => this.isNavigating = false, 600);
    },

    prevStep: function() {
        if (this.isNavigating || this.isSubmitting || this.currentStep <= 0) return;
        this.isNavigating = true;

        const steps = document.querySelectorAll('.audit-step');
        steps[this.currentStep].classList.remove('active');
        this.currentStep--;
        if (steps[this.currentStep]) {
            steps[this.currentStep].classList.add('active');
        }

        // Hide back buttons if we returned to first step
        if (this.currentStep === 0) {
            const backBtns = document.querySelectorAll('.audit-back-btn');
            backBtns.forEach(btn => btn.style.display = 'none');
        }

        setTimeout(() => this.isNavigating = false, 600);
    },

    select: function(step, value) {
        this.answers[`q${step}`] = value;
        
        // Visual feedback
        const currentStepEl = document.getElementById(`audit-step-${step}`);
        if (!currentStepEl) return;
        const buttons = currentStepEl.querySelectorAll('.audit-opt');
        buttons.forEach(btn => {
            if (btn.textContent === value) {
                btn.classList.add('selected');
                btn.style.borderColor = 'var(--accent2)';
                btn.style.background = 'rgba(var(--accent2-rgb), 0.1)';
            } else {
                btn.classList.remove('selected');
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
        if (this.isSubmitting) return;
        this.isSubmitting = true;

        const emailInput = document.getElementById('audit-email');
        const email = emailInput.value.trim();
        const errorEl = document.getElementById('audit-error-msg');
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
             if(errorEl) {
                 errorEl.textContent = "Please enter a valid neural address (email).";
                 errorEl.classList.add('active');
             }
             emailInput.focus();
             this.isSubmitting = false;
             return;
        }

        const statusOverlay = document.querySelector('.decryption-status');
        const progressBar = document.getElementById('audit-progress-bar');

        const btn = document.getElementById('audit-submit-btn');
        const card = document.getElementById('audit-container');
        const originalText = btn.textContent;
        btn.textContent = 'ANALYZING...';
        btn.disabled = true;
        if (card) card.classList.add('processing');
        
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
                // SECURE BACKEND BRIDGE: Centralized helper
                const API_BASE = window.OTP.getApiBase();
                
                const response = await fetch(`${API_BASE}/api/audit/submit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, answers: this.answers })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.advice) {
                        advice = data.advice;
                        success = true;
                        console.log("✅ Oracle response received.");
                    } else {
                        console.warn("Oracle returned success:false", data);
                    }
                } else {
                    console.warn(`Oracle connection failed: Status ${response.status}`);
                }
            } catch (e) { 
                console.warn("Backend link severed, pivoting to emergency protocol..."); 
            }

            // 2. Client-Side Fallback (Ultimate Fail-Safe)
            if (!success) {
                console.log("⚠️ Activating Local Emergency Protocol.");
                
                const obj = this.answers.q1 || 'Growth';
                const hurdle = this.answers.q2 || 'The Unknown';
                const platform = this.answers.q3 || 'The Network';
                const vibe = this.answers.q4 || 'Cinematic';
                const goalText = this.answers.q5_goal || 'Excellence';
                const templates = [
                    // VARIANT 1: THE DIRECT BREAKDOWN
                    `**YOUR SITUATION.**
Your focus on **${obj}** is being slowed down by **${hurdle}**. To hit your goal of "${goalText}", we need to sharpen your presence on **${platform}** with a **${vibe}** look and feel.

**THE MOVE.**
1. **The Focus**: Put your energy into **${platform}**. It's the best place for you to grow right now based on your inputs.
2. **The Look**: Lean into the **${vibe}** style. Most of your competitors are playing it safe; this is how you stand out.
3. **The Fix**: To get past **${hurdle}**, you need a simpler way to create. Focus on consistent quality rather than over-complicating the setup.

**THE CORE.**
- Aim for high-retention content on **${platform}**. 
- Let the **${vibe}** aesthetic lead all your creative choices. 

**THE TAKE.**
"A clear plan makes every decision easier. This is yours."`,

                    // VARIANT 2: THE MODERN GROWTH MAP
                    `**YOUR SITUATION.**
It's clear that **${hurdle}** is holding your vision back. To reach "${goalText}", we need to realign your **${obj}** strategy.

**THE MOVE.**
1. **The Base**: **${platform}** should be your home base. Stop treating it like a secondary channel.
2. **The Style**: The **${vibe}** direction isn't just for show—it's how you build authority and trust with your audience.
3. **The Action**: Take the next two weeks to tackle **${hurdle}** head-on with a focused set of new experiments.

**THE CORE.**
- Your goal of "${goalText}" is achievable if you batch your process. 
- Stick to the **${vibe}** vibe for everything you publish.

**THE TAKE.**
"The secret of getting ahead is simply getting started. You're already ahead by knowing your path."`,

                    // VARIANT 3: THE CREATIVE OVERRIDE
                    `**YOUR SITUATION.**
Standard growth tips won't work for **${obj}** when you're dealing with **${hurdle}**. We've built a specific blueprint to help you hit "${goalText}".

**THE MOVE.**
1. **The Standard**: Don't water down your **${vibe}** vision. **${platform}** needs that raw perspective to react.
2. **The Method**: Beat **${hurdle}** by showing people how you work. Transparency builds more engagement than perfection.
3. **The Target**: Focus 90% of your time on "${goalText}" using the **${obj}** framework we discussed.

**THE CORE.**
- Quality over quantity on **${platform}**. 
- The **${vibe}** style is your signature. Use it.

**THE TAKE.**
"Perspective is everything. Yours is ready to be shared."`
                ];

                advice = templates[Math.floor(Math.random() * templates.length)];
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
                
                // Ensure results are at the top for visibility
                window.scrollTo({ top: 0, behavior: 'smooth' });

                // Hide back button on result
                const backBtn = captureStep.querySelector('.audit-back-btn');
                if(backBtn) backBtn.style.display = 'none';

                // DYNAMIC TITLE ALIGNMENT
                const primaryGoal = this.answers.q1 || 'Strategy';
                const resultTitleEl = document.getElementById('audit-result-title');
                if (resultTitleEl) {
                    if (primaryGoal.includes('Video')) resultTitleEl.textContent = 'Production Roadmap';
                    else if (primaryGoal.includes('Brand')) resultTitleEl.textContent = 'Identity Roadmap';
                    else if (primaryGoal.includes('Growth')) resultTitleEl.textContent = 'Growth Roadmap';
                    else resultTitleEl.textContent = 'Project Roadmap';
                }

                tl.to(captureStep, { 
                    opacity: 0, 
                    y: -40, 
                    duration: 0.8, 
                    ease: "power4.in",
                    onComplete: () => {
                        captureStep.classList.remove('active');
                        resultStep.classList.add('active');
                        
                        // Futuristic Glitch Transition
                        document.body.classList.add('audit-glitch');
                        setTimeout(() => document.body.classList.remove('audit-glitch'), 350);

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
            const card = document.getElementById('audit-container');
            if (card) card.classList.remove('processing');
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
        this.typingIteration++;
        const currentIteration = this.typingIteration;

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
                    if (this.typingIteration !== currentIteration) return;

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
            if (this.typingIteration !== currentIteration) return;
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
            
            // Bold (**text** or __text__)
            let safeLine = escape(cleanLine);
            safeLine = safeLine.replace(/(\*\*|__)(.*?)\1/g, '<strong style="color:var(--accent2);">$2</strong>');

            const upper = safeLine.toUpperCase();

            // Headers
            if (upper.includes('YOUR SITUATION') || upper.includes('THE MOVE') || upper.includes('THE CORE') || upper.includes('THE FINAL TAKE') || upper.includes('THE TAKE')) {
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

        // Status Badge
        const bonusBadge = `
            <div class="audit-badge-transmission">
                <span style="width: 6px; height: 6px; background: var(--accent2); border-radius: 50%; box-shadow: 0 0 5px var(--accent2);"></span>
                Analysis Stream Active
            </div>
        `;
        
        return bonusBadge + html;
    },

    reset: function() {
        this.currentStep = 0;
        this.answers = {};
        this.isSubmitting = false;
        this.isNavigating = false;
        this.typingIteration++; // Interrupt any active typing
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

        // Ensure back buttons are hidden initially
        const backBtns = document.querySelectorAll('.audit-back-btn');
        backBtns.forEach(b => {
             b.style.display = 'none';
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

    // --- COPY UTILITY ---
    window.AuditEngine.copyResults = function(btn) {
        const content = document.getElementById('audit-advice-content');
        if (!content) return;
        
        const rawText = content.innerText;
        navigator.clipboard.writeText(rawText).then(() => {
            const originalText = btn.innerHTML;
            btn.innerHTML = 'COPIED TO CLIPBOARD //';
            btn.style.borderColor = 'white';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.borderColor = '';
            }, 2000);
        }).catch(err => {
            console.error('Clipboard Error:', err);
        });
    };
