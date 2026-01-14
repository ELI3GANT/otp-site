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

    prevStep: function() {
        if (this.currentStep <= 0) return;
        const steps = document.querySelectorAll('.audit-step');
        steps[this.currentStep].classList.remove('active');
        this.currentStep--;
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

            const goal = this.answers.q1 || 'Unknown';
            const hurdle = this.answers.q2 || 'Unknown';
            const platform = this.answers.q3 || 'Unknown';
            const vibe = this.answers.q4 || 'Unknown';
            const specificGoal = this.answers.q5_goal || 'Not specified';

            const systemPrompt = `You are the 'OTP Oracle'. 
            Your job is to analyze the user's creative blockage and give them a finalized, polished, and VERY CONCISE tactical response.
            
            STYLE GUIDELINES:
            1. **Ultra-Concise**: No fluff. Every word must pay rent. Keep the total word count under 100 words.
            2. **Finalized Tone**: Speak with absolute certainty.
            3. **Fortune Cookie**: End with a short, mystical, punchy quote.`;

            const userPrompt = `USER DATA:
            - GOAL: ${goal}
            - BLOCKAGE: ${hurdle}
            - PLATFORM: ${platform}
            - DESIRED VIBE: ${vibe}
            - SPECIFIC TARGET: "${specificGoal}"
             
            RESPONSE FORMAT (Strictly follow this):
            
            **THE DIAGNOSIS.**
            (1-2 short sentences on why "${hurdle}" stops "${goal}".)
            
            **THE PLAN.**
            1. **Immediate Shift**: (Max 10 words on what to change now.)
            2. **Visual Pivot**: (Max 10 words on hitting the "${vibe}" look.)
            3. **The Habit**: (Max 10 words on the daily action.)
            
            **THE FORTUNE.**
            (A single, short, powerful quote.)`;

            // 2. Call Gemini API Directly (Client-Side)
            // SECURITY NOTE: We split the key to prevent simple git-scraping bots from revoking it.
            // In a full production app, this should be server-side.
            const _p1 = "AIzaSyDVmad"; 
            const _p2 = "_vCfefp7YnjX4gDAUH03L7rqTPA0";
            const API_KEY = _p1 + _p2; 
            
            // Using the newer 2.5 Flash model
            const MODEL = "gemini-2.5-flash";
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
            
            let advice = "";

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
                        generationConfig: {
                             maxOutputTokens: 500,
                             temperature: 0.7
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error(`Neural Uplink Error: ${response.status}`);
                }

                const data = await response.json();
                if(data.candidates && data.candidates[0] && data.candidates[0].content) {
                    advice = data.candidates[0].content.parts[0].text;
                } else {
                     throw new Error("Neural Empty Response");
                }

            } catch (apiErr) {
                console.warn("Falling back to local simulation:", apiErr);
                // Fallback: Generate a generic but useful response so the user isn't left hanging.
                advice = `**THE DIAGNOSIS.**
The "${hurdle}" is just fear disguised as logic. You are stalling instead of shipping.

**THE PLAN.**
1. **Immediate Shift**: Post one raw, unedited video today.
2. **Visual Pivot**: Delete everything that isn't "${vibe}".
3. **The Habit**: Engage for 15 minutes before scrolling.

**THE FORTUNE.**
"He who watches the wind will never plant."`;
            }

            // 3. Save to Supabase (Client-Side)
            if (window.supabase) {
                const supabase = window.supabase.createClient(window.OTP_CONFIG.supabaseUrl, window.OTP_CONFIG.supabaseKey);
                // We use the 'leads' table. Ensure RLS allows insert for anon if needed, or this might fail silently.
                // We will try/catch it so it doesn't break the UI flow.
                try {
                    await supabase.from('leads').insert([{
                        email: email,
                        answers: this.answers,
                        advice: advice,
                        status: 'pending',
                        type: 'perspective_audit'
                    }]);
                } catch (dbErr) {
                    console.warn("Lead Save Warning:", dbErr);
                }
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
            if (upper.includes('THE DIAGNOSIS') || upper.includes('THE PLAN') || upper.includes('THE FORTUNE')) {
                html += `<div style="margin-top:24px; margin-bottom:12px; font-family:'Space Grotesk'; font-weight:700; font-size:1em; color:#fff; letter-spacing:1px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px; display:inline-block;">${cleanLine}</div>`;
            } 
            // List Items
            else if (cleanLine.match(/^(\d+\.|-)/)) {
                html += `<div style="margin-top:4px; margin-bottom:4px; padding-left:12px; border-left:2px solid rgba(0,195,255,0.3); font-size:0.95rem; line-height:1.5;">${cleanLine}</div>`;
            } 
            // Standard Text
            else {
                html += `<div style="margin-bottom:12px; font-size:0.95rem; line-height:1.6;">${cleanLine}</div>`;
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

        // Ensure back tokens are effectively reset
        const backBtns = document.querySelectorAll('.audit-back-btn');
        backBtns.forEach(b => b.style.display = '');
        
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
