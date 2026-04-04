import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tenant_id, account_id, token, tenant_name, tenant_email, property_name, unit_label, company_name } = await req.json();

    const inviteUrl = `${Deno.env.get("NEXT_PUBLIC_APP_URL") || "https://itenant.app"}/invite/${token}`;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    // Send welcome email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${company_name} via iTenant <noreply@itenant.app>`,
        to: [tenant_email],
        subject: `Welcome to ${company_name} — Set Up Your Tenant Portal`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #111;">
            <div style="background: #2563eb; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 32px;">
              <div style="color: white; font-size: 24px; font-weight: 800;">iTenant</div>
              <div style="color: #93c5fd; font-size: 14px; margin-top: 4px;">Property Management Portal</div>
            </div>
            <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Welcome, ${tenant_name}! 👋</h1>
            <p style="color: #666; font-size: 15px; line-height: 1.6;">
              <strong>${company_name}</strong> has invited you to manage your tenancy online through iTenant.
            </p>
            ${property_name ? `<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin: 20px 0;"><strong style="color: #1d4ed8;">${property_name}</strong>${unit_label ? `<br><span style="color: #3b82f6; font-size: 14px;">${unit_label}</span>` : ""}</div>` : ""}
            <p style="color: #666; font-size: 14px; margin-bottom: 8px;">With your iTenant account you can:</p>
            <ul style="color: #444; font-size: 14px; line-height: 2;">
              <li>✅ Pay rent online</li>
              <li>✅ Submit maintenance requests</li>
              <li>✅ Access your lease documents</li>
              <li>✅ Message your property manager</li>
              <li>✅ Track all your bills in one place</li>
            </ul>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${inviteUrl}" style="background: #2563eb; color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 700; font-size: 16px; display: inline-block;">
                Set Up My Account →
              </a>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center;">
              This link expires in 14 business days. If you have questions, contact ${company_name} directly.
            </p>
            <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 16px; text-align: center; color: #9ca3af; font-size: 11px;">
              Powered by iTenant · Property Management Platform
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailRes.ok) {
      const emailError = await emailRes.text();
      throw new Error(`Resend error: ${emailError}`);
    }

    // Log to communications_log
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("email_logs").insert({
      account_id,
      to_email: tenant_email,
      subject: `Welcome to ${company_name} — Set Up Your Tenant Portal`,
      direction: "outbound",
      linked_to_type: "tenant_invite",
      linked_to_id: tenant_id,
      status: "sent",
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
