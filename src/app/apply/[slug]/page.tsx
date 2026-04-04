"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type PropertyInfo = { property_id: string; account_id: string; nickname: string | null; address: string; city: string; state: string; };

const inputClass = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>{children}</div>;
}

export default function ApplyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState("");
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", dob: "", current_address: "",
    current_landlord: "", current_landlord_phone: "", current_rent: "",
    employer: "", job_title: "", employment_type: "full_time", monthly_income: "", years_employed: "",
    occupants: "1", move_in_date_requested: "", pets: false as boolean, pet_description: "",
    background_check_consent: false as boolean, additional_notes: "",
  });

  function set(k: string, v: string | boolean) { setForm(p => ({ ...p, [k]: v })); }

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("properties").select("property_id,account_id,nickname,address,city,state").eq("apply_slug", slug).eq("accepting_applications", true).maybeSingle();
      if (error || !data) { setErr("This application link is not active or does not exist."); setLoading(false); return; }
      setProperty(data); setLoading(false);
    })();
  }, [slug]);

  async function submit() {
    if (!form.first_name || !form.last_name || !form.email) { setErr("Please fill in all required fields."); return; }
    if (!form.background_check_consent) { setErr("You must consent to a background check to apply."); return; }
    setSubmitting(true); setErr("");
    const { error } = await supabase.from("rental_applications").insert({
      account_id: property!.account_id, property_id: property!.property_id,
      first_name: form.first_name.trim(), last_name: form.last_name.trim(),
      email: form.email.trim().toLowerCase(), phone: form.phone || null,
      dob: form.dob || null, current_address: form.current_address || null,
      current_landlord: form.current_landlord || null, current_landlord_phone: form.current_landlord_phone || null,
      current_rent: form.current_rent ? parseFloat(form.current_rent) : null,
      employer: form.employer || null, job_title: form.job_title || null,
      employment_type: form.employment_type, monthly_income: form.monthly_income ? parseFloat(form.monthly_income) : null,
      years_employed: form.years_employed ? parseFloat(form.years_employed) : null,
      occupants: parseInt(form.occupants), move_in_date_requested: form.move_in_date_requested || null,
      pets: form.pets ? { has_pets: true, description: form.pet_description } : { has_pets: false },
      background_check_consent: form.background_check_consent,
      additional_notes: form.additional_notes || null, source: "itenant_form",
    });
    if (error) { setErr(error.message); setSubmitting(false); return; }
    setSubmitted(true);
  }

  if (loading) return <main className="min-h-screen bg-[#f5f6fa] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></main>;
  if (err && !property) return <main className="min-h-screen bg-[#f5f6fa] flex items-center justify-center px-4"><div className="bg-white rounded-2xl border border-neutral-200 p-8 max-w-sm w-full text-center shadow-sm"><div className="text-4xl mb-3">🔒</div><h1 className="text-xl font-bold text-neutral-900">Not Available</h1><p className="text-neutral-500 text-sm mt-2">{err}</p></div></main>;
  if (submitted) return (
    <main className="min-h-screen bg-[#f5f6fa] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-neutral-200 p-10 max-w-sm w-full text-center shadow-sm">
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 mx-auto mb-4"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg></div>
        <h1 className="text-2xl font-bold text-neutral-900">Application Submitted!</h1>
        <p className="text-neutral-500 text-sm mt-2">Thank you, {form.first_name}. Your application for <strong>{property?.nickname || property?.address}</strong> has been received. The property manager will be in touch soon.</p>
      </div>
    </main>
  );

  const steps = ["Personal Info", "Current Housing", "Employment", "Final Details"];

  return (
    <main className="min-h-screen bg-[#f5f6fa] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4"><div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22V12h6v10" /><path d="M8 7h.01M12 7h.01M16 7h.01" /></svg></div><span className="font-bold text-neutral-900 text-lg">iTenant</span></div>
          <h1 className="text-3xl font-bold text-neutral-900">Rental Application</h1>
          <p className="text-neutral-500 mt-1">{property?.nickname || property?.address}, {property?.city}, {property?.state}</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step > i + 1 ? "bg-green-500 text-white" : step === i + 1 ? "bg-blue-600 text-white" : "bg-neutral-200 text-neutral-500"}`}>{step > i + 1 ? "✓" : i + 1}</div>
              {i < steps.length - 1 && <div className={`w-8 h-0.5 ${step > i + 1 ? "bg-green-500" : "bg-neutral-200"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50"><h2 className="text-sm font-bold text-neutral-700">{steps[step - 1]}</h2></div>

          <div className="px-6 py-5">
            {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">{err}</div>}

            {step === 1 && (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3"><Field label="First Name" required><input className={inputClass} value={form.first_name} onChange={e => set("first_name", e.target.value)} /></Field><Field label="Last Name" required><input className={inputClass} value={form.last_name} onChange={e => set("last_name", e.target.value)} /></Field></div>
                <Field label="Email Address" required><input type="email" className={inputClass} value={form.email} onChange={e => set("email", e.target.value)} /></Field>
                <Field label="Phone Number"><input type="tel" className={inputClass} value={form.phone} onChange={e => set("phone", e.target.value)} /></Field>
                <Field label="Date of Birth"><input type="date" className={inputClass} value={form.dob} onChange={e => set("dob", e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-3"><Field label="Desired Move-in Date"><input type="date" className={inputClass} value={form.move_in_date_requested} onChange={e => set("move_in_date_requested", e.target.value)} /></Field><Field label="Number of Occupants"><input type="number" min="1" className={inputClass} value={form.occupants} onChange={e => set("occupants", e.target.value)} /></Field></div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4">
                <Field label="Current Address"><input className={inputClass} placeholder="Street, City, State" value={form.current_address} onChange={e => set("current_address", e.target.value)} /></Field>
                <Field label="Current Monthly Rent"><input type="number" className={inputClass} placeholder="0.00" value={form.current_rent} onChange={e => set("current_rent", e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-3"><Field label="Current Landlord Name"><input className={inputClass} value={form.current_landlord} onChange={e => set("current_landlord", e.target.value)} /></Field><Field label="Landlord Phone"><input type="tel" className={inputClass} value={form.current_landlord_phone} onChange={e => set("current_landlord_phone", e.target.value)} /></Field></div>
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
                  <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.pets as boolean} onChange={e => set("pets", e.target.checked)} className="rounded" /><span className="text-sm font-medium text-neutral-900">I have pets</span></label>
                  {form.pets && <textarea className={inputClass + " mt-3 resize-none"} rows={2} placeholder="Describe your pets (type, breed, weight)..." value={form.pet_description} onChange={e => set("pet_description", e.target.value)} />}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-4">
                <Field label="Employer"><input className={inputClass} value={form.employer} onChange={e => set("employer", e.target.value)} /></Field>
                <Field label="Job Title"><input className={inputClass} value={form.job_title} onChange={e => set("job_title", e.target.value)} /></Field>
                <Field label="Employment Type"><select className={inputClass + " cursor-pointer"} value={form.employment_type} onChange={e => set("employment_type", e.target.value)}><option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="self_employed">Self-employed</option><option value="contract">Contract</option><option value="retired">Retired</option><option value="other">Other</option></select></Field>
                <div className="grid grid-cols-2 gap-3"><Field label="Monthly Income ($)"><input type="number" className={inputClass} placeholder="0.00" value={form.monthly_income} onChange={e => set("monthly_income", e.target.value)} /></Field><Field label="Years at Job"><input type="number" step="0.5" className={inputClass} placeholder="0" value={form.years_employed} onChange={e => set("years_employed", e.target.value)} /></Field></div>
              </div>
            )}

            {step === 4 && (
              <div className="grid gap-4">
                <Field label="Additional Notes (optional)"><textarea className={inputClass + " resize-none"} rows={3} placeholder="Anything else you'd like us to know..." value={form.additional_notes} onChange={e => set("additional_notes", e.target.value)} /></Field>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.background_check_consent as boolean} onChange={e => set("background_check_consent", e.target.checked)} className="rounded mt-0.5 shrink-0" />
                    <span className="text-xs text-blue-800"><strong>Background & Credit Check Consent *</strong><br />I consent to a background check, credit check, and verification of employment and rental history as part of this application. I understand this may include a soft or hard credit inquiry.</span>
                  </label>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-xs text-neutral-500">By submitting this application, I certify that all information provided is true and accurate. Falsification of any information may result in immediate denial or termination of tenancy.</div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
            <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="border border-neutral-200 bg-white text-neutral-700 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-neutral-50">Back</button>
            {step < 4 ? (
              <button onClick={() => { setErr(""); setStep(s => s + 1); }} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700">Continue</button>
            ) : (
              <button onClick={submit} disabled={submitting || !(form.background_check_consent as boolean)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">{submitting ? "Submitting..." : "Submit Application"}</button>
            )}
          </div>
        </div>
        <p className="text-xs text-neutral-400 text-center mt-4">Powered by iTenant · Your data is encrypted and secure</p>
      </div>
    </main>
  );
}
