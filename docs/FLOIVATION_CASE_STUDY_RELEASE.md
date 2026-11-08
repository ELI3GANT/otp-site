# FLOIVATION case study release record

**Prepared:** 2026-11-06
**Client project state:** In production
**Case-study approval:** Jeff approved public presentation on 2026-11-08
**Portfolio publication:** Not published; the showcase remains gated.

## Source and captures

- Original site observed in the signed-in Zen browser: [https://beacons.ai/floivation](https://beacons.ai/floivation).
- Redesign observed in the Lovable preview embedded in the signed-in Lovable workspace: [https://preview--floivation.lovable.app/](https://preview--floivation.lovable.app/). Direct unauthenticated requests returned 401, so the access token was not copied or retained in this report.
- Capture date: 2026-11-06 for both observed sources.
- Unaltered browser-window captures are kept outside the public site root in `/Users/eli/OTP/floivation-production/source-private/` (`before-native.png` and `after-app-full.jpg`). The new redesign capture was made from the signed-in preview in Zen on 2026-11-06, then cropped to 1440 × 900 with the pointer and browser border outside the image. It replaces the earlier low-resolution, pointer-obstructed redesign capture. It is a clean visible-viewport capture, not a full-page capture; the before and after source captures use different viewports and page states.
- Case-study comparison copies are stored in the gated case-study asset route at `/Users/eli/OTP/otp-site/assets/case-studies/floivation/`. The review source copy is also in `/Users/eli/OTP/floivation-production/assets/case-studies/floivation/` and `media/`.
- The original page visibly contains the Floivation manifesto and Instagram path. The redesign preview visibly contains Home, About, Shop, Gallery, and Contact navigation; supporter content; a fitness section; and a “The Drop Is Coming” section. The comparison copy reflects these observations only.

## Recording and film

- Recordly 1.4.0 was used to capture the original Beacons window. The editable project is at `/Users/eli/Library/Application Support/Recordly/recordings/Projects/FLOIVATION-before-2026-11-06.recordly`.
- An MP4 export of the original recording is at `/Users/eli/OTP/floivation-production/floivation-before-recordly.mp4`. It is 48.9 seconds, 2880 × 1620, and about 121 MB. It is an original-site walkthrough only; it has not been edited into the requested before-and-after film.
- Recordly 1.4.0 captured the redesigned homepage preview in the signed-in Lovable workspace on 2026-11-06. The editable project is `/Users/eli/Library/Application Support/Recordly/recordings/Projects/FLOIVATION-redesigned-2026-11-06.recordly`; its MP4 export is `/Users/eli/OTP/floivation-production/floivation-redesigned-recordly.mp4` (114 seconds, 2880 × 1620, H.264/AAC, 104,249,376 bytes). The walkthrough includes the supporter gallery, manifesto and values, fitness/lifestyle video area, and “The Drop Is Coming” callout. The capture is from the Lovable workspace window, so workspace chrome is visible; it is a review capture, not the finished before-and-after film.
- A fresh Recordly capture was made on 2026-11-06 from the redesigned site. Its unmodified export is `/Users/eli/OTP/floivation-production/floivation-redesigned-recordly-rerecorded-2026-11-06.mp4` (36.53 seconds, 2880 × 1620, H.264/AAC, 87,971,477 bytes). It covers the homepage, community content, fitness section, founder story, shop, and footer without workspace chrome.
- The current FFmpeg transformation film is 53.03 seconds; its after sequence uses the fresh Recordly capture, with the moving gym clip composited into the site's fitness player where the capture showed a paused poster. The master and web encodes are separate files. The film closes on the supplied OnlyTruePerspective logo on black. The previous 30.5-second master is archived at `/Users/eli/OTP/floivation-production/archive/transformation-master-pre-rerecord-2026-11-06.mp4`; the logo source is preserved at `/Users/eli/OTP/floivation-production/assets/Flowery-Day-Greetings-2.png`.
- The redesigned preview's embedded fitness video was downloaded from the visible player in signed-in Zen as `/Users/eli/OTP/floivation-production/assets/case-studies/floivation/gym-lifestyle-motion.mp4` (14.2 seconds, 900 × 1196, H.264/AAC, 30 fps). The source remains separately available for reuse.
- The updated Recordly walkthrough web export is `/Users/eli/OTP/otp-site/assets/case-studies/floivation/after-recordly-web.mp4` (36.53 seconds, 1920 × 1080, H.264, silent). It preserves the new recording and replaces the paused fitness-player image and controls with a short moving segment from the same source clip. The unmodified Recordly export and project are preserved separately.
- The film closes on the supplied OnlyTruePerspective logo on black. A vertical social edit remains pending.

## Implementation and portfolio integration

- Reusable case-study content and rendering live in `floivation-case-study.js`; presentation remains separate from the content object.
- The route `/projects/floivation` and image route `/case-study-media/floivation/:name` are available only when the server environment sets `FLOIVATION_PUBLIC_APPROVED=true`. The default path falls through to the normal 404. The private captures are stored outside the public static root.
- The case study states “In production,” treats potential services as future opportunities, and links its inquiry CTA to OTP's Start a Project menu. The preview is not represented as a published client-owned domain.
- Jeff approved public presentation of the case study on 2026-11-08; all six included case-study assets are recorded as approved for this use. FLOIVATION remains out of the public project registry, homepage, archive, sitemap, and social sharing metadata until final artifact review is complete.
- Editorial rating: **8/10, content-ready, not release-ready**. The story is clear and visually supported, the icons make the three transformation points easier to scan, and the claims stay grounded in observed preview content. The remaining release gap is verification evidence: responsive/browser review, comparison-slider keyboard/touch behavior, accessibility, and current private-preview route availability. The client-owned site also remains in production, so no launch or performance outcome is claimed.

## Verification

- Passed: `node --check server.js`.
- Passed: `node --check floivation-case-study.js`.
- Passed: local render smoke check (case-study output produced with project identity and status).
- Passed: source capture dimensions inspected with FFprobe; Recordly MP4 metadata inspected with FFprobe.
- Passed: new redesigned-site Recordly MP4 export completed and verified with FFprobe (36.53 seconds, 2880 × 1620, H.264/AAC).
- Passed: updated silent walkthrough verified at 36.53 seconds, 1920 × 1080, H.264; the inline gym-video replacement and hidden control strip were visually inspected.
- Passed: OTP logo end card preserved and visually inspected; updated transformation master and web encodes are 53.03 seconds, 1280 × 720, H.264.
- Passed: Zen redesign screenshot refreshed from the authenticated preview; clean 1440 × 900 capture and matching alt text/poster references recorded.
- Passed: live gym source saved and its H.264/AAC stream, 900 × 1196 dimensions, 30 fps, and 14.2-second duration inspected with FFprobe.
- Passed: the 53.03-second transformation film now uses the latest redesigned-site recording, shows Jeff's clip moving inside the page player, and closes on OTP's logo.
- Passed: FLOIVATION case-study and Archive contracts; full local suite (54/54); live CI suite (54/54); pinned contracts; secret scan; speed-insights build; and HTTP-only predeploy sweep (34 public checks).
- Passed: local case-study page and updated transformation media served from the loopback preview during the earlier review. Zen reported the updated video duration and allowed seeking into the after section.
- Passed: Chrome browser review at 1440 × 900, 768 × 1024, and 390 × 844. The case-study route returned 200, the Archive showed one FLOIVATION card, all three videos had controls, the three feature icons appeared, no horizontal overflow or console errors occurred, and the comparison slider responded to keyboard and touch input. Basic accessibility markup was checked: one page heading, image alt text, labeled range control, video controls, and visible keyboard focus.
- Still unverified: mobile Safari, same-state source captures, full-page source captures, and the client-owned live website URL; none is represented as verified or launched in the case study.

## Release decision

The public case-study release is staged for the guarded production workflow. Jeff's approval is recorded. Publication means the OTP case study and its six approved assets become public; FLOIVATION's client-owned site remains in production. The local OTP OS private preview route remains a separate internal workflow issue and does not gate the public case-study route.
