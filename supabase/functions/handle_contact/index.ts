import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  try {
    const { record } = await req.json();
    
    // 1. Validate we have a new record with an email
    if (!record || !record.email) {
       return new Response("No email found", { status: 400 });
    }

    console.log(`Sending email to ${record.email}...`);

    // 2. Send Email via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "OTP Studio <contact@onlytrueperspective.tech>", // Sending from verified domain
        to: record.email,
        subject: "We received your project inquiry",
        html: `
          <div style="font-family: sans-serif; background: #000; color: #fff; padding: 40px; border-radius: 8px;">
            <p style="font-size: 16px; line-height: 1.5;">Thank you for reaching out to OnlyTruePerspective. Your project request has been received and is currently being reviewed. If your project requires a consultation you can schedule a Vision Session here: <a href="https://calendly.com/onlytrueperspective/30min" style="color: #00ecff; text-decoration: none;">Calendly Link</a>. We will follow up shortly.</p>
            <br/>
            <p style="font-size: 16px; font-weight: bold; color: #00ecff;">– ELI, OnlyTruePerspective</p>
            <hr style="border-color: #333; margin-top: 40px;" />
            <p style="font-size: 12px; opacity: 0.4;">Inquiry Details: ${record.service || 'General'} | ${record.message}</p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    console.log("Resend customer response:", data);

    // 3. Send Notification to Business Team
    const adminRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "OTP System <contact@onlytrueperspective.tech>",
        to: ["contact@onlytrueperspective.tech", "eli@onlytrueperspective.tech"],
        reply_to: record.email,
        subject: `NEW INQUIRY: ${record.service || 'General'} from ${record.name || 'Unknown'}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; background: #111; color: #eee; border-radius: 8px;">
            <h2 style="color: #00ecff;">New Contact Submission</h2>
            <p><strong>Name:</strong> ${record.name || 'N/A'}</p>
            <p><strong>Email:</strong> ${record.email}</p>
            <p><strong>Service:</strong> ${record.service || 'N/A'}</p>
            <hr style="border-color: #333; margin: 20px 0;" />
            <p><strong>Message:</strong></p>
            <div style="white-space: pre-wrap; background: #000; padding: 15px; border-radius: 4px; color: #fff;">${record.message || 'No message provided.'}</div>
          </div>
        `,
      }),
    });

    const adminData = await adminRes.json();
    console.log("Resend admin response:", adminData);

    return new Response(JSON.stringify({ customer_receipt: data, admin_receipt: adminData }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
