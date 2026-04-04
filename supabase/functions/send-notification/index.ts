import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Replace template variables like {{tenant_name}} with actual values
function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const {
      channel,        // "email" | "sms" | "both"
      to_email,
      to_phone,
      subject,
      body,
      vars = {},      // template variables
      account_id,
      rule_id,
      recipient_type,
      from_number,    // Twilio from number (account's dedicated number)
    } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const filledSubject = fillTemplate(subject || "", vars);
    const filledBody = fillTemplate(body || "", vars);

    const results: { email?: string; sms?: string } = {};

    // ── EMAIL ────────────────────────────────────────────────────────────────
    if ((channel === "email" || channel === "both") && to_email) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "iTenant <notifications@itenant.app>",
            to: [to_email],
            subject: filledSubject,
            html: `
              <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 20px;color:#111;">
                <div style="background:#2563eb;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                  <span style="color:white;font-weight:800;font-size:18px;">iTenant</span>
                </div>
                <div style="font-size:15px;line-height:1.7;color:#333;">${filledBody.replace(/\n/g, "<br>")}</div>
                <div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:16px;text-align:center;color:#9ca3af;font-size:11px;">
                  iTenant Property Management · You received this because you are a tenant or property manager on iTenant.
                </div>
              </div>
            `,
          }),
        });
        results.email = res.ok ? "sent" : "failed";

        await supabase.from("email_logs").insert({
          account_id, to_email: to_email, subject: filledSubject,
          body: filledBody, direction: "outbound",
          linked_to_type: "automation_rule", linked_to_id: rule_id,
          status: results.email,
        });
      }
    }

    // ── SMS ──────────────────────────────────────────────────────────────────
    if ((channel === "sms" || channel === "both") && to_phone) {
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioFrom = from_number || Deno.env.get("TWILIO_DEFAULT_FROM");

      if (twilioSid && twilioToken && twilioFrom) {
        const smsBody = filledBody.substring(0, 1600); // SMS limit
        const encoded = new URLSearchParams({
          To: to_phone,
          From: twilioFrom,
          Body: smsBody,
        });

        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Authorization": `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: encoded.toString(),
          }
        );

        results.sms = res.ok ? "sent" : "failed";

        await supabase.from("communications_log").insert({
          account_id, channel: "sms", direction: "outbound",
          to_address: to_phone, from_address: twilioFrom,
          body: smsBody, status: results.sms,
          linked_to_type: "automation_rule", linked_to_id: rule_id,
        });
      }
    }

    // ── LOG AUTOMATION ────────────────────────────────────────────────────────
    await supabase.from("automation_logs").insert({
      account_id, rule_id,
      channel: channel,
      recipient_type: recipient_type || "tenant",
      status: Object.values(results).some(r => r === "sent") ? "sent" : "failed",
    });

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
