import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: "Terms of Service – Harvest Bot",
  description: "Harvest Bot Terms of Service. The terms governing your use of Harvest Bot software and website.",
};

const Section = ({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) => (
  <div id={id} className="mb-8 md:mb-10 scroll-mt-24">
    <h2 className="text-lg md:text-xl font-bold text-white mb-4">{title}</h2>
    <div className="text-sm md:text-base text-neutral-400 leading-relaxed space-y-3">{children}</div>
  </div>
);

export default function TermsOfService() {
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
            <FileText className="w-4 h-4 text-[#23f8ff]" />
            <span className="text-sm font-semibold text-white">Terms of Service</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Title Section */}
        <div className="mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#23f8ff]/10 border border-[#23f8ff]/20 text-[#23f8ff] text-xs font-semibold mb-4">
            <FileText className="w-3.5 h-3.5" />
            Last Updated: June 16, 2026
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-neutral-400 text-sm md:text-base max-w-2xl">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of Harvest Bot software, website at harvestbot.app, and related services. By using Harvest Bot, you agree to be bound by these Terms.
          </p>
        </div>

        <div className="space-y-0">
          {/* 1. Acceptance of Terms */}
          <Section id="acceptance" title="1. Acceptance of Terms">
            <p>By downloading, installing, or using Harvest Bot, or by accessing our website, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree, you must not use the software or website.</p>
            <p>These Terms constitute a legally binding agreement between you (&ldquo;User&rdquo; or &ldquo;you&rdquo;) and Tanvir Hossen (&ldquo;Operator,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).</p>
          </Section>

          {/* 2. Eligibility */}
          <Section id="eligibility" title="2. Eligibility">
            <p>By using Harvest Bot, you represent and warrant that:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>You are at least 13 years of age (or the age of digital consent in your country, whichever is higher);</li>
              <li>You have the legal capacity to enter into binding contracts;</li>
              <li>You are not located in a country subject to international sanctions or trade embargoes;</li>
              <li>Your use of Harvest Bot does not violate any applicable laws or regulations, including Supercell&rsquo;s Terms of Service.</li>
            </ul>
          </Section>

          {/* 3. Account Registration */}
          <Section id="account-registration" title="3. Account Registration">
            <p>To access paid features of Harvest Bot, you must purchase a license key. A Discord account is required for community access, support, and license verification. You are solely responsible for maintaining the confidentiality of your license key and Discord credentials.</p>
            <p>You agree to provide accurate, current, and complete information during the purchase process and to update such information as necessary. License keys are non-transferable unless expressly authorized by us.</p>
          </Section>

          {/* 4. License Grant */}
          <Section id="license-grant" title="4. License Grant">
            <p>Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to download and use Harvest Bot on your personal device(s) for the duration of your subscription or in perpetuity for Lifetime licenses. This license is for personal, non-commercial use only.</p>
            <p>You may not:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>Distribute, sublicense, sell, rent, lease, or transfer Harvest Bot or your license key to any third party;</li>
              <li>Modify, decompile, disassemble, reverse engineer, or create derivative works based on Harvest Bot;</li>
              <li>Use Harvest Bot to violate any third-party terms of service, including Supercell&rsquo;s Terms of Service;</li>
              <li>Use Harvest Bot for any illegal or unauthorized purpose.</li>
            </ul>
          </Section>

          {/* 5. User Responsibilities */}
          <Section id="user-responsibilities" title="5. User Responsibilities">
            <p>As a user of Harvest Bot, you agree to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>Use the software in compliance with all applicable laws and regulations;</li>
              <li>Accept full responsibility for your Clash of Clans account and any actions taken by Harvest Bot on your behalf;</li>
              <li>Understand that using automation tools may violate Supercell&rsquo;s Terms of Service and may result in penalties or bans on your game account. We are not liable for such outcomes;</li>
              <li>Not attempt to circumvent license verification, security measures, or anti-detection systems;</li>
              <li>Not use the software in a manner that disrupts, damages, or impairs our services or infrastructure.</li>
            </ul>
          </Section>

          {/* 6. Prohibited Activities */}
          <Section id="prohibited-activities" title="6. Prohibited Activities">
            <p>You are expressly prohibited from engaging in the following activities:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>Using Harvest Bot with hacked, modified, or unauthorized game clients;</li>
              <li>Reselling, redistributing, or publicly sharing license keys;</li>
              <li>Using bots, scrapers, or other automated tools to access our website or API without authorization;</li>
              <li>Engaging in any activity that could damage, disable, overburden, or impair our servers or networks;</li>
              <li>Impersonating our staff, moderators, or representatives;</li>
              <li>Harassing, threatening, or abusing other users in our community.</li>
            </ul>
          </Section>

          {/* 7. Subscription and Billing */}
          <Section id="subscription-billing" title="7. Subscription and Billing">
            <p>Harvest Bot is offered on a paid license basis with the following plans: Weekly (7 days), Bi-Weekly (15 days), Monthly (30 days), and Lifetime. All payments are processed via cryptocurrency (USDT on TRX network, LTC) or Binance Pay.</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Payment Terms</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>All prices are listed in USD and are exclusive of any network transaction fees.</li>
              <li>Payment must be received in full before license activation.</li>
              <li>License periods begin at the time of payment verification by our system.</li>
              <li>We do not offer automatic renewals. To extend access, you must purchase a new license.</li>
              <li>We reserve the right to change pricing at any time. Changes will not affect already purchased licenses.</li>
            </ul>

            <h3 className="text-white font-semibold mt-5 mb-2">Taxes</h3>
            <p>You are responsible for any applicable taxes, duties, or transaction fees associated with your payment. Cryptocurrency network fees are your sole responsibility.</p>
          </Section>

          {/* 8. Refund Policy */}
          <Section id="refund-policy" title="8. Refund Policy">
            <p>Our refund policy is governed by the separate <Link href="/refund" className="text-[#23f8ff] hover:underline">Refund Policy</Link>, which is incorporated into these Terms by reference.</p>
          </Section>

          {/* 9. Intellectual Property */}
          <Section id="intellectual-property" title="9. Intellectual Property">
            <p>Harvest Bot, including its source code, design, branding, logos, user interface, and all related intellectual property, is owned exclusively by Tanvir Hossen. These Terms do not grant you any ownership or intellectual property rights in Harvest Bot.</p>
            <p>The Harvest Bot name and logo are our trademarks. You may not use them without our prior written permission. All other trademarks referenced (e.g., Clash of Clans, Supercell) are the property of their respective owners.</p>
          </Section>

          {/* 10. AI-Generated Content Disclaimer */}
          <Section id="ai-content" title="10. AI-Generated Content Disclaimer">
            <p>Harvest Bot uses algorithmic decision-making and pattern recognition to automate in-game actions, including base selection, troop deployment, and resource management. This functionality is provided on an &ldquo;as-is&rdquo; basis:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>We do not guarantee the accuracy, effectiveness, or profitability of automated decisions;</li>
              <li>The AI components may not always select optimal targets or avoid detection;</li>
              <li>We are not responsible for losses resulting from AI-driven actions, including resource loss, trophies lost, or account penalties;</li>
              <li>We continuously improve our algorithms but make no warranty regarding future performance or detection rates.</li>
            </ul>
          </Section>

          {/* 11. Service Availability */}
          <Section id="service-availability" title="11. Service Availability">
            <p>We strive to maintain high availability of Harvest Bot and our website. However, we do not guarantee uninterrupted or error-free operation. We may perform maintenance, updates, or modifications that temporarily affect service availability.</p>
            <p>We reserve the right to modify, suspend, or discontinue Harvest Bot (or any part thereof) at any time, with or without notice. We are not liable to you or any third party for any modification, suspension, or discontinuation.</p>
          </Section>

          {/* 12. Third-Party Services */}
          <Section id="third-party-services" title="12. Third-Party Services">
            <p>Harvest Bot integrates with or references third-party services, including Discord, GitHub, Binance, and Google AdSense. Your use of these services is governed by their respective terms and policies. We are not responsible for the content, functionality, or practices of any third-party service.</p>
            <p>Harvest Bot is an independent project and is not affiliated with, endorsed by, or sponsored by Supercell. &ldquo;Clash of Clans&rdquo; is a trademark of Supercell Oy.</p>
          </Section>

          {/* 13. Limitation of Liability */}
          <Section id="limitation-of-liability" title="13. Limitation of Liability">
            <p>To the maximum extent permitted by applicable law, in no event shall Tanvir Hossen, its operators, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of Harvest Bot, including but not limited to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>Loss of game progress, resources, or account access;</li>
              <li>Game account suspension or banning by Supercell;</li>
              <li>Loss of profits, data, or business opportunities;</li>
              <li>Damages resulting from service interruption, software bugs, or errors.</li>
            </ul>
            <p className="mt-3">Our total liability for any claim arising under these Terms shall not exceed the amount paid by you for the license giving rise to the claim. Some jurisdictions do not allow the exclusion or limitation of certain damages, so these limitations may not apply to you.</p>
          </Section>

          {/* 14. Disclaimer of Warranties */}
          <Section id="disclaimer-warranties" title="14. Disclaimer of Warranties">
            <p>Harvest Bot is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis, without any warranties of any kind, whether express, implied, or statutory. We expressly disclaim all implied warranties, including merchantability, fitness for a particular purpose, non-infringement, and course of dealing.</p>
            <p>We do not warrant that:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>Harvest Bot will meet your specific requirements or expectations;</li>
              <li>Harvest Bot will be uninterrupted, timely, secure, or error-free;</li>
              <li>The results obtained from using Harvest Bot will be accurate or reliable;</li>
              <li>Your use of Harvest Bot will not result in any action being taken against your game account by Supercell.</li>
            </ul>
          </Section>

          {/* 15. Indemnification */}
          <Section id="indemnification" title="15. Indemnification">
            <p>You agree to indemnify, defend, and hold harmless Tanvir Hossen, its operators, affiliates, and community moderators from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or relating to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>Your use or misuse of Harvest Bot;</li>
              <li>Your violation of these Terms;</li>
              <li>Your violation of any third-party rights, including Supercell&rsquo;s Terms of Service;</li>
              <li>Your violation of any applicable law or regulation.</li>
            </ul>
          </Section>

          {/* 16. Suspension and Termination */}
          <Section id="suspension-termination" title="16. Suspension and Termination">
            <p>We reserve the right to suspend or terminate your access to Harvest Bot at any time, without prior notice or liability, if:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>You breach any provision of these Terms;</li>
              <li>You engage in fraudulent, abusive, or illegal activity;</li>
              <li>We are required to do so by law;</li>
              <li>We decide to discontinue the service.</li>
            </ul>
            <p className="mt-3">Upon termination, your license key will be revoked, and you must cease all use of Harvest Bot and delete all copies. Termination does not relieve you of payment obligations incurred prior to termination. No refunds will be issued for terminated accounts, except as provided in our Refund Policy.</p>
          </Section>

          {/* 17. Governing Law */}
          <Section id="governing-law" title="17. Governing Law">
            <p>These Terms shall be governed by and construed in accordance with the laws of Bangladesh, without regard to its conflict of law principles. The United Nations Convention on Contracts for the International Sale of Goods does not apply to these Terms.</p>
          </Section>

          {/* 18. Dispute Resolution */}
          <Section id="dispute-resolution" title="18. Dispute Resolution">
            <h3 className="text-white font-semibold mt-5 mb-2">Informal Resolution</h3>
            <p>Before filing any formal proceeding, you agree to contact us at <a href="mailto:support@harvestbot.app" className="text-[#23f8ff] hover:underline">support@harvestbot.app</a> to attempt to resolve the dispute informally for a period of 30 days.</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Binding Arbitration</h3>
            <p>Any dispute arising from these Terms that cannot be resolved informally shall be resolved through binding arbitration in Dhaka, Bangladesh, in accordance with the rules of the Bangladesh International Arbitration Centre (BIAC). The arbitration shall be conducted in English by a single arbitrator. Each party shall bear its own costs and fees.</p>

            <h3 className="text-white font-semibold mt-5 mb-2">Class Action Waiver</h3>
            <p>All disputes shall be resolved on an individual basis. You waive any right to participate in a class action, consolidated action, or representative proceeding against us.</p>
          </Section>

          {/* 19. Changes to Terms */}
          <Section id="changes-to-terms" title="19. Changes to These Terms">
            <p>We may revise these Terms at any time by posting the updated version on this page. Material changes will take effect 14 days after posting. Non-material changes or changes required by law may take effect immediately. Your continued use of Harvest Bot after the effective date constitutes acceptance of the revised Terms.</p>
            <p>We encourage you to review these Terms periodically. The &ldquo;Last Updated&rdquo; date at the top of this page indicates when the most recent changes were made.</p>
          </Section>

          {/* 20. Severability */}
          <Section id="severability" title="20. Severability">
            <p>If any provision of these Terms is held to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect. The invalid provision shall be replaced with a valid provision that most closely reflects our original intent.</p>
          </Section>

          {/* 21. Entire Agreement */}
          <Section id="entire-agreement" title="21. Entire Agreement">
            <p>These Terms, together with our Privacy Policy and Refund Policy, constitute the entire agreement between you and Tanvir Hossen regarding your use of Harvest Bot, superseding any prior agreements or understandings.</p>
          </Section>

          {/* 22. Contact Information */}
          <Section id="contact" title="22. Contact Information">
            <p>If you have any questions about these Terms, please contact us:</p>
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
