export default function PrivacyPage() {
  const sections = [
    {
      title: "1. Who We Are",
      body: `iTenant is a property management software platform operated by Juan Rivera Jr, registered in the State of Delaware. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our platform.`
    },
    {
      title: "2. What Information We Collect",
      body: `We collect information you provide directly to us, including: your name, email address, phone number, business name, and mailing address when you create an account; property information including addresses, unit details, and financial data you enter into the platform; tenant information including names, contact details, lease terms, and payment history; payment information processed through Stripe and Plaid (we do not store full card numbers or bank account numbers); and usage data such as pages visited, features used, and actions taken within the platform.`
    },
    {
      title: "3. How We Use Your Information",
      body: `We use your information to provide and improve the iTenant platform; to process payments and manage subscriptions; to send you notifications, receipts, reminders, and updates related to your account; to provide customer support; to comply with legal obligations; and to analyze usage patterns to improve platform features. We do not sell your personal information to third parties.`
    },
    {
      title: "4. Payment Data — Stripe and Plaid",
      body: `Rent payments are processed by Stripe (card payments) and Plaid (ACH bank transfers). These are independent financial services companies with their own security and privacy standards. iTenant does not store full credit card numbers, bank account numbers, or routing numbers. When you connect a bank account through Plaid or make a card payment through Stripe, your financial credentials go directly to those processors — not to iTenant's servers. Plaid and Stripe are both SOC 2 Type II certified.`
    },
    {
      title: "5. Data Storage — Supabase",
      body: `Your account data, property records, tenant information, and document files are stored securely in Supabase, a cloud database provider. Supabase uses industry-standard encryption at rest (AES-256) and in transit (TLS). Supabase is SOC 2 Type II compliant. All data is stored in US-based data centers.`
    },
    {
      title: "6. SMS Communications",
      body: `If you or your tenants opt into SMS notifications, text messages will be sent through our platform's SMS service. Message and data rates may apply depending on your carrier. You may opt out at any time by replying STOP to any message. Messaging frequency varies based on your account activity and automation settings.`
    },
    {
      title: "7. Email Communications",
      body: `We send transactional emails for account-related activities such as payment confirmations, lease notifications, maintenance updates, and system alerts. These emails are sent through our email delivery provider using your account email. You may manage notification preferences in your account Settings under Notifications.`
    },
    {
      title: "8. Information Sharing",
      body: `We do not sell your personal information. We share information only with: Stripe and Plaid for payment processing; Supabase for data storage; our email and SMS delivery providers for sending notifications; and law enforcement or government authorities when required by law. All service providers are contractually required to protect your information and use it only for the services they provide to us.`
    },
    {
      title: "9. Tenant Data",
      body: `If you are a property manager or landlord using iTenant, you are responsible for the tenant data you collect and store through our platform. You must obtain all legally required consents from your tenants for data collection. iTenant processes tenant data on your behalf and does not use tenant data for any purpose other than providing the platform to you.`
    },
    {
      title: "10. Data Retention",
      body: `We retain your account data for as long as your account is active. If you cancel your subscription, your data is retained for 30 days to allow you to export it. After 30 days, your data is permanently deleted from our systems. You may request data export at any time through Settings → Account → Export Account Data.`
    },
    {
      title: "11. Your Rights",
      body: `You have the right to access the personal information we hold about you; to correct inaccurate information; to request deletion of your information (subject to legal retention requirements); to export your data in a portable format; and to opt out of non-essential communications. To exercise any of these rights, contact us at jarivera43019@gmail.com.`
    },
    {
      title: "12. Cookies",
      body: `iTenant uses cookies for session management and authentication only. We do not use third-party advertising cookies or tracking pixels. You can control cookie settings through your browser, but disabling session cookies may prevent you from logging in to the platform.`
    },
    {
      title: "13. Children's Privacy",
      body: `iTenant is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from anyone under 18. If we become aware that a child under 18 has provided us with personal information, we will delete it promptly.`
    },
    {
      title: "14. Changes to This Policy",
      body: `We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of material changes via email to your registered address. The updated policy will be effective upon posting.`
    },
    {
      title: "15. Contact Us",
      body: `If you have questions, concerns, or requests regarding this Privacy Policy or how we handle your data, please contact us at: jarivera43019@gmail.com. We will respond to all requests within 5 business days.`
    },
  ];

  return (
    <main style={{ fontFamily: "system-ui", background: "#F4F3FF", minHeight: "100vh" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 40px", background: "#fff", borderBottom: "1px solid #E2DEF9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#7C6FCD", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>i</span>
          </div>
          <a href="/" style={{ fontWeight: 800, fontSize: 20, color: "#1A1A2E", textDecoration: "none" }}>
            i<span style={{ color: "#7C6FCD" }}>Tenant</span>
          </a>
        </div>
        <a href="/login" style={{ padding: "8px 20px", borderRadius: 10, background: "#7C6FCD", color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>Sign In</a>
      </nav>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#1A1A2E", marginBottom: 8 }}>Privacy Policy</h1>
          <p style={{ color: "#6B6B8A", fontSize: 15 }}>Last updated: April 2026 &nbsp;·&nbsp; Your privacy matters to us.</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #E2DEF9", padding: "40px 48px" }}>
          {sections.map(s => (
            <div key={s.title} style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "#3D2FA0", marginBottom: 10 }}>{s.title}</h2>
              <p style={{ fontSize: 15, color: "#444", lineHeight: 1.75 }}>{s.body}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 40, color: "#9CA3AF", fontSize: 13 }}>
          <a href="/terms" style={{ color: "#7C6FCD", textDecoration: "none", marginRight: 24 }}>Terms of Service</a>
          <a href="/" style={{ color: "#7C6FCD", textDecoration: "none" }}>← Back to Home</a>
        </div>
      </div>

      <footer style={{ textAlign: "center", padding: "24px", borderTop: "1px solid #E2DEF9", color: "#9CA3AF", fontSize: 13, background: "#fff" }}>
        © 2026 iTenant. All rights reserved.
      </footer>
    </main>
  );
}
