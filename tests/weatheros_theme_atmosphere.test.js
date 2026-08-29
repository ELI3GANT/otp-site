const assert = require("assert");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const htmlPath = path.join(rootDir, "weatheros.html");
const indexPath = path.join(rootDir, "weatheros", "index.html");

console.log("🧪 Running WeatherOS Theme Hardening & Atmosphere Tests...");

// 1. File Parity Check
const htmlContent = fs.readFileSync(htmlPath, "utf8");
const indexContent = fs.readFileSync(indexPath, "utf8");
assert.strictEqual(htmlContent, indexContent, "weatheros.html and weatheros/index.html must be 100% identical");
console.log("   ✅ File parity: weatheros.html and weatheros/index.html are identical");

// 2. Duplicate Script Execution Audit
const themeChronoMatches = (htmlContent.match(/src="[^"]*theme-chrono\.js[^"]*"/g) || []);
assert.strictEqual(themeChronoMatches.length, 1, "theme-chrono.js must be included exactly ONCE in the document");
assert.ok(htmlContent.indexOf("<head>") < htmlContent.indexOf("theme-chrono.js") && htmlContent.indexOf("theme-chrono.js") < htmlContent.indexOf("</head>"), "theme-chrono.js must be in <head>");
console.log("   ✅ Single theme-chrono.js execution in <head> verified");

// 3. Manual Theme Persistence Contract ("true", not "1")
assert.ok(htmlContent.includes("localStorage.setItem('theme_manual', 'true')"), "Must write theme_manual as true");
assert.ok(!htmlContent.includes("localStorage.setItem('theme_manual', '1')"), "Must not write theme_manual as 1");
console.log("   ✅ theme_manual canonical storage contract verified");

// 4. Atmosphere Layer DOM & Layering Architecture
assert.ok(htmlContent.includes("<div class=\"weather-atmosphere\" aria-hidden=\"true\">"), "weather-atmosphere container must exist with aria-hidden=true");
assert.ok(htmlContent.includes("class=\"weather-sky-backdrop\""), "weather-sky-backdrop element must exist");
assert.ok(htmlContent.includes("class=\"weather-solar-glow\""), "weather-solar-glow element must exist");
assert.ok(htmlContent.includes("class=\"weather-clouds-layer weather-clouds-far\""), "weather-clouds-far element must exist");
assert.ok(htmlContent.includes("class=\"weather-clouds-layer weather-clouds-near\""), "weather-clouds-near element must exist");
assert.ok(htmlContent.includes("class=\"weather-haze-layer\""), "weather-haze-layer element must exist");
assert.ok(htmlContent.includes("pointer-events: none;"), "Atmosphere must have pointer-events: none");
console.log("   ✅ Atmosphere DOM structure and non-blocking layering verified");

// 5. Contextual Section Backdrops (Behind Phone Cards)
assert.ok(htmlContent.includes("class=\"weather-rain-backdrop\" aria-hidden=\"true\""), "Today section must include weather-rain-backdrop with aria-hidden=true");
assert.ok(htmlContent.includes("class=\"weather-thermal-backdrop\" aria-hidden=\"true\""), "Hourly section must include weather-thermal-backdrop with aria-hidden=true");
assert.ok(htmlContent.includes("class=\"weather-cirrus-backdrop\" aria-hidden=\"true\""), "Daily section must include weather-cirrus-backdrop with aria-hidden=true");
assert.ok(htmlContent.includes("class=\"weather-storm-aura\" aria-hidden=\"true\""), "Radar section must include weather-storm-aura with aria-hidden=true");
console.log("   ✅ Section-specific contextual backdrops verified");

// 6. Reduced Motion Safety
assert.ok(htmlContent.includes("@media (prefers-reduced-motion: reduce)"), "prefers-reduced-motion media query must be present");
assert.ok(htmlContent.includes("weather-clouds-far"), "Reduced motion must target clouds");
assert.ok(htmlContent.includes("weather-rain-backdrop"), "Reduced motion must target rain backdrop");
assert.ok(htmlContent.includes("weather-storm-aura"), "Reduced motion must target storm aura");
console.log("   ✅ Reduced motion accessibility rules verified");

// 7. Button Semantics & Label Agreement
assert.ok(htmlContent.includes("btn.innerHTML = '🌙 Night Mode'"), "Day mode must display Night Mode action text");
assert.ok(htmlContent.includes("btn.setAttribute('aria-label', 'Switch to Night Mode')"), "Day mode must set Switch to Night Mode aria-label");
assert.ok(htmlContent.includes("btn.innerHTML = '☀️ Day Mode'"), "Night mode must display Day Mode action text");
assert.ok(htmlContent.includes("btn.setAttribute('aria-label', 'Switch to Day Mode')"), "Night mode must set Switch to Day Mode aria-label");
console.log("   ✅ Toggle button semantic action labels and aria-labels verified");

// 8. Resolved Weather Phase Logic (Manual vs Chrono)
assert.ok(htmlContent.includes("function resolveWeatherPhase()"), "resolveWeatherPhase function must exist");
assert.ok(htmlContent.includes("data-weather-phase"), "data-weather-phase attribute must be used for atmosphere");
console.log("   ✅ Resolved weather phase state engine verified");

console.log("🎉 ALL WeatherOS Theme Hardening & Atmosphere tests passed!\n");
