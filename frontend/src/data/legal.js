// Legal content for Wages of War Casino. [Registered Address] left as placeholder intentionally.
const OP = "Wages of War Operations Ltd.";
const LIC = "MGA/B2C/912/2025";
const ADDR = "[Registered Address]";

export const LEGAL = {
  terms: {
    title: "Terms & Conditions",
    meta: [
      ["Effective Date", "January 2, 2025"],
      ["Operator", OP],
      ["Licence", `${LIC} (Malta Gaming Authority)`],
      ["Registered Address", ADDR],
    ],
    sections: [
      {
        h: "1. Introduction",
        body: [
          '1.1 These Terms & Conditions ("Terms") govern your use of the Wages of War Casino website, mobile application, and all related services (collectively, the "Platform").',
          "1.2 By registering an account, depositing funds, or using any service on the Platform, you agree to be bound by these Terms, our Privacy Policy, Cookie Policy, Responsible Gambling Policy, AML Policy, and Bonus Terms & Conditions.",
          "1.3 If you do not agree to these Terms, you must not use the Platform.",
        ],
      },
      {
        h: "2. Eligibility",
        body: [
          "2.1 You must be at least 18 years of age (or the legal gambling age in your jurisdiction, whichever is higher) to use the Platform.",
          "2.2 You must not be a resident of any jurisdiction where online gambling is prohibited or restricted.",
          "2.3 You must not be self-excluded from gambling services or listed on any exclusion register.",
          "2.4 It is your responsibility to ensure that your use of the Platform is legal in your jurisdiction.",
          `2.5 ${OP} reserves the right to refuse service to any person at its sole discretion.`,
        ],
      },
      {
        h: "3. Account Registration",
        body: [
          "3.1 You may only hold one account on the Platform. Multiple accounts will be closed, and any balances may be forfeited.",
          "3.2 All information provided during registration must be accurate, complete, and up to date. You must notify us immediately of any changes.",
          "3.3 You are responsible for maintaining the confidentiality of your login credentials.",
          "3.4 We reserve the right to verify your identity at any time (KYC). Failure to provide requested documentation within 14 days may result in account suspension or closure.",
          "3.5 Accounts are non-transferable. You may not sell, transfer, or allow another person to access your account.",
        ],
      },
      {
        h: "4. Deposits & Withdrawals",
        body: [
          "4.1 All deposits must be made from a payment method registered in your own name.",
          "4.2 Minimum and maximum deposit limits are displayed on the Cashier page and may be updated from time to time.",
          "4.3 Withdrawal requests are processed within 24–72 hours, subject to verification checks.",
          `4.4 ${OP} reserves the right to request additional verification before processing withdrawals exceeding €2,000 or equivalent.`,
          "4.5 Any suspected fraudulent deposits (chargebacks, stolen cards, money laundering) will result in immediate account suspension and referral to relevant authorities.",
          "4.6 Cryptocurrency deposits and withdrawals are processed via our secure vault system. Blockchain confirmations may cause variable processing times.",
        ],
      },
      {
        h: "5. Games & Fairness",
        body: [
          "5.1 All games on the Platform use certified Random Number Generators (RNG) tested by independent auditing bodies.",
          "5.2 Return to Player (RTP) percentages are published for each game and audited regularly.",
          "5.3 The Platform reserves the right to void bets or winnings in the event of a system malfunction, software error, or suspected exploitation of a bug.",
          "5.4 Game rules for each individual game are accessible within the game interface.",
        ],
      },
      {
        h: "6. Bonuses & Promotions",
        body: [
          "6.1 All bonuses and promotions are subject to the separate Bonus Terms & Conditions.",
          `6.2 ${OP} reserves the right to modify, suspend, or cancel any promotion at any time without prior notice.`,
          "6.3 Bonus abuse, including but not limited to multi-accounting, exploitation of errors, or coordinated play, will result in forfeiture of bonus funds and associated winnings.",
        ],
      },
      {
        h: "7. Responsible Gambling",
        body: [
          `7.1 ${OP} is committed to responsible gambling. Full details are set out in our Responsible Gambling Policy.`,
          "7.2 Players may set deposit limits, loss limits, session time limits, and cooling-off periods via their account settings.",
          "7.3 Self-exclusion is available for periods of 6 months, 1 year, or permanently.",
        ],
      },
      {
        h: "8. Intellectual Property",
        body: [
          `8.1 All content on the Platform, including but not limited to graphics, logos, text, software, and game designs, is the property of ${OP} or its licensors.`,
          "8.2 You may not reproduce, distribute, or create derivative works from any Platform content without prior written consent.",
        ],
      },
      {
        h: "9. Limitation of Liability",
        body: [
          `9.1 ${OP} shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform.`,
          "9.2 Our total liability shall not exceed the amount of funds held in your account at the time a claim arises.",
          "9.3 We are not responsible for losses caused by events beyond our reasonable control (force majeure), including internet outages, server failures, or acts of third parties.",
        ],
      },
      {
        h: "10. Dispute Resolution",
        body: [
          "10.1 Any dispute or complaint should first be directed to our Customer Support team at support@wagesofwarcasino.com.",
          "10.2 If a dispute cannot be resolved internally within 14 days, you may refer the matter to an independent Alternative Dispute Resolution (ADR) provider as approved by the Malta Gaming Authority.",
          "10.3 These Terms are governed by and construed in accordance with the laws of Malta.",
        ],
      },
      {
        h: "11. Account Closure & Suspension",
        body: [
          `11.1 ${OP} reserves the right to suspend or close any account at its sole discretion, including but not limited to cases of suspected fraud, money laundering, breach of Terms, or regulatory requirements.`,
          "11.2 Upon account closure, any remaining balance (less any amounts subject to investigation) will be returned to the player via the original deposit method where possible.",
        ],
      },
      {
        h: "12. Amendments",
        body: [
          `12.1 ${OP} reserves the right to amend these Terms at any time. Material changes will be communicated via email or Platform notification at least 7 days before taking effect.`,
          "12.2 Continued use of the Platform after amendments take effect constitutes acceptance of the updated Terms.",
        ],
      },
      {
        h: "13. Contact",
        body: [
          {
            list: [
              "Email: support@wagesofwarcasino.com",
              `Operator: ${OP}`,
              `Licence: ${LIC}`,
              `Registered Address: ${ADDR}`,
            ],
          },
        ],
      },
    ],
  },

  privacy: {
    title: "Privacy Policy",
    meta: [
      ["Effective Date", "January 2, 2025"],
      ["Data Controller", OP],
      ["Registered Address", ADDR],
    ],
    sections: [
      {
        h: "1. Introduction",
        body: [
          `This Privacy Policy explains how ${OP} ("we", "us", "our") collects, uses, stores, and protects your personal data when you use the Wages of War Casino platform.`,
        ],
      },
      {
        h: "2. Data We Collect",
        body: [
          {
            list: [
              "Identity Data: Full name, date of birth, nationality, government-issued ID documents",
              "Contact Data: Email address, phone number, residential address",
              "Financial Data: Payment card details, bank account information, cryptocurrency wallet addresses, deposit/withdrawal history",
              "Technical Data: IP address, browser type, device information, operating system, login timestamps",
              "Gaming Data: Betting history, game preferences, session duration, win/loss records",
              "Communications Data: Customer support correspondence, chat messages",
              "Verification Data: KYC/AML documentation, proof of address, source of funds",
            ],
          },
        ],
      },
      {
        h: "3. Legal Basis for Processing (GDPR Article 6)",
        body: [
          {
            list: [
              "Contract: To provide our gambling services and manage your account",
              "Legal Obligation: To comply with MGA regulations, AML legislation, and tax obligations",
              "Legitimate Interests: Fraud prevention, security, service improvement",
              "Consent: For marketing communications, cookies, and optional data processing",
            ],
          },
        ],
      },
      {
        h: "4. How We Use Your Data",
        body: [
          {
            list: [
              "To verify your identity and age (KYC compliance)",
              "To process deposits and withdrawals",
              "To provide and improve our gaming services",
              "To detect and prevent fraud, money laundering, and bonus abuse",
              "To comply with regulatory and legal obligations",
              "To send service communications (account updates, security alerts)",
              "To send marketing communications (with your consent)",
              "To analyse Platform usage and improve user experience",
            ],
          },
        ],
      },
      {
        h: "5. Data Sharing",
        body: [
          "We may share your data with: Payment processors, identity verification providers, regulatory authorities (MGA, FIAU), law enforcement (where legally required), professional advisors, cloud hosting providers (under DPAs). We do NOT sell your personal data.",
        ],
      },
      {
        h: "6. Data Retention",
        body: [
          {
            list: [
              "Account data: Duration of account plus 5 years after closure (MGA requirement)",
              "Transaction records: 5 years (AML regulations)",
              "Marketing consent records: Until consent is withdrawn",
              "Technical logs: Up to 12 months",
            ],
          },
        ],
      },
      {
        h: "7. Data Security",
        body: [
          "SSL/TLS encryption, AES-256 encryption at rest, MFA options, regular security audits, access controls.",
        ],
      },
      {
        h: "8. Your Rights (GDPR)",
        body: [
          "Access, Rectification, Erasure, Restrict processing, Data Portability, Object, Withdraw Consent. Contact: privacy@wagesofwarcasino.com",
        ],
      },
      {
        h: "9. International Transfers",
        body: [
          "Where data is transferred outside the EEA, appropriate safeguards (SCCs, adequacy decisions) are in place.",
        ],
      },
      {
        h: "10. Changes",
        body: ["Material changes notified via email or Platform notification."],
      },
      {
        h: "11. Contact",
        body: [
          {
            list: [
              "Data Protection Officer: Kevin J. Smith",
              "Email: privacy@wagesofwarcasino.com",
              `Address: ${ADDR}`,
            ],
          },
        ],
      },
    ],
  },

  "responsible-gambling": {
    title: "Responsible Gambling",
    meta: [
      ["Operator", OP],
      ["Licence", LIC],
    ],
    sections: [
      {
        h: "Our Commitment",
        body: [
          `${OP} is committed to providing a safe, fair, and enjoyable gambling environment. We recognise that for some individuals, gambling can become problematic. We are dedicated to minimising gambling-related harm.`,
        ],
      },
      {
        h: "Age Verification",
        body: [
          "You must be 18+ to gamble. We conduct age verification during registration and may request additional proof at any time. If an underage person has opened an account, it will be immediately closed, bets voided, and deposits returned.",
        ],
      },
      {
        h: "Self-Assessment",
        body: [
          "Ask yourself:",
          {
            list: [
              "Do you spend more money on gambling than you can afford to lose?",
              "Do you borrow money or sell possessions to gamble?",
              "Has gambling affected your relationships or daily responsibilities?",
              "Do you feel anxious, depressed, or irritable when not gambling?",
              "Do you chase losses or increase bets to recoup previous losses?",
            ],
          },
        ],
      },
      {
        h: "Player Protection Tools",
        body: [
          {
            list: [
              "Deposit Limits (daily, weekly, monthly) — decreases immediate, increases 24hr cooling-off",
              "Loss Limits (daily, weekly, monthly)",
              "Session Time Limits — auto logout",
              "Reality Checks — pop-up notifications at intervals",
              "Cooling-Off Period (24 hours, 7 days, 30 days, 90 days)",
              "Self-Exclusion (6 months, 1 year, 2 years, or permanent)",
            ],
          },
        ],
      },
      {
        h: "Support Organisations",
        body: [
          {
            list: [
              "Gamblers Anonymous: www.gamblersanonymous.org",
              "GamCare: www.gamcare.org.uk | 0808 8020 133",
              "Gambling Therapy: www.gamblingtherapy.org",
              "BeGambleAware: www.begambleaware.org",
            ],
          },
        ],
      },
      {
        h: "Underage Gambling Prevention",
        body: [
          "Install parental control software, never share account credentials, contact us if a minor has accessed the Platform.",
        ],
      },
    ],
  },

  "age-verification": {
    title: "Age Verification",
    subtitle: "18+ ONLY",
    meta: [["Operator", OP]],
    sections: [
      {
        h: "Verification Process",
        body: [
          {
            list: [
              "All players must confirm they are 18+ during registration.",
              "Players must provide valid government-issued photo ID (passport, national ID, driving licence).",
              "Third-party verification services validate player information.",
              "We may request additional proof of age at any time.",
            ],
          },
        ],
      },
      {
        h: "Failure to Verify",
        body: [
          {
            list: [
              "Accounts unverified within 72 hours of first deposit will be suspended.",
              "Underage players: account closed, wagers voided, deposits returned, winnings forfeited, reported to MGA.",
            ],
          },
        ],
      },
    ],
  },

  "cookie-policy": {
    title: "Cookie Policy",
    meta: [["Effective Date", "January 2, 2025"]],
    sections: [
      {
        h: "About Cookies",
        body: [
          "Cookies are small text files placed on your device. We use the following categories:",
          {
            list: [
              "Strictly Necessary: Session management, authentication, security, load balancing (cannot be disabled)",
              "Functional: Language preferences, login status, game settings",
              "Analytics: Page views, session duration, popular games (Google Analytics, anonymised IP)",
              "Marketing: Relevant ads, campaign measurement (only with explicit consent)",
            ],
          },
        ],
      },
      {
        h: "Managing Cookies",
        body: [
          "Use our cookie consent banner, the Cookie Preferences link in the footer, or your browser settings.",
        ],
      },
      { h: "Contact", body: ["privacy@wagesofwarcasino.com"] },
    ],
  },

  "aml-policy": {
    title: "AML Policy",
    meta: [
      ["Operator", OP],
      ["Licence", LIC],
      ["MLRO", "Kevin J. Smith"],
    ],
    sections: [
      {
        h: "1. Purpose",
        body: [
          "Prevent the Platform from being used for money laundering, terrorist financing, or other financial crimes. Compliant with PMLA Cap. 373, EU AMLD 4/5/6, FIAU Implementing Procedures.",
        ],
      },
      {
        h: "2. Customer Due Diligence (CDD)",
        body: [
          {
            list: [
              "Standard: Name, DOB, address, photo ID, proof of address",
              "Enhanced (EDD) triggered when: deposits exceed €2,000, PEP status, high-risk jurisdiction, unusual patterns",
              "EDD measures: Source of Funds, Source of Wealth, enhanced monitoring",
            ],
          },
        ],
      },
      {
        h: "3. Transaction Monitoring",
        body: [
          "Automated systems detect rapid deposit/withdrawal with minimal play, structuring, third-party payments, unusual crypto patterns, sudden behaviour changes.",
        ],
      },
      {
        h: "4. Suspicious Activity",
        body: [
          "Reported to FIAU via STR. No tipping off. Records retained 5+ years.",
        ],
      },
      {
        h: "5. PEPs",
        body: [
          "Screened at registration and ongoing. Subject to EDD and senior management approval.",
        ],
      },
      {
        h: "6. Record Keeping",
        body: ["5 years minimum from last transaction or account closure."],
      },
      { h: "7. Staff Training", body: ["Upon hiring, annually, and ad-hoc."] },
      { h: "Contact", body: ["compliance@wagesofwarcasino.com"] },
    ],
  },

  "bonus-terms": {
    title: "Bonus Terms & Conditions",
    meta: [["Effective Date", "January 2, 2025"]],
    sections: [
      {
        h: "1. General",
        body: [
          "These apply to all bonuses, promotions, free spins, cashback. These terms are designed to protect the casino's operating margin while still offering a modest, regulated on-platform welcome offer.",
        ],
      },
      {
        h: "2. Signup + Verify Bonus",
        body: [
          "New players may claim a single $10 signup and verification bonus once their account has passed identity verification (KYC). The bonus is credited only after KYC approval and is not available for unverified accounts.",
          "This bonus is a promotional credit and not withdrawable as cash. It is subject to a 10x wagering requirement on slot games only and a maximum cashout cap of $10 from bonus winnings.",
          "The bonus cannot be stacked with any other offer, promo or cashback credit. One claim per player/account, household, device and IP address.",
        ],
      },
      {
        h: "3. Eligibility",
        body: [
          "Accounts must be 18+ and verified. Bonus is only valid on accounts with a matching KYC record, valid contact details, and no active fraud or AML flags. The casino may reject or reverse bonus credit if eligibility fails or if abuse is detected.",
        ],
      },
      {
        h: "4. Wagering Requirements",
        body: [
          "The signup bonus carries a 10x wagering requirement on slot games only. Wagering must be completed within 30 days of credit. Table games, live casino, sports, jackpots and other non-slot content do not contribute to the requirement.",
          "Maximum stake while wagering is capped at $2 per spin unless the casino expressly approves a higher limit in writing. The casino may refuse any wager deemed to exploit the promo.",
        ],
      },
      {
        h: "5. Maximum Withdrawal",
        body: [
          "Bonus funds and winnings from the bonus are capped at a maximum cashout of $10. The initial $10 bonus itself is a liability offset and is not withdrawable as cash. Withdrawal requests are only processed after identity verification and compliance checks are complete.",
        ],
      },
      {
        h: "6. Free Spins",
        body: [
          "Valid 7 days. Winnings credited as bonus funds subject to wagering. Eligible only on approved slot titles in the operations lobby.",
        ],
      },
      {
        h: "7. Cashback & VIP",
        body: [
          "Calculated on net losses and credited as a separate promotional credit. Cashback availability does not increase any promotional bonus entitlement and is subject to account standing and compliance review.",
        ],
      },
      {
        h: "8. Bonus Abuse",
        body: [
          "Multi-accounting, coordinated play, exploiting errors, bot use, chip-dumping, hedging, abuse of KYC or account manipulation, and any attempt to create artificial loss or gain will result in bonus forfeiture, account review, and confiscation of winnings derived from the abuse.",
        ],
      },
      {
        h: "9. Amendments",
        body: [
          "The casino may update or withdraw bonus offers at any time. Existing claims remain subject to the terms in effect at the time of award, unless the casino provides a written superseding notice.",
        ],
      },
      { h: "Contact", body: ["support@wagesofwarcasino.com"] },
    ],
  },
};

export const LEGAL_LINKS = [
  ["Terms & Conditions", "/terms"],
  ["Privacy Policy", "/privacy"],
  ["Responsible Gambling", "/responsible-gambling"],
  ["Age Verification", "/age-verification"],
  ["Cookie Policy", "/cookie-policy"],
  ["AML Policy", "/aml-policy"],
  ["Bonus Terms", "/bonus-terms"],
];
