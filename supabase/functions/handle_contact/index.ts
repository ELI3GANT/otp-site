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
        from: "OTP Studio <onboarding@resend.dev>", // Change this if you have a custom domain verified in Resend
        to: record.email,
        subject: "We received your request | OTP",
        html: `
          <div style="font-family: sans-serif; background: #000; color: #fff; padding: 40px;">
            <h1 style="color: #7000ff;">Vision Locked.</h1>
            <p>Hey ${record.name || 'Creator'},</p>
            <p>We received your inquiry regarding <strong>${record.service || 'a project'}</strong>.</p>
            <p>Our team is reviewing your details and will reach out shortly to lock in the timeline.</p>
            <br/>
            <p>Welcome to the Only True Perspective.</p>
            <p style="opacity: 0.5;">- OTP Team</p>
            <hr style="border-color: #333;" />
            <p style="font-size: 12px; opacity: 0.4;">You provided: ${record.message}</p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    console.log("Resend response:", data);

    return new Response(JSON.stringify(data), {
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
