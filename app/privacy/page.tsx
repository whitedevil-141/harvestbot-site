import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: "Privacy Policy – Harvest Bot",
  description: "Harvest Bot Privacy Policy. Learn how we collect, use, and protect your personal information.",
};

const Section = ({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) => (
  <div id={id} className="mb-8 md:mb-10 scroll-mt-24">
    <h2 className="text-lg md:text-xl font-bold text-white mb-4">{title}</h2>
    <div className="text-sm md:text-base text-neutral-400 leading-relaxed space-y-3">{children}</div>
  </div>
);

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#030712] text-white">
      {/* Header */}
      <header className="relative border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-neutral-400 hover:text-[#23f8ff] transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#23f8ff]" />
            <span className="text-sm font-semibold text-white">Privacy Policy</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Title Section */}
        <div className="mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#23f8ff]/10 border border-[#23f8ff]/20 text-[#23f8ff] text-xs font-semibold mb-4">
            <Shield className="w-3.5 h-3.5" />
            Last Updated: June 16, 2026
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-neutral-400 text-sm md:text-base max-w-2xl">
            This Privacy Policy explains how Tanvir Hossen (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, and protects your personal information when you use Harvest Bot and visit harvestbot.app.
          </p>
        </div>

        <div className="space-y-0">
          {/* 1. Information We Collect */}
          <Section id="information-we-collect" title="1. Information We Collect">
            <p>We collect information you provide directly to us and information generated automatically through your use of our software and website.</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Account Information</h3>
            <p>When you purchase a license key, join our Discord server, or contact support, we may collect your Discord username, email address, transaction identifiers, and any other information you voluntarily provide.</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Usage Data</h3>
            <p>We may automatically collect information about how you interact with Harvest Bot, including license key activation times, feature usage, session duration, and in-game statistics (such as resources farmed, walls upgraded, and runtime). This data is aggregated and anonymized where possible.</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Device Information</h3>
            <p>We may collect information about the device running Harvest Bot, including operating system version, hardware identifiers, IP address, and screen resolution. This helps us optimize performance and detect unauthorized use.</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Payment Information</h3>
            <p>All payments are processed through third-party providers (Binance Pay, cryptocurrency networks). We do not directly collect, store, or process credit card or bank details. We may record transaction IDs, wallet addresses, payment amounts, and plan details for license fulfillment and accounting purposes.</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Cookies and Tracking Technologies</h3>
            <p>Our website uses cookies and similar tracking technologies (including Google AdSense) to improve user experience, analyze traffic, and serve relevant advertisements. You can control cookie preferences through your browser settings. See our Cookies Policy below for more details.</p>
          </Section>

          {/* 2. How We Use Your Information */}
          <Section id="how-we-use-information" title="2. How We Use Your Information">
            <p>We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li><strong className="text-white">Service Delivery:</strong> To activate and validate license keys, authenticate users, and deliver the Harvest Bot software and its features.</li>
              <li><strong className="text-white">Account Management:</strong> To manage your license, process renewals, and communicate regarding your subscription status.</li>
              <li><strong className="text-white">Security:</strong> To detect and prevent unauthorized access, fraud, abuse, or violation of our Terms of Service.</li>
              <li><strong className="text-white">Analytics:</strong> To analyze usage patterns and improve the performance, features, and user experience of Harvest Bot.</li>
              <li><strong className="text-white">Customer Support:</strong> To respond to your inquiries, troubleshoot issues, and provide technical assistance via Discord or email.</li>
              <li><strong className="text-white">Product Improvements:</strong> To develop new features, optimize automation algorithms, and enhance anti-detection systems.</li>
              <li><strong className="text-white">Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes.</li>
            </ul>
          </Section>

          {/* 3. Legal Basis for Processing (GDPR) */}
          <Section id="legal-basis" title="3. Legal Basis for Processing (GDPR)">
            <p>If you are located in the European Economic Area (EEA) or the United Kingdom, our processing of your personal data is based on the following lawful grounds:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li><strong className="text-white">Contract Performance:</strong> Processing necessary to fulfill our obligation to provide Harvest Bot services under our Terms of Service.</li>
              <li><strong className="text-white">Legitimate Interests:</strong> Processing for security, analytics, and product improvement, where our interests do not override your fundamental rights.</li>
              <li><strong className="text-white">Consent:</strong> Processing based on your explicit consent for cookies and marketing communications, which you may withdraw at any time.</li>
              <li><strong className="text-white">Legal Obligation:</strong> Processing required to comply with applicable legal or regulatory obligations.</li>
            </ul>
          </Section>

          {/* 4. Data Sharing */}
          <Section id="data-sharing" title="4. Data Sharing">
            <p>We do not sell your personal information. We may share your data only in the following circumstances:</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Service Providers</h3>
            <p>We engage trusted third-party service providers who assist in operating our business, including hosting providers (Vercel, Cloudflare), payment processors (Binance), analytics services (Google Analytics via AdSense), and communication platforms (Discord). These providers are contractually bound to protect your data and may only process it for specified purposes.</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Legal Compliance</h3>
            <p>We may disclose your information if required by law, subpoena, or other legal process, or if we believe in good faith that disclosure is necessary to protect our rights, your safety, or the safety of others.</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Business Transfers</h3>
            <p>In the event of a merger, acquisition, reorganization, or sale of assets, your information may be transferred as part of that transaction. We will notify you of any such change in ownership or control.</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Aggregated Data</h3>
            <p>We may share anonymized, aggregated statistics (e.g., total resources farmed, active user counts) publicly, such as on our website or marketing materials. This data cannot be used to identify you.</p>
          </Section>

          {/* 5. Data Retention */}
          <Section id="data-retention" title="5. Data Retention">
            <p>We retain your personal information for as long as your license is active and for a reasonable period thereafter (typically up to 12 months after your last interaction) to comply with legal obligations, resolve disputes, and enforce our agreements. Usage analytics and aggregated statistics may be retained indefinitely in anonymized form.</p>
            <p>When we no longer have a legitimate business need to process your information, we will delete or anonymize it securely.</p>
          </Section>

          {/* 6. Data Security */}
          <Section id="data-security" title="6. Data Security">
            <p>We implement industry-standard technical and organizational security measures to protect your data, including:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>Encryption of data in transit via TLS/SSL protocols</li>
              <li>Secure API endpoints with authentication and rate limiting</li>
              <li>Access controls limiting employee and contractor access to personal data</li>
              <li>Regular security reviews and updates</li>
            </ul>
            <p className="mt-3">No method of electronic storage or transmission is 100% secure. While we strive to protect your information, we cannot guarantee absolute security. You are responsible for safeguarding your license key and Discord account credentials.</p>
          </Section>

          {/* 7. Your Rights */}
          <Section id="your-rights" title="7. Your Rights">
            <p>Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Access</h3>
            <p>You may request a copy of the personal data we hold about you.</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Correction</h3>
            <p>You may request that we correct any inaccurate or incomplete data.</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Deletion</h3>
            <p>You may request that we delete your personal data, subject to certain legal exceptions (e.g., ongoing legal obligations).</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Data Portability</h3>
            <p>You may request a structured, machine-readable copy of your data for transfer to another service provider.</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Restriction and Objection</h3>
            <p>You may restrict or object to our processing of your data where it is based on legitimate interests or for direct marketing purposes.</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Withdraw Consent</h3>
            <p>Where processing is based on consent, you may withdraw it at any time without affecting the lawfulness of prior processing.</p>

            <p className="mt-4">To exercise any of these rights, contact us at <a href="mailto:support@harvestbot.app" className="text-[#23f8ff] hover:underline">support@harvestbot.app</a>. We will respond within 30 days. If you are in the EEA or UK, you also have the right to lodge a complaint with your local data protection authority.</p>
          </Section>

          {/* 8. International Data Transfers */}
          <Section id="international-transfers" title="8. International Data Transfers">
            <p>Your information may be transferred to and processed in countries other than your own, including Bangladesh (where we are based) and the United States (where our hosting and service providers are located). These countries may have data protection laws different from those in your jurisdiction.</p>
            <p>For users in the EEA or UK, we ensure adequate safeguards are in place through Standard Contractual Clauses (SCCs) or other approved transfer mechanisms. By using Harvest Bot, you consent to the transfer of your data to countries that may not provide the same level of data protection as your home country.</p>
          </Section>

          {/* 9. Children's Privacy */}
          <Section id="childrens-privacy" title="9. Children's Privacy">
            <p>Harvest Bot is not intended for individuals under the age of 13 (or 16 in the EEA/UK). We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal data, we will delete it immediately. If you believe a child has provided us with their data, please contact us at <a href="mailto:support@harvestbot.app" className="text-[#23f8ff] hover:underline">support@harvestbot.app</a>.</p>
          </Section>

          {/* 10. Cookies Policy */}
          <Section id="cookies-policy" title="10. Cookies Policy">
            <p>Our website uses cookies and similar technologies to enhance functionality, analyze usage, and serve targeted advertisements.</p>

            <h3 className="text-white font-semibold mt-5 mb-2">What Are Cookies?</h3>
            <p>Cookies are small text files stored on your device by your web browser. They help us remember your preferences and understand how you interact with our site.</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Types of Cookies We Use</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li><strong className="text-white">Essential Cookies:</strong> Required for the website to function properly (e.g., session management, security).</li>
              <li><strong className="text-white">Analytics Cookies:</strong> Help us understand how visitors use our site (e.g., page views, click patterns). We use Google Analytics through Google AdSense.</li>
              <li><strong className="text-white">Advertising Cookies:</strong> Google AdSense uses cookies to serve relevant ads based on your browsing history and interests.</li>
            </ul>

            <h3 className="text-white font-semibold mt-5 mb-2">Managing Cookies</h3>
            <p>You can control cookies through your browser settings. You may also opt out of Google personalized advertising by visiting <a href="https://adssettings.google.com" className="text-[#23f8ff] hover:underline" target="_blank" rel="noopener noreferrer">Google Ad Settings</a>. Note that disabling certain cookies may affect website functionality.</p>
          </Section>

          {/* 11. Third-Party Links */}
          <Section id="third-party-links" title="11. Third-Party Links">
            <p>Our website and software may contain links to third-party services (Discord, YouTube, Binance, etc.). We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing them with your information.</p>
          </Section>

          {/* 12. Changes to Privacy Policy */}
          <Section id="changes-to-privacy-policy" title="12. Changes to This Privacy Policy">
            <p>We may update this Privacy Policy from time to time. Material changes will be communicated by posting the updated policy on this page and, where appropriate, by notifying you via Discord or email. The &ldquo;Last Updated&rdquo; date at the top of this page reflects the most recent revision. Your continued use of Harvest Bot after changes constitutes acceptance of the updated policy.</p>
          </Section>

          {/* 13. Contact Information */}
          <Section id="contact" title="13. Contact Information">
            <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
            <div className="bg-white/3 border border-white/5 rounded-xl p-4 md:p-6 mt-4 space-y-2 text-neutral-400 text-sm">
              <p><strong className="text-white">Operator:</strong> Tanvir Hossen</p>
              <p><strong className="text-white">Email:</strong> <a href="mailto:support@harvestbot.app" className="text-[#23f8ff] hover:underline">support@harvestbot.app</a></p>
              <p><strong className="text-white">Website:</strong> <a href="https://harvestbot.app" className="text-[#23f8ff] hover:underline">https://harvestbot.app</a></p>
              <p><strong className="text-white">Discord:</strong> <a href="https://discord.com/invite/ymj4rEHpEV" className="text-[#23f8ff] hover:underline" target="_blank" rel="noopener noreferrer">Join our Discord Server</a></p>
              <p><strong className="text-white">Address:</strong> Gazipur, Dhaka, Bangladesh 1751</p>
            </div>
          </Section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-neutral-600">&copy; {new Date().getFullYear()} Harvest Bot. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-neutral-600">
            <Link href="/terms" className="hover:text-neutral-400 transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-neutral-400 transition-colors">Privacy Policy</Link>
            <Link href="/refund" className="hover:text-neutral-400 transition-colors">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
