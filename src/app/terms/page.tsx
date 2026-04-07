export default function TermsPage() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      body: `By accessing or using iTenant, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the platform. These terms apply to all users including landlords, property managers, and tenants.`
    },
    {
      title: "2. Description of Service",
      body: `iTenant is a cloud-based property management software platform operated by Juan Rivera Jr (\"iTenant,\" \"we,\" \"us\"). The platform allows property owners and managers to manage properties, units, leases, tenants, maintenance requests, and payments.`
    },
    {
      title: "3. User Accounts",
      body: `You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. You must provide accurate and complete information when creating an account. iTenant reserves the right to terminate accounts that violate these terms.`
    },
    {
      title: "4. Subscription and Billing",
      body: `iTenant offers subscription plans on a monthly or annual basis. Your subscription renews automatically at the end of each billing period unless cancelled. You may cancel at any time through your account settings. No refunds are issued for partial billing periods. We reserve the right to change pricing with 30 days notice to your registered email.`
    },
    {
      title: "5. Data Cancellation and Retention",
      body: `Upon cancellation of your subscription, your data will be retained for 30 days to allow you to export your information. After 30 days, your data will be permanently deleted from our systems. We strongly recommend exporting your data before cancelling.`
    },
    {
      title: "6. Acceptable Use",
      body: `You agree not to use iTenant for any unlawful purpose, to violate any applicable laws or regulations, to harass or harm other users, to upload malicious code or content, or to interfere with the platform's operation. Violation of acceptable use may result in immediate account termination.`
    },
    {
      title: "7. Tenant Data",
      body: `As a property manager or landlord (\"Client\"), you are solely responsible for how you collect, use, and store tenant data through the platform. You represent that you have obtained all necessary consents from tenants for the collection and processing of their personal information. iTenant processes tenant data on your behalf as a data processor.`
    },
    {
      title: "8. Payment Processing",
      body: `Rent payments and subscription payments are processed by Stripe and Plaid, which are independent third-party payment processors. iTenant does not store full credit card numbers or bank account numbers. By using payment features, you also agree to Stripe's and Plaid's respective terms of service. iTenant is not liable for errors or failures of third-party payment processors.`
    },
    {
      title: "9. Limitation of Liability",
      body: `To the maximum extent permitted by law, iTenant's total liability to you for any claim arising from or related to these terms or your use of the platform shall not exceed the total subscription fees you paid to iTenant in the 30 days immediately preceding the claim. iTenant is not liable for indirect, incidental, special, or consequential damages.`
    },
    {
      title: "10. Disclaimer of Warranties",
      body: `The platform is provided \"as is\" and \"as available\" without warranties of any kind, either express or implied. iTenant does not warrant that the platform will be uninterrupted, error-free, or completely secure. We do not provide legal, financial, or tax advice through the platform.`
    },
    {
      title: "11. Governing Law",
      body: `These Terms of Service are governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law provisions. Any disputes arising under these terms shall be resolved in the courts of the State of Delaware.`
    },
    {
      title: "12. Changes to Terms",
      body: `We may update these Terms of Service from time to time. We will notify you of material changes via email to your registered address at least 30 days before the changes take effect. Your continued use of the platform after the effective date constitutes acceptance of the updated terms.`
    },
    {
      title: "13. Contact",
      body: `For questions about these Terms of Service, contact us at: jarivera43019@gmail.com. iTenant is operated by Juan Rivera Jr, registered in the State of Delaware.`
    },
  ];

  return (
    <main style={{ fontFamily: "system-ui", background: "#F4F3FF", minHeight: "100vh" }}>
      {/* NAV */}
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

      {/* CONTENT */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#1A1A2E", marginBottom: 8 }}>Terms of Service</h1>
          <p style={{ color: "#6B6B8A", fontSize: 15 }}>Last updated: April 2026 &nbsp;·&nbsp; Effective immediately for all users</p>
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
          <a href="/privacy" style={{ color: "#7C6FCD", textDecoration: "none", marginRight: 24 }}>Privacy Policy</a>
          <a href="/" style={{ color: "#7C6FCD", textDecoration: "none" }}>← Back to Home</a>
        </div>
      </div>

      <footer style={{ textAlign: "center", padding: "24px", borderTop: "1px solid #E2DEF9", color: "#9CA3AF", fontSize: 13, background: "#fff" }}>
        © 2026 iTenant. All rights reserved.
      </footer>
    </main>
  );
}
