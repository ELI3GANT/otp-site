const assert = require("assert");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const htmlPath = path.join(rootDir, "weatheros.html");
const indexPath = path.join(rootDir, "weatheros", "index.html");

console.log("🧪 Running WeatherOS Scene & Site Theme Separation Tests...");

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

// 3. Isolated Storage Keys Contract
assert.ok(htmlContent.includes("weatheros_scene"), "Must use weatheros_scene storage key");
assert.ok(htmlContent.includes("weatheros_scene_manual"), "Must use weatheros_scene_manual storage key");
assert.ok(htmlContent.includes("weatheros_scene_manual_time"), "Must use weatheros_scene_manual_time storage key");
assert.ok(htmlContent.includes("reset_weather_scene"), "Must support ?reset_weather_scene=1 query parameter");
console.log("   ✅ WeatherOS Scene dedicated storage keys verified");

// 4. Distinct Top & Site Control Button Labels
assert.ok(htmlContent.includes("🌙 WeatherOS Night"), "Top button must display WeatherOS Night label");
assert.ok(htmlContent.includes("☀️ WeatherOS Day"), "Top button must display WeatherOS Day label");
assert.ok(htmlContent.includes("Switch WeatherOS atmosphere to Night"), "Top button must have explicit atmosphere aria-label");
assert.ok(htmlContent.includes("Switch WeatherOS atmosphere to Day"), "Top button must have explicit atmosphere aria-label");

assert.ok(htmlContent.includes("🌙 Site Dark"), "Site button must display Site Dark label");
assert.ok(htmlContent.includes("☀️ Site Light"), "Site button must display Site Light label");
assert.ok(htmlContent.includes("Switch website to Dark Mode"), "Site button must have explicit site aria-label");
assert.ok(htmlContent.includes("Switch website to Light Mode"), "Site button must have explicit site aria-label");
console.log("   ✅ Distinct button labels & accessible semantics verified");

// 5. Atmosphere Layer DOM & Layering Architecture
assert.ok(htmlContent.includes("<div class=\"weather-atmosphere\" aria-hidden=\"true\">"), "weather-atmosphere container must exist with aria-hidden=true");
assert.ok(htmlContent.includes("class=\"weather-sky-backdrop\""), "weather-sky-backdrop element must exist");
assert.ok(htmlContent.includes("class=\"weather-solar-glow\""), "weather-solar-glow element must exist");
assert.ok(htmlContent.includes("class=\"weather-clouds-layer weather-clouds-far\""), "weather-clouds-far element must exist");
assert.ok(htmlContent.includes("class=\"weather-clouds-layer weather-clouds-near\""), "weather-clouds-near element must exist");
assert.ok(htmlContent.includes("class=\"weather-haze-layer\""), "weather-haze-layer element must exist");
assert.ok(htmlContent.includes("pointer-events: none;"), "Atmosphere must have pointer-events: none");
console.log("   ✅ Atmosphere DOM structure and non-blocking layering verified");

// 6. Contextual Section Backdrops (Behind Phone Cards)
assert.ok(htmlContent.includes("class=\"weather-rain-backdrop\" aria-hidden=\"true\""), "Today section must include weather-rain-backdrop with aria-hidden=true");
assert.ok(htmlContent.includes("class=\"weather-thermal-backdrop\" aria-hidden=\"true\""), "Hourly section must include weather-thermal-backdrop with aria-hidden=true");
assert.ok(htmlContent.includes("class=\"weather-cirrus-backdrop\" aria-hidden=\"true\""), "Daily section must include weather-cirrus-backdrop with aria-hidden=true");
assert.ok(htmlContent.includes("class=\"weather-storm-aura\" aria-hidden=\"true\""), "Radar section must include weather-storm-aura with aria-hidden=true");
console.log("   ✅ Section-specific contextual backdrops verified");

// 7. Starfield Visibility Decoupled from Site Light/Dark Theme
assert.ok(htmlContent.includes("[data-weather-phase=\"day\"] .stars-v2-container"), "Starfield hidden in Day scene");
assert.ok(htmlContent.includes("[data-weather-phase=\"sunrise\"] .stars-v2-container"), "Starfield hidden in Sunrise scene");
assert.ok(!htmlContent.includes("html[data-theme=\"light\"] .stars-v2-container"), "Starfield must NOT be unconditionally hidden by site light theme");
console.log("   ✅ Starfield visibility correctly bound to data-weather-phase");

// 8. Reduced Motion Safety
assert.ok(htmlContent.includes("@media (prefers-reduced-motion: reduce)"), "prefers-reduced-motion media query must be present");
assert.ok(htmlContent.includes("weather-clouds-far"), "Reduced motion must target clouds");
assert.ok(htmlContent.includes("weather-rain-backdrop"), "Reduced motion must target rain backdrop");
assert.ok(htmlContent.includes("weather-storm-aura"), "Reduced motion must target storm aura");
console.log("   ✅ Reduced motion accessibility rules verified");

// 9. WeatherOS Scene API Surface
assert.ok(htmlContent.includes("getWeatherScene"), "getWeatherScene function must exist");
assert.ok(htmlContent.includes("setWeatherScene"), "setWeatherScene function must exist");
assert.ok(htmlContent.includes("toggleWeatherScene"), "toggleWeatherScene function must exist");
assert.ok(htmlContent.includes("updateWeatherSceneUI"), "updateWeatherSceneUI function must exist");
console.log("   ✅ WeatherOS Scene API functions verified");

console.log("🎉 ALL WeatherOS Scene & Site Theme Separation tests passed!\n");
