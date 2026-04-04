import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Twilio sends form-encoded data
    const body = await req.text();
    const params = new URLSearchParams(body);

    const fromNumber = params.get("From") || "";
    const toNumber = params.get("To") || "";
    const messageBody = params.get("Body") || "";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up which account owns the toNumber
    const { data: phoneRecord } = await supabase
      .from("account_phone_numbers")
      .select("account_id")
      .eq("twilio_number", toNumber)
      .eq("status", "active")
      .maybeSingle();

    if (!phoneRecord) {
      // Unknown number - log and ignore
      console.log(`Unknown Twilio number: ${toNumber}`);
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Find tenant by phone number
    const { data: tenant } = await supabase
      .from("tenants")
      .select("tenant_id, first_name, last_name, user_id")
      .eq("account_id", phoneRecord.account_id)
      .eq("phone", fromNumber)
      .maybeSingle();

    // Log inbound SMS
    await supabase.from("communications_log").insert({
      account_id: phoneRecord.account_id,
      user_id: tenant?.user_id || null,
      channel: "sms",
      direction: "inbound",
      from_address: fromNumber,
      to_address: toNumber,
      body: messageBody,
      status: "received",
      linked_to_type: tenant ? "tenant" : null,
      linked_to_id: tenant?.tenant_id || null,
    });

    // If message looks like a work order request, create one automatically
    const isMaintenanceRequest = /leak|broken|fix|repair|not working|clog|heat|cold|smoke|smell/i.test(messageBody);

    let replyText = "";

    if (isMaintenanceRequest && tenant) {
      // Get tenant's unit
      const { data: tenantRecord } = await supabase
        .from("tenants")
        .select("unit_id")
        .eq("tenant_id", tenant.tenant_id)
        .maybeSingle();

      await supabase.from("work_orders").insert({
        account_id: phoneRecord.account_id,
        tenant_id: tenant.tenant_id,
        unit_id: tenantRecord?.unit_id || null,
        summary: messageBody,
        status: "new",
        urgency: "normal",
        category: "General",
        permission_to_enter: "yes",
      });

      replyText = `Hi ${tenant.first_name}, we received your maintenance request and created a work order. We'll be in touch within 24-48 hours. Reply STOP to unsubscribe.`;
    } else if (tenant) {
      replyText = `Hi ${tenant.first_name}, we received your message and will get back to you shortly. For urgent matters, please call us directly.`;
    } else {
      replyText = `We received your message. Please contact your property manager directly for assistance.`;
    }

    // Send auto-reply via TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyText}</Message>
</Response>`;

    return new Response(twiml, {
      headers: { "Content-Type": "text/xml" },
    });

  } catch (error) {
    console.error("Inbound SMS error:", error);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { "Content-Type": "text/xml" },
    });
  }
});
