# Conversion Event Reference

The public site has no configured GA4 measurement ID or general-purpose first-party event store at present. `otp-conversion-analytics.js` emits GA4-compatible event names only when a consented/configured site tag provides `window.gtag`. Until that tag exists, CTA events are intentionally not sent or persisted. No form values, URLs containing user-provided data, or other personal information are passed to events.

| Event | Trigger |
| --- | --- |
| `cta_site_audit_click` | Free Site Audit CTA |
| `cta_start_project_click` | The Signal CTA |
| `cta_view_work_click` | Archive/work CTA |
| `booking_started` | Reserved for configured tag integration |
| `booking_submitted` | Successful public booking response |
| `email_click` | `mailto:` link |
| `phone_click` | `tel:` link |
| `calendly_click` | Reserved for a future configured Calendly link |
| `case_study_view` | Case-study link click |

Actual submitted leads continue through `/api/bookings/submit` with the existing privacy-filtered source attribution and OTP OS handoff. Configure GA4 consent/tag policy before treating the event list as live measurement.
