# OTP Asset System

Production logo and icon paths are intentionally split by use case:

- Primary transparent logo: `/assets/otp-logo-transparent.png`
- Square app icon source: `/assets/otp-app-icon.png`
- Browser favicon: `/favicon-32x32.png`
- Legacy favicon compatibility: `/favicon.png`
- Apple touch icon: `/apple-touch-icon.png`
- Structured data/logo icon: `/icon.png`
- Web app manifest icons: `/icon-192.png`, `/icon-512.png`
- Social preview image: `/og.jpg`

Rules:

- Files named `.png` must be real PNG files, not renamed JPEGs.
- Head icon links should use root-absolute paths so aliases and clean routes resolve the same asset.
- The homepage header logo uses the transparent mark, not the square app icon.
- App icons and social previews use the square/dark icon treatment so the white OTP mark stays visible on light browser surfaces.
- OTP OS mirrors may keep their local public assets, but `/os` asset routes must continue to resolve through the proxy without leaking root paths.
