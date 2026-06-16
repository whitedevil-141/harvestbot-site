import React from 'react';
import { RotateCcw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: "Refund Policy – Harvest Bot",
  description: "Harvest Bot Refund Policy. Learn about our 24-hour refund window and eligibility requirements.",
};

const Section = ({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) => (
  <div id={id} className="mb-8 md:mb-10 scroll-mt-24">
    <h2 className="text-lg md:text-xl font-bold text-white mb-4">{title}</h2>
    <div className="text-sm md:text-base text-neutral-400 leading-relaxed space-y-3">{children}</div>
  </div>
);

export default function RefundPolicy() {
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
            <RotateCcw className="w-4 h-4 text-[#23f8ff]" />
            <span className="text-sm font-semibold text-white">Refund Policy</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Title Section */}
        <div className="mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#23f8ff]/10 border border-[#23f8ff]/20 text-[#23f8ff] text-xs font-semibold mb-4">
            <RotateCcw className="w-3.5 h-3.5" />
            Last Updated: June 16, 2026
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Refund Policy
          </h1>
          <p className="text-neutral-400 text-sm md:text-base max-w-2xl">
            This Refund Policy (&ldquo;Policy&rdquo;) outlines the terms under which Tanvir Hossen (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) issues refunds for Harvest Bot license purchases. By purchasing a license, you agree to the terms of this Policy.
          </p>
        </div>

        <div className="space-y-0">
          {/* Policy Summary */}
          <div className="mb-10 p-4 md:p-6 rounded-xl bg-white/3 border border-white/5">
            <h2 className="text-base font-bold text-white mb-2">Policy Summary</h2>
            <p className="text-sm text-neutral-400">
              We offer a <strong className="text-white">24-hour refund window</strong> from the time your payment is verified and your license key is activated. Refund requests must be submitted within this period and must meet the eligibility criteria below.
            </p>
          </div>

          {/* 1. Subscription Refund Eligibility */}
          <Section id="refund-eligibility" title="1. Subscription Refund Eligibility">
            <p>You may request a full refund within 24 hours of payment verification if any of the following apply:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>The license key fails to activate or function as described;</li>
              <li>The software is incompatible with your system and we are unable to resolve the issue through support;</li>
              <li>A technical error on our side prevents you from accessing the software;</li>
              <li>You mistakenly purchased the wrong plan and have not used the software.</li>
            </ul>
            <p className="mt-3">Refund eligibility is assessed on a case-by-case basis. We reserve the right to deny refund requests that do not meet these criteria.</p>
          </Section>

          {/* 2. Trial Period Refund Rules */}
          <Section id="trial-period" title="2. Trial Period">
            <p>Harvest Bot does not currently offer a free trial period. All licenses are paid upfront before access is granted. This Policy serves as your buyer protection in lieu of a trial.</p>
          </Section>

          {/* 3. Non-Refundable Situations */}
          <Section id="non-refundable" title="3. Non-Refundable Situations">
            <p>Refund requests will <strong className="text-white">not</strong> be granted in the following situations:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>Requests submitted after the 24-hour refund window has expired;</li>
              <li>Change of mind after the license has been activated and used;</li>
              <li>Game account suspension or banning by Supercell resulting from the use of Harvest Bot;</li>
              <li>Dissatisfaction with in-game results (e.g., loot earnings, trophy gains) when the software functions as intended;</li>
              <li>Issues caused by user error, including incorrect installation, failure to follow setup instructions, or incompatibility with unsupported system configurations;</li>
              <li>Violation of our Terms of Service resulting in license revocation;</li>
              <li>Loss or theft of license key after activation;</li>
              <li>Cryptocurrency network transaction fees, delays, or failed transfers due to user-provided incorrect wallet addresses.</li>
            </ul>
          </Section>

          {/* 4. Duplicate Charges */}
          <Section id="duplicate-charges" title="4. Duplicate Charges">
            <p>If you believe you have been charged twice for the same license plan within a short period, please contact us immediately at <a href="mailto:support@harvestbot.app" className="text-[#23f8ff] hover:underline">support@harvestbot.app</a> with your transaction IDs. We will investigate and, upon confirmation of a duplicate charge, issue a full refund for the duplicate payment.</p>
          </Section>

          {/* 5. Unauthorized Payments */}
          <Section id="unauthorized-payments" title="5. Unauthorized Payments">
            <p>If you suspect that a payment was made without your authorization, please contact us immediately. We will investigate the transaction and, if confirmed as unauthorized, refund the payment in full. You should also contact Binance support or your cryptocurrency wallet provider as applicable.</p>
            <p className="mt-2">To help us process your claim, please provide the transaction ID, wallet address used, approximate amount, date, and time of payment.</p>
          </Section>

          {/* 6. Service Interruptions */}
          <Section id="service-interruptions" title="6. Service Interruptions">
            <p>We strive to maintain continuous service, but occasional interruptions may occur due to maintenance, updates, or unforeseen technical issues.</p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li><strong className="text-white">Planned Maintenance:</strong> Notified in advance via our Discord server. No refunds will be issued for planned downtime.</li>
              <li><strong className="text-white">Unplanned Outages:</strong> If an outage exceeds 48 consecutive hours and you are unable to use Harvest Bot, you may request a refund or license extension proportional to the downtime.</li>
              <li><strong className="text-white">Permanent Discontinuation:</strong> If we permanently discontinue Harvest Bot, you will receive a prorated refund for the unused portion of your license (excluding Lifetime licenses, which are sold as-is).</li>
            </ul>
          </Section>

          {/* 7. Account Cancellation */}
          <Section id="account-cancellation" title="7. Account Cancellation">
            <p>Since Harvest Bot does not employ automatic recurring billing, there is no cancellation process for ongoing subscriptions. Your license will naturally expire at the end of its term (7, 15, or 30 days depending on your plan). Lifetime licenses do not expire.</p>
            <p>To cancel the use of your license before its expiry, you may simply stop using the software. No refunds will be issued for voluntary early cancellation unless you are within the 24-hour refund window.</p>
          </Section>

          {/* 8. Lifetime Licenses */}
          <Section id="lifetime-licenses" title="8. Lifetime Licenses">
            <p>Lifetime licenses are sold with the understanding that the product will continue to function for the foreseeable future, subject to these Terms. Given the nature of the game automation market, we cannot guarantee that Harvest Bot will work indefinitely (e.g., if Supercell permanently blocks the software or changes game architecture). Lifetime license purchases are final and non-refundable except within the 24-hour refund window for technical issues.</p>
          </Section>

          {/* 9. Refund Processing Time */}
          <Section id="processing-time" title="9. Refund Processing Time">
            <p>Approved refunds will be processed within 5&ndash;10 business days. Refunds are issued using the same payment method used for the original purchase:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li><strong className="text-white">Binance Pay payments:</strong> Refunded to your Binance account.</li>
              <li><strong className="text-white">Cryptocurrency payments (USDT/LTC):</strong> Refunded to the original sending wallet address. Please note that cryptocurrency network fees are non-refundable and will be deducted from the refund amount.</li>
            </ul>
            <p className="mt-3">Refunds are processed in the original currency (USD equivalent at the time of refund). We are not responsible for changes in cryptocurrency exchange rates between the purchase and refund date.</p>
          </Section>

          {/* 10. Chargebacks */}
          <Section id="chargebacks" title="10. Chargebacks">
            <p>Filing a chargeback or payment dispute through Binance or your cryptocurrency provider without first contacting us may result in:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>Immediate suspension and permanent revocation of your license key;</li>
              <li>Permanent ban from purchasing future licenses;</li>
              <li>A ban from our Discord community.</li>
            </ul>
            <p className="mt-3">If you have a legitimate issue, please contact us first at <a href="mailto:support@harvestbot.app" className="text-[#23f8ff] hover:underline">support@harvestbot.app</a>. We will work with you to resolve the matter before any dispute is filed.</p>
          </Section>

          {/* 11. How to Request a Refund */}
          <Section id="how-to-request" title="11. How to Request a Refund">
            <p>To submit a refund request, please contact us with the following information:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>Your Discord username (if applicable);</li>
              <li>The license key or transaction ID;</li>
              <li>The payment method used (Binance Pay, USDT, or LTC);</li>
              <li>The date and approximate time of payment;</li>
              <li>A detailed explanation of the issue or reason for the refund request.</li>
            </ul>
            <p className="mt-3">Contact us through the following channels:</p>
            <div className="bg-white/3 border border-white/5 rounded-xl p-4 md:p-6 mt-4 space-y-2 text-neutral-400 text-sm">
              <p><strong className="text-white">Email:</strong> <a href="mailto:support@harvestbot.app" className="text-[#23f8ff] hover:underline">support@harvestbot.app</a></p>
              <p><strong className="text-white">Discord:</strong> <a href="https://discord.com/invite/ymj4rEHpEV" className="text-[#23f8ff] hover:underline" target="_blank" rel="noopener noreferrer">Join our Discord Server</a> and open a support ticket</p>
            </div>
            <p className="mt-4">We will acknowledge your request within 24&ndash;48 hours and process it within 5&ndash;10 business days.</p>
          </Section>

          {/* 12. Changes to This Policy */}
          <Section id="changes" title="12. Changes to This Refund Policy">
            <p>We reserve the right to modify this Refund Policy at any time. Changes will be posted on this page with an updated effective date. For existing purchases, the policy in effect at the time of purchase will apply. Your continued use of Harvest Bot after changes constitutes acceptance of the revised Policy.</p>
          </Section>

          {/* 13. Contact Information */}
          <Section id="contact" title="13. Contact Information">
            <p>If you have any questions about this Refund Policy, please contact us:</p>
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
