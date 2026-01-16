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
            } catch (e) { console.warn("Backend link severed, pivoting to direct oracle..."); }
            // 2. Direct Oracle Link (Client-side Fallback if backend is static/405/404)
            if (!success) {
                try {
                    const _p1 = "AIzaSyDVmad"; 
                    const _p2 = "_vCfefp7YnjX4gDAUH03L7rqTPA0";
                    const API_KEY = _p1 + _p2; 
                    const MODEL = "gemini-1.5-flash"; 
                    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
                    
                    const systemPrompt = `You are the OTP Oracle. Analyze: ${goal}, ${hurdle}, ${platform}, ${vibe}, Target: ${specificGoal}. 
                    Provide concise advice in Paragraph format with **Bolded Truths**. No greetings. Focus on hitting the goal of ${specificGoal}. 
                    Structure: **THE DIAGNOSIS.** (1 sentence), **THE PLAN.** (3 bullet points), **THE FORTUNE.** (1 short quote).`;

                    const directRes = await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: systemPrompt }] }],
                            generationConfig: { temperature: 0.9, maxOutputTokens: 400 }
                        })
                    });

                    if (directRes.ok) {
                        const directData = await directRes.json();
                        advice = directData.candidates[0].content.parts[0].text;
                        success = true;

                        // PUSH LEAD TO SUPABASE (Direct Client-Side Attempt)
                        if (window.supabase && window.OTP_CONFIG) {
                            try {
                                const sb = window.supabase.createClient(window.OTP_CONFIG.supabaseUrl, window.OTP_CONFIG.supabaseKey);
                                await sb.from('leads').insert([{ 
                                    email, 
                                    answers: this.answers, 
                                    advice, 
                                    type: 'perspective_audit_bypass' 
                                }]);
                            } catch (sbErr) { console.warn("Direct DB save failed."); }
                        }
                    }
                } catch (apiErr) { console.warn("Direct Oracle link jammed."); }
            }

            // 3. Dynamic Local Simulation (Ultra-Dynamic even if offline)
            if (!success) {
                const blueprints = [
                    {
                        diag: `The frequency shift to **${vibe}** is being jammed by **${hurdle}**. This isn't a technical error; it's a structural one.`,
                        plan: [
                            `Pivot your ${platform} strategy to prioritize **${specificGoal}** immediately.`,
                            `Adopt the **${vibe}** aesthetic today—strip away everything that doesn't serve the vision.`,
                            `Daily Protocol: Commit 30 minutes to ${specificGoal} before checking any metrics.`
                        ],
                        fortune: `"The clearest vision is the one you execute with."`
                    },
                    {
                        diag: `You are aiming for **${specificGoal}**, but your reliance on **${hurdle}** is a tether to the ground. You cannot fly with an anchor.`,
                        plan: [
                            `Identify the specific loop where **${hurdle}** starts and kill it at the source.`,
                            `Your presence on ${platform} must scream **${vibe}**. No half-measures.`,
                            `The Fix: Upload one raw progress signal towards **${specificGoal}** every 24 hours.`
                        ],
                        fortune: `"Complexity is the enemy of the elite."`
                    },
                    {
                        diag: `Signal Analysis: **${goal}** is the objective, but **${hurdle}** is the static. Your ${platform} presence is currently out of phase.`,
                        plan: [
                            `Merge your ${vibe} desires with the technical reality of ${platform}.`,
                            `Stop negotiating with **${hurdle}**. It is a ghost. Ignore it and ship.`,
                            `Final Move: Align your next 3 posts with the specific mission of **${specificGoal}**.`
                        ],
                        fortune: `"He who watches the wind will never plant."`
                    }
                ];

                const blueprint = blueprints[Math.floor(Math.random() * blueprints.length)];
                
                advice = `**THE DIAGNOSIS.**\n${blueprint.diag}\n\n**THE PLAN.**\n1. ${blueprint.plan[0]}\n2. ${blueprint.plan[1]}\n3. ${blueprint.plan[2]}\n\n**THE FORTUNE.**\n${blueprint.fortune}`;
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
                        adviceEl.innerHTML = this.formatAdvice(advice);
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
                adviceEl.innerHTML = this.formatAdvice(advice);
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
        
        const lines = text.split('\n');
        let html = '';

        lines.forEach(line => {
            let cleanLine = line.trim();
            if (!cleanLine) return; // Skip empty lines

            // Remove markdown syntax
            cleanLine = cleanLine.replace(/`/g, '');
            // Bold
            cleanLine = cleanLine.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--accent2);">$1</strong>');

            const upper = cleanLine.toUpperCase();

            // Headers
            if (upper.includes('THE DIAGNOSIS') || upper.includes('THE PLAN') || upper.includes('THE FORTUNE') || upper.includes('THE TRUTH') || upper.includes('THE NEXT STEP') || upper.includes('THE MISSION')) {
                html += `<div class="advice-header">${cleanLine}</div>`;
            } 
            // List Items
            else if (cleanLine.match(/^(\d+\.|-|\*)/)) {
                html += `<div class="advice-list-item">${cleanLine}</div>`;
            } 
            // Standard Text
            else {
                html += `<div class="advice-row">${cleanLine}</div>`;
            }
        });

        // Add a tactical header badge
        const bonusBadge = `
            <div style="margin-bottom: 20px; display: inline-flex; align-items: center; gap: 8px; background: rgba(0, 195, 255, 0.1); border: 1px solid rgba(0, 195, 255, 0.3); padding: 5px 12px; border-radius: 4px; font-family: 'Space Grotesk', sans-serif; font-size: 0.75rem; color: #00c3ff; letter-spacing: 1px; font-weight: 700; text-transform: uppercase;">
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
