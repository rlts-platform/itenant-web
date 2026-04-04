import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supported trigger events
type TriggerEvent =
  | "rent_due" | "rent_overdue" | "payment_confirmed"
  | "work_order_created" | "work_order_in_progress" | "work_order_closed" | "work_order_emergency"
  | "lease_expiring" | "lease_signed" | "move_out_scheduled"
  | "invite_accepted" | "invite_pending" | "invite_expired";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const {
      event,          // TriggerEvent
      account_id,
      tenant_id,
      payload = {},   // contextual data for template vars
    } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all enabled automation rules for this event + account
    const { data: rules } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("account_id", account_id)
      .eq("trigger_event", event)
      .eq("is_enabled", true);

    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No rules for this event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get tenant info for template vars
    let tenantData: Record<string, string> = {};
    if (tenant_id) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("first_name, last_name, email, phone, unit_id")
        .eq("tenant_id", tenant_id)
        .maybeSingle();

      if (tenant) {
        tenantData = {
          tenant_name: `${tenant.first_name} ${tenant.last_name}`,
          tenant_email: tenant.email || "",
          tenant_phone: tenant.phone || "",
        };
      }
    }

    // Get account info
    const { data: account } = await supabase
      .from("accounts")
      .select("company_name")
      .eq("account_id", account_id)
      .maybeSingle();

    const vars = {
      ...tenantData,
      company_name: account?.company_name || "Your Property Manager",
      app_url: Deno.env.get("NEXT_PUBLIC_APP_URL") || "https://itenant.app",
      ...payload, // override with specific payload values
    };

    // Get account's Twilio number
    const { data: phoneRecord } = await supabase
      .from("account_phone_numbers")
      .select("twilio_number")
      .eq("account_id", account_id)
      .eq("status", "active")
      .maybeSingle();

    const results = [];

    for (const rule of rules) {
      const channels = rule.channels || ["email"];
      const to_phone = vars.tenant_phone;
      const to_email = vars.tenant_email;

      // Fire to send-notification function
      const res = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channel: channels.length > 1 ? "both" : channels[0],
            to_email: channels.includes("email") ? to_email : null,
            to_phone: channels.includes("sms") ? to_phone : null,
            subject: rule.subject || "",
            body: rule.body || "",
            vars,
            account_id,
            rule_id: rule.id,
            recipient_type: "tenant",
            from_number: phoneRecord?.twilio_number,
          }),
        }
      );

      const result = await res.json();
      results.push({ rule_id: rule.id, ...result });

      // Update rule fire stats
      await supabase.from("automation_rules")
        .update({ last_fired_at: new Date().toISOString(), fire_count: (rule.fire_count || 0) + 1 })
        .eq("id", rule.id);
    }

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
