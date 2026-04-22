import type { MeetingBrief } from '@/api/types'
import { DAILY_SUMMARIES } from './dailySummaries'

// Helper: resolve the meeting date from the daily summary that references this meetingId
function meetingDate(meetingId: string): string {
  for (const ds of DAILY_SUMMARIES) {
    const m = ds.sections.meetings.find((m) => m.meetingId === meetingId)
    if (m) return ds.date
  }
  return new Date().toISOString().split('T')[0]
}

// ── Meeting Briefs ───────────────────────────────────────────────────

const briefs: MeetingBrief[] = [
  // Day 1 — mb-001: Al-Rashidi Family quarterly update
  {
    id: 'mb-001',
    clientName: 'Al-Rashidi Family',
    date: meetingDate('mb-001'),
    time: '9:30 AM',
    attendees: [
      { name: 'Ahmed Al-Rashidi', role: 'CFO' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
    ],
    format: 'video',
    duration: '60 min',
    summary: {
      goal: 'Follow up on the 27 Mar 2026 portfolio review (liquidity, documentation, deployment) and agree on redeployment of recent distributions while clearing remaining admin items (KYC, subscription agreement).',
      mainTopics: [
        'Review capital flows ($5.97M distributed vs $7.1M funded), confirm pending calls, and align on deploying excess cash into infrastructure and logistics pipeline.',
        'Discuss impact of Fed rate decision — fixed income allocation is 3 percentage points over target; recommend trimming $2M from short-duration bonds.',
        'Review Jahez exposure — stock dropped to SAR 11.08 (all-time low since IPO). Al-Rashidi holds ~$10M in Jahez (20% of $50M public equity portfolio). Discuss rebalancing given 74% decline from IPO.',
      ],
      secondaryTopics: [
        'Portfolio performance context (strong RE and infra) and outstanding admin items (KYC, subscription agreement).',
        'New pipeline opportunity: Envirosoil NV — Belgian environmental services direct investment (LBO by Vybros Capital Partners). Passed pre-screening with Proceed recommendation. Discuss fit with infrastructure allocation gap and ESG alignment.',
      ],
    },
    capitalFlows: {
      funded: '$7.1M',
      distributed: '$5.97M',
      notices: [
        { fund: 'GCC RE Fund III', type: 'capital_call', amount: '$3.2M', status: 'overdue' },
        { fund: 'Apollo IX', type: 'capital_call', amount: '$1.8M', status: 'to_approve' },
        { fund: 'KKR Infra', type: 'capital_call', amount: '$2.1M', status: 'upcoming' },
        { fund: 'BREIT', type: 'distribution', amount: '$4.65M', status: 'received' },
        { fund: 'Carlyle Europe V', type: 'distribution', amount: '$1.32M', status: 'received' },
      ],
    },
    deployment: {
      deployed: 98,
      target: 120,
      byAssetClass: [
        { name: 'Private equity', percentage: 85 },
        { name: 'Real estate', percentage: 72 },
        { name: 'Private credit', percentage: 65 },
        { name: 'Infrastructure', percentage: 45 },
        { name: 'Secondaries', percentage: 55 },
        { name: 'Venture capital', percentage: 30 },
      ],
    },
    pipeline: [
      { name: 'GCC Data Centers Fund I', category: 'Infrastructure', description: 'Core digital infrastructure strategy targeting low-to-mid teens net returns with contracted demand and strong regional tailwinds.', icMemoUrl: '#' },
      { name: 'Apex Logistics', category: 'Logistics', description: 'Growth logistics opportunity targeting c.18%+ gross return potential, with execution upside but higher near-term operating risk.', icMemoUrl: '#' },
      { name: 'Envirosoil NV', category: 'Environmental Services', description: 'Belgian soil remediation and PFAS investigation platform. Direct investment led by Vybros Capital Partners (LBO). Zero debt, 18.4% EBITDA margin, buy-and-build strategy in fragmented market. Recommendation: Proceed.', icMemoUrl: '/files/Sniff Test_Envirosoil.pdf' },
    ],
    performance: [
      { fund: 'GCC RE Fund III', navDate: 'NAV 31 Mar 2026', qoqChange: 12.4 },
      { fund: 'KKR Infrastructure II', navDate: 'NAV 25 Mar 2026', qoqChange: 8.7 },
      { fund: 'Carlyle Europe V', navDate: 'NAV 28 Feb 2026', qoqChange: 6.1 },
      { fund: 'Apollo Secondaries IX', navDate: 'NAV 15 Mar 2026', qoqChange: -3.2 },
      { fund: 'BREIT', navDate: 'NAV 29 Feb 2026', qoqChange: -1.8 },
    ],
    keyNews: [
      { id: 'mn-001', headline: 'Apollo revises NovaBridge exit timeline to H2 2027', summary: 'Expected distributions from Apollo IX may be delayed, so expectations on timing should be managed proactively in the meeting.', source: 'Bloomberg', sourceUrl: 'https://www.bloomberg.com/news/articles/apollo-exit-delay-distributions' },
      { id: 'mn-002', headline: 'Red Sea disruptions continue into Q2', summary: 'Relevant for Apex Logistics. If discussed, the risk should be framed clearly before positioning the opportunity.', source: 'FT', sourceUrl: 'https://www.ft.com/content/red-sea-disruptions-q2' },
      { id: 'mn-003', headline: 'Change in Fed Rates', summary: 'The Fed rate decision means your fixed income allocation is now 3 percentage points over target. We recommend trimming $2M from short-duration bonds.', source: 'Bloomberg', sourceUrl: 'https://www.bloomberg.com/news/articles/fed-rate-decision-impact' },
      { id: 'mn-010', headline: 'Jahez drops to all-time low (SAR 11.08)', summary: 'Al-Rashidi Family holds ~$10M in Jahez (20% of $50M public equity portfolio). Originally invested at IPO (SAR 42.5, Jan 2022) as founding member. IC meeting in Oct 2022 (Saqib, Husnayin, Ahmed, Usman, Raoof) decided to retain — review rebalancing in this meeting.', source: 'Argaam', sourceUrl: 'https://www.argaam.com/en/article/jahez-stock-drop' },
    ],
    pendingItems: [
      { title: 'KYC renewal', href: 'https://staging.asbitech.ai/engage/tasks-hub?taskStatus=2&period=1&applyTo=1' },
      { title: 'Subscription agreement — WDR pending', href: 'https://staging.asbitech.ai/dashboard/1' },
    ],
    returnsExpectation: {
      annualReturn: { actual: 14.73, target: 13.50 },
      yield: { actual: 6.00, target: 7.00 },
      standardDeviation: { actual: 11.00, target: 10.40 },
      sharpeRatio: { actual: 1.11, target: 1.06 },
    },
    navEvolution: [
      { year: 2019, nav: 125.1, twr: 9.8 },
      { year: 2020, nav: 129.9, twr: 15.3 },
      { year: 2021, nav: 175.1, twr: 52.0 },
      { year: 2022, nav: 178.0, twr: 47.2 },
      { year: 2023, nav: 192.5, twr: 56.4 },
      { year: 2024, nav: 189.1, twr: 54.7 },
      { year: 2025, nav: 199.6, twr: 64.9 },
      { year: 2026, nav: 199.7, twr: 65.2 },
    ],
    zoomLink: 'https://zoom.us/j/1234567890?pwd=abc123',
    personalTouch: [
      {
        id: 'pt-mb-001',
        clientName: 'Ahmed Al-Rashidi',
        clientEmail: 'ahmed@alrashidi-fo.com',
        type: 'birthday',
        note: "Ahmed's birthday is tomorrow — great opportunity for personal outreach",
        emailSubject: 'Happy Birthday, Ahmed!',
        emailBody: 'Dear Ahmed,\n\nWishing you a very happy birthday! I hope you have a wonderful day celebrating with your loved ones.\n\nIt has been a pleasure working with you and the Al-Rashidi Family. Here\'s to another great year ahead.\n\nWarm regards,\n{{ADVISOR_NAME}}',
      },
    ],
    quickLinks: [
      { label: 'Quarterly Report Q1 2026', href: 'https://drive.google.com/file/d/19iqWN_c4x8vAjwSypiBdTs6wXXEWHefx/view?usp=drive_link' },
      { label: 'Minutes of Last Meeting', href: '__MEETING_MINUTES__' },
    ],
    meetingMinutes: {
      subject: 'Al-Rashidi Family — Quarterly Portfolio Review',
      date: '27 Mar 2026',
      time: '10:00 AM - 11:00 AM',
      format: 'Video (Zoom)',
      status: 'Completed',
      attendees: [
        { name: 'Ahmed Al-Rashidi', role: 'CFO, Al-Rashidi Family Office' },
        { name: 'Raoof Naushad', role: 'Relationship Manager' },
        { name: 'Saqib Muhammed', role: 'Portfolio Analyst' },
      ],
      agenda: [
        'Q1 2026 portfolio performance review',
        'Liquidity position and cash management',
        'Capital call schedule and upcoming commitments',
        'Pipeline opportunities — GCC Data Centers Fund I, Apex Logistics',
        'Outstanding admin items (KYC renewal, subscription agreements)',
      ],
      keyDecisions: [
        'Agreed to proceed with GCC Data Centers Fund I — $3M commitment, pending IC memo review',
        'Apex Logistics co-invest to be explored further; Ahmed requested a detailed risk/return breakdown before committing',
        'Excess cash from BREIT distribution ($4.65M) to be redeployed into infrastructure and logistics pipeline',
        'KYC renewal documents to be submitted by client within 2 weeks',
        'Subscription agreement for WDR to be re-sent via DocuSign',
      ],
      actionItems: [
        { item: 'Send GCC Data Centers IC memo to Ahmed', owner: 'Raoof Naushad', status: 'Completed' },
        { item: 'Prepare Apex Logistics risk/return analysis', owner: 'Saqib Muhammed', status: 'In Progress' },
        { item: 'Submit updated KYC documents', owner: 'Ahmed Al-Rashidi', status: 'Pending' },
        { item: 'Re-send WDR subscription agreement via DocuSign', owner: 'Raoof Naushad', status: 'Completed' },
        { item: 'Confirm BREIT distribution redeployment plan', owner: 'Raoof Naushad', status: 'In Progress' },
        { item: 'Schedule follow-up meeting for Apex deep dive', owner: 'Raoof Naushad', status: 'Completed' },
      ],
      notes: 'Ahmed was positive about the overall portfolio performance, particularly the strong returns from GCC RE Fund III (+12.4% QoQ) and KKR Infrastructure II (+8.7%). He expressed concern about the Apollo IX exit delay and its impact on expected distributions. He wants proactive communication if timelines shift further.\n\nOn deployment, Ahmed acknowledged the gap between deployed ($98M) and target ($120M) and is supportive of accelerating commitments to close the gap, particularly in infrastructure. He is cautious on logistics given Red Sea disruption risks but open to reviewing the Apex opportunity in detail.\n\nAhmed confirmed he will prioritise the KYC renewal and asked for a reminder email next week.',
    },
  },

  // Day 1 — mb-002: Meridian Capital portfolio allocation
  {
    id: 'mb-002',
    clientName: 'Meridian Capital',
    date: meetingDate('mb-002'),
    time: '11:00 AM',
    attendees: [
      { name: 'Sarah Meridian', role: 'CIO' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
    ],
    format: 'video',
    duration: '45 min',
    summary: {
      goal: 'Review current portfolio allocation drift and agree on rebalancing strategy to bring positions back within IPS guidelines.',
      mainTopics: [
        'Allocation drift analysis — PE overweight by 3.2%, credit underweight by 2.8%. Discuss rebalancing timeline and execution approach.',
      ],
      secondaryTopics: [
        'Pipeline discussion — potential new commitment to GCC Data Centers Fund I to fill infrastructure gap.',
      ],
    },
    capitalFlows: {
      funded: '$4.2M',
      distributed: '$2.8M',
      notices: [
        { fund: 'KKR Infra II', type: 'capital_call', amount: '$1.5M', status: 'upcoming' },
        { fund: 'Carlyle Europe V', type: 'distribution', amount: '$0.95M', status: 'received' },
        { fund: 'Apollo IX', type: 'capital_call', amount: '$1.2M', status: 'to_approve' },
      ],
    },
    deployment: {
      deployed: 85,
      target: 100,
      byAssetClass: [
        { name: 'Private equity', percentage: 92 },
        { name: 'Real estate', percentage: 68 },
        { name: 'Private credit', percentage: 52 },
        { name: 'Infrastructure', percentage: 38 },
        { name: 'Secondaries', percentage: 60 },
        { name: 'Venture capital', percentage: 25 },
      ],
    },
    pipeline: [
      { name: 'GCC Data Centers Fund I', category: 'Infrastructure', description: 'Potential $3M commitment to fill infrastructure allocation gap.' },
    ],
    performance: [
      { fund: 'KKR Infrastructure II', navDate: 'NAV 25 Mar 2026', qoqChange: 8.7 },
      { fund: 'Carlyle Europe V', navDate: 'NAV 28 Feb 2026', qoqChange: 6.1 },
      { fund: 'Apollo Secondaries IX', navDate: 'NAV 15 Mar 2026', qoqChange: -3.2 },
      { fund: 'GCC RE Fund III', navDate: 'NAV 31 Mar 2026', qoqChange: 4.5 },
    ],
    keyNews: [
      { id: 'mn-004', headline: 'Allocation drift in multi-asset PE portfolios', summary: 'Sector-wide trend — many LPs rebalancing. Useful framing for the discussion.', source: 'Institutional Investor' },
    ],
    pendingItems: [
      { title: 'Rebalancing execution plan — awaiting approval' },
      { title: 'Q1 fee invoice discrepancy — under review' },
    ],
  },

  // Day 1 — mb-003: Hamdan Trust — Apex co-invest
  {
    id: 'mb-003',
    clientName: 'Hamdan Trust',
    date: meetingDate('mb-003'),
    time: '2:00 PM',
    attendees: [
      { name: 'Khalid Hamdan', role: 'Trustee' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
      { name: 'Maria Santos', role: 'Deal Lead' },
    ],
    format: 'in-person',
    duration: '60 min',
    summary: {
      goal: 'Present Apex Logistics co-invest opportunity and seek preliminary commitment indication before IC deadline.',
      mainTopics: [
        'Apex Logistics deal thesis — c.18% gross return target, growth logistics play. Review key risks (operating margins, customer concentration) and mitigants.',
      ],
      secondaryTopics: [
        'Estate planning update — succession deed amendments ready for signing.',
      ],
    },
    capitalFlows: {
      funded: '$5.5M',
      distributed: '$3.2M',
      notices: [
        { fund: 'GCC RE Fund III', type: 'capital_call', amount: '$2.8M', status: 'upcoming' },
        { fund: 'BREIT', type: 'distribution', amount: '$1.9M', status: 'received' },
      ],
    },
    deployment: {
      deployed: 72,
      target: 95,
      byAssetClass: [
        { name: 'Private equity', percentage: 78 },
        { name: 'Real estate', percentage: 80 },
        { name: 'Private credit', percentage: 45 },
        { name: 'Infrastructure', percentage: 55 },
        { name: 'Secondaries', percentage: 35 },
        { name: 'Venture capital', percentage: 20 },
      ],
    },
    pipeline: [
      { name: 'Apex Logistics', category: 'Logistics', description: 'Co-invest opportunity — $2M minimum. Growth logistics, c.18% gross return target.' },
      { name: 'GCC Data Centers Fund I', category: 'Infrastructure', description: 'Under consideration for $1.5M commitment.' },
    ],
    performance: [
      { fund: 'GCC RE Fund III', navDate: 'NAV 31 Mar 2026', qoqChange: 12.4 },
      { fund: 'BREIT', navDate: 'NAV 29 Feb 2026', qoqChange: -1.8 },
      { fund: 'KKR Infrastructure II', navDate: 'NAV 25 Mar 2026', qoqChange: 8.7 },
    ],
    keyNews: [
      { id: 'mn-005', headline: 'Logistics sector rebound accelerates', summary: 'Freight rates normalizing after 2-year correction — supportive for Apex thesis.', source: 'Drewry' },
    ],
    pendingItems: [
      { title: 'DocuSign — subscription agreement pending' },
      { title: 'Succession deed — ready for signing' },
    ],
  },

  // Day 2 — mb-004: Al-Farsi Family semi-annual review
  {
    id: 'mb-004',
    clientName: 'Al-Farsi Family',
    date: meetingDate('mb-004'),
    time: '10:00 AM',
    attendees: [
      { name: 'Omar Al-Farsi', role: 'Family Office Director' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
    ],
    format: 'video',
    duration: '60 min',
    summary: {
      goal: 'Review H1 portfolio performance, discuss allocation drift (5% threshold breached), and align on corrective actions.',
      mainTopics: [
        'Portfolio has drifted — PE overweight at 42% (target 37%), credit underweight at 8% (target 12%). Need to agree on rebalancing approach.',
      ],
      secondaryTopics: [
        'BREIT distribution allocation decision pending. Discuss reinvestment vs. cash retention.',
      ],
    },
    capitalFlows: {
      funded: '$3.8M',
      distributed: '$5.1M',
      notices: [
        { fund: 'BREIT', type: 'distribution', amount: '$4.65M', status: 'received' },
        { fund: 'Apollo IX', type: 'capital_call', amount: '$0.9M', status: 'upcoming' },
      ],
    },
    deployment: {
      deployed: 110,
      target: 120,
      byAssetClass: [
        { name: 'Private equity', percentage: 95 },
        { name: 'Real estate', percentage: 75 },
        { name: 'Private credit', percentage: 40 },
        { name: 'Infrastructure', percentage: 60 },
        { name: 'Secondaries', percentage: 50 },
        { name: 'Venture capital', percentage: 35 },
      ],
    },
    pipeline: [],
    performance: [
      { fund: 'BREIT', navDate: 'NAV 29 Feb 2026', qoqChange: -1.8 },
      { fund: 'Carlyle Europe V', navDate: 'NAV 28 Feb 2026', qoqChange: 6.1 },
      { fund: 'Apollo Secondaries IX', navDate: 'NAV 15 Mar 2026', qoqChange: -3.2 },
    ],
    keyNews: [
      { id: 'mn-006', headline: 'BREIT redemption queue shrinks', summary: 'Positive for NAV stability and exit optionality.', source: 'Bloomberg' },
    ],
    pendingItems: [
      { title: 'Rebalance trigger — allocation drift exceeded 5%' },
      { title: 'BREIT distribution — allocation instruction needed' },
    ],
  },

  // Day 2 — mb-005: Veritas Group — GCC Data Centers
  {
    id: 'mb-005',
    clientName: 'Veritas Group',
    date: meetingDate('mb-005'),
    time: '3:00 PM',
    attendees: [
      { name: 'Marcus Veritas', role: 'CEO' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
    ],
    format: 'phone',
    duration: '30 min',
    summary: {
      goal: 'Present GCC Data Centers Fund I opportunity and gauge interest for $5M commitment ahead of first close.',
      mainTopics: [
        'GCC Data Centers Fund I overview — digital infra, contracted demand, regional AI tailwinds. Low-to-mid teens target net return.',
      ],
      secondaryTopics: [
        'Subscription agreement WDR still pending — need to resolve before any new commitments.',
      ],
    },
    capitalFlows: {
      funded: '$6.3M',
      distributed: '$4.1M',
      notices: [
        { fund: 'GCC RE Fund III', type: 'capital_call', amount: '$2.5M', status: 'to_approve' },
        { fund: 'KKR Infra II', type: 'distribution', amount: '$1.8M', status: 'received' },
      ],
    },
    deployment: {
      deployed: 92,
      target: 110,
      byAssetClass: [
        { name: 'Private equity', percentage: 88 },
        { name: 'Real estate', percentage: 70 },
        { name: 'Private credit', percentage: 55 },
        { name: 'Infrastructure', percentage: 42 },
        { name: 'Secondaries', percentage: 48 },
        { name: 'Venture capital', percentage: 22 },
      ],
    },
    pipeline: [
      { name: 'GCC Data Centers Fund I', category: 'Infrastructure', description: 'Targeting $5M commitment. First close expected in 6 weeks.' },
    ],
    performance: [
      { fund: 'GCC RE Fund III', navDate: 'NAV 31 Mar 2026', qoqChange: 12.4 },
      { fund: 'KKR Infrastructure II', navDate: 'NAV 25 Mar 2026', qoqChange: 8.7 },
    ],
    keyNews: [
      { id: 'mn-007', headline: 'Data center demand surges in GCC', summary: 'AI-driven demand creating strong pipeline — directly relevant to fund thesis.', source: 'Gulf Business' },
    ],
    pendingItems: [
      { title: 'Subscription agreement — WDR pending' },
      { title: 'Q1 Approval — sign-off pending' },
    ],
  },

  // Day 3 — mb-006: Noor Holdings
  {
    id: 'mb-006',
    clientName: 'Noor Holdings',
    date: meetingDate('mb-006'),
    time: '9:00 AM',
    attendees: [
      { name: 'Hassan Noor', role: 'CFO' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
    ],
    format: 'video',
    duration: '45 min',
    summary: {
      goal: 'Review liquidity position ahead of upcoming capital calls and confirm wire instructions for pending commitments.',
      mainTopics: [
        'Capital call planning — $2.3M due in next 30 days across 2 funds. Confirm liquidity sources and wire readiness.',
      ],
      secondaryTopics: [
        'AML clearance — routine check cleared, documentation to file. Tax filing deadline approaching.',
      ],
    },
    capitalFlows: {
      funded: '$4.5M',
      distributed: '$2.1M',
      notices: [
        { fund: 'Apollo IX', type: 'capital_call', amount: '$1.4M', status: 'upcoming' },
        { fund: 'GCC RE Fund III', type: 'capital_call', amount: '$0.9M', status: 'upcoming' },
      ],
    },
    deployment: {
      deployed: 68,
      target: 85,
      byAssetClass: [
        { name: 'Private equity', percentage: 75 },
        { name: 'Real estate', percentage: 65 },
        { name: 'Private credit', percentage: 50 },
        { name: 'Infrastructure', percentage: 35 },
        { name: 'Secondaries', percentage: 40 },
        { name: 'Venture capital', percentage: 15 },
      ],
    },
    pipeline: [],
    performance: [
      { fund: 'Apollo Secondaries IX', navDate: 'NAV 15 Mar 2026', qoqChange: -3.2 },
      { fund: 'GCC RE Fund III', navDate: 'NAV 31 Mar 2026', qoqChange: 12.4 },
    ],
    keyNews: [
      { id: 'mn-008', headline: 'UAE CIT implementation update', summary: 'New guidance on fund exemptions — review impact on Noor Holdings structure.', source: 'KPMG' },
    ],
    pendingItems: [
      { title: 'Wire confirmation — awaiting client' },
      { title: 'Tax filing — deadline approaching' },
      { title: 'AML documentation — to file' },
    ],
  },

  // Day 3 — mb-007: Internal Q1 book review
  {
    id: 'mb-007',
    clientName: 'Internal',
    date: meetingDate('mb-007'),
    time: '2:30 PM',
    attendees: [
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
      { name: 'Emily Chen', role: 'Head of Advisory' },
      { name: 'David Park', role: 'Portfolio Analyst' },
    ],
    format: 'in-person',
    duration: '90 min',
    summary: {
      goal: 'Q1 performance review across all client portfolios. Align on pipeline priorities and capacity allocation for Q2.',
      mainTopics: [
        'Consolidated Q1 performance — total AUM $4.25B, +13.8% YTD. Review by client and asset class.',
        'Pipeline priorities — GCC Data Centers Fund I (3 clients interested), Apex Logistics co-invest (2 clients).',
      ],
      secondaryTopics: [
        'Team capacity — onboarding Zenith Capital requires dedicated resource for 4 weeks.',
      ],
    },
    capitalFlows: {
      funded: '$28.5M',
      distributed: '$18.2M',
      notices: [
        { fund: 'All Clients — Q1 Total Calls', type: 'capital_call', amount: '$15.3M', status: 'upcoming' },
        { fund: 'All Clients — Q1 Total Distributions', type: 'distribution', amount: '$12.8M', status: 'received' },
      ],
    },
    deployment: {
      deployed: 425,
      target: 500,
      byAssetClass: [
        { name: 'Private equity', percentage: 88 },
        { name: 'Real estate', percentage: 72 },
        { name: 'Private credit', percentage: 55 },
        { name: 'Infrastructure', percentage: 48 },
        { name: 'Secondaries', percentage: 52 },
        { name: 'Venture capital', percentage: 28 },
      ],
    },
    pipeline: [
      { name: 'GCC Data Centers Fund I', category: 'Infrastructure', description: 'Al-Rashidi ($3M), Hamdan ($1.5M), Veritas ($5M) — total pipeline $9.5M.' },
      { name: 'Apex Logistics', category: 'Logistics', description: 'Al-Rashidi ($2M), Hamdan ($2M) — IC review pending.' },
    ],
    performance: [
      { fund: 'GCC RE Fund III', navDate: 'NAV 31 Mar 2026', qoqChange: 12.4 },
      { fund: 'KKR Infrastructure II', navDate: 'NAV 25 Mar 2026', qoqChange: 8.7 },
      { fund: 'Carlyle Europe V', navDate: 'NAV 28 Feb 2026', qoqChange: 6.1 },
      { fund: 'Apollo Secondaries IX', navDate: 'NAV 15 Mar 2026', qoqChange: -3.2 },
      { fund: 'BREIT', navDate: 'NAV 29 Feb 2026', qoqChange: -1.8 },
    ],
    keyNews: [
      { id: 'mn-009', headline: 'PE fundraising slows in Q1', summary: 'LP selectivity increasing — position our pipeline conversations accordingly.', source: 'Bain' },
    ],
    pendingItems: [
      { title: 'Q1 consolidated report — draft due Friday' },
      { title: 'Zenith onboarding — resource allocation needed' },
    ],
  },

  // Day 4 — mb-008: Zenith Capital onboarding
  {
    id: 'mb-008',
    clientName: 'Zenith Capital',
    date: meetingDate('mb-008'),
    time: '10:30 AM',
    attendees: [
      { name: 'Richard Zenith', role: 'Founder' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
      { name: 'Compliance Officer', role: 'KYC/AML' },
    ],
    format: 'in-person',
    duration: '90 min',
    summary: {
      goal: 'Complete investment objectives discussion, finalize risk profiling, and set up IPS framework for new client.',
      mainTopics: [
        'Investment objectives — target return, risk tolerance, liquidity needs, time horizon. Define strategic asset allocation.',
      ],
      secondaryTopics: [
        'KYC/AML documentation — review submitted questionnaire and identify any gaps.',
      ],
    },
    capitalFlows: { funded: '$0', distributed: '$0', notices: [] },
    deployment: {
      deployed: 0,
      target: 50,
      byAssetClass: [
        { name: 'Private equity', percentage: 0 },
        { name: 'Real estate', percentage: 0 },
        { name: 'Private credit', percentage: 0 },
        { name: 'Infrastructure', percentage: 0 },
        { name: 'Secondaries', percentage: 0 },
        { name: 'Venture capital', percentage: 0 },
      ],
    },
    pipeline: [
      { name: 'Initial Portfolio Build', category: 'Multi-Asset', description: 'Target $50M deployment across 6 asset classes over 12-18 months.' },
    ],
    performance: [],
    keyNews: [],
    pendingItems: [
      { title: 'KYC/AML documentation — under review' },
      { title: 'Risk profile assessment — to complete' },
      { title: 'IPS draft — to prepare after meeting' },
    ],
  },

  // Day 4 — mb-009: Al-Rashidi — Apex deep dive
  {
    id: 'mb-009',
    clientName: 'Al-Rashidi Family',
    date: meetingDate('mb-009'),
    time: '1:00 PM',
    attendees: [
      { name: 'Ahmed Al-Rashidi', role: 'CFO' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
      { name: 'Maria Santos', role: 'Deal Lead' },
    ],
    format: 'video',
    duration: '45 min',
    summary: {
      goal: 'Deep dive into Apex Logistics co-invest — address IC questions on operating margins and customer concentration before commitment.',
      mainTopics: [
        'Apex operating metrics — EBITDA margins at 14.2%, customer concentration top-3 at 38%. Compare to sector benchmarks.',
      ],
      secondaryTopics: [
        'Red Sea disruption impact on logistics sector — discuss risk mitigation in Apex portfolio.',
      ],
    },
    capitalFlows: {
      funded: '$7.1M',
      distributed: '$5.97M',
      notices: [
        { fund: 'GCC RE Fund III', type: 'capital_call', amount: '$3.2M', status: 'overdue' },
      ],
    },
    deployment: {
      deployed: 98,
      target: 120,
      byAssetClass: [
        { name: 'Private equity', percentage: 85 },
        { name: 'Real estate', percentage: 72 },
        { name: 'Private credit', percentage: 65 },
        { name: 'Infrastructure', percentage: 45 },
        { name: 'Secondaries', percentage: 55 },
        { name: 'Venture capital', percentage: 30 },
      ],
    },
    pipeline: [
      { name: 'Apex Logistics', category: 'Logistics', description: '$2M co-invest. IC has follow-up questions on margins and customer concentration.' },
    ],
    performance: [
      { fund: 'GCC RE Fund III', navDate: 'NAV 31 Mar 2026', qoqChange: 12.4 },
      { fund: 'KKR Infrastructure II', navDate: 'NAV 25 Mar 2026', qoqChange: 8.7 },
    ],
    keyNews: [
      { id: 'mn-010', headline: 'Global logistics sector recovers', summary: 'Freight rates normalizing after 2-year correction — supportive for Apex.', source: 'Drewry' },
      { id: 'mn-011', headline: 'Red Sea disruptions continue into Q2', summary: 'Risk factor to discuss — Apex has minimal direct exposure but supply chain knock-on effects possible.', source: 'FT' },
    ],
    pendingItems: [
      { title: 'IC follow-up questions — operating margins' },
      { title: 'GCC RE Fund III capital call — overdue' },
    ],
  },

  // Day 4 — mb-010: Hamdan Trust — estate planning
  {
    id: 'mb-010',
    clientName: 'Hamdan Trust',
    date: meetingDate('mb-010'),
    time: '4:00 PM',
    attendees: [
      { name: 'Khalid Hamdan', role: 'Trustee' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
      { name: 'Legal Counsel', role: 'External' },
    ],
    format: 'in-person',
    duration: '60 min',
    summary: {
      goal: 'Review updated succession deed, discuss trust structure amendments, and align on next steps for generational wealth transfer.',
      mainTopics: [
        'Succession deed walkthrough — all amendments incorporated per legal review. Need trustee sign-off.',
      ],
      secondaryTopics: [
        'Trust structure optimization — potential CIT implications under new UAE tax regime.',
      ],
    },
    capitalFlows: {
      funded: '$5.5M',
      distributed: '$3.2M',
      notices: [
        { fund: 'GCC RE Fund III', type: 'capital_call', amount: '$2.8M', status: 'upcoming' },
      ],
    },
    deployment: {
      deployed: 72,
      target: 95,
      byAssetClass: [
        { name: 'Private equity', percentage: 78 },
        { name: 'Real estate', percentage: 80 },
        { name: 'Private credit', percentage: 45 },
        { name: 'Infrastructure', percentage: 55 },
        { name: 'Secondaries', percentage: 35 },
        { name: 'Venture capital', percentage: 20 },
      ],
    },
    pipeline: [],
    performance: [
      { fund: 'GCC RE Fund III', navDate: 'NAV 31 Mar 2026', qoqChange: 12.4 },
    ],
    keyNews: [
      { id: 'mn-012', headline: 'UAE CIT — fund exemption clarity', summary: 'New QAHC guidance may affect trust structure — discuss with legal.', source: 'EY' },
    ],
    pendingItems: [
      { title: 'Succession deed — ready for signing' },
      { title: 'DocuSign — subscription agreement pending' },
      { title: '10-year anniversary recognition — plan action' },
    ],
  },

  // Day 5 — mb-011: Al-Farsi distribution strategy
  {
    id: 'mb-011',
    clientName: 'Al-Farsi Family',
    date: meetingDate('mb-011'),
    time: '11:00 AM',
    attendees: [
      { name: 'Omar Al-Farsi', role: 'Family Office Director' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
    ],
    format: 'video',
    duration: '30 min',
    summary: {
      goal: 'Decide on BREIT distribution reinvestment — $4.65M received, client wants to discuss options before committing.',
      mainTopics: [
        'Three options: (1) reinvest in BREIT, (2) deploy into private credit to address underweight, (3) hold cash for upcoming capital calls.',
      ],
      secondaryTopics: [],
    },
    capitalFlows: {
      funded: '$3.8M',
      distributed: '$5.1M',
      notices: [
        { fund: 'BREIT', type: 'distribution', amount: '$4.65M', status: 'received' },
      ],
    },
    deployment: {
      deployed: 110,
      target: 120,
      byAssetClass: [
        { name: 'Private equity', percentage: 95 },
        { name: 'Real estate', percentage: 75 },
        { name: 'Private credit', percentage: 40 },
        { name: 'Infrastructure', percentage: 60 },
        { name: 'Secondaries', percentage: 50 },
        { name: 'Venture capital', percentage: 35 },
      ],
    },
    pipeline: [],
    performance: [
      { fund: 'BREIT', navDate: 'NAV 29 Feb 2026', qoqChange: -1.8 },
    ],
    keyNews: [
      { id: 'mn-013', headline: 'Private credit market hits record AUM', summary: 'Strong supply of deals — good environment for deployment into credit.', source: 'Preqin' },
    ],
    pendingItems: [
      { title: 'BREIT distribution — allocation instruction needed' },
    ],
  },

  // Day 5 — mb-012: Internal compliance cert
  {
    id: 'mb-012',
    clientName: 'Internal',
    date: meetingDate('mb-012'),
    time: '3:30 PM',
    attendees: [
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
      { name: 'Compliance Officer', role: 'Head of Compliance' },
    ],
    format: 'in-person',
    duration: '30 min',
    summary: {
      goal: 'Review and sign off on Q1 compliance certification. Ensure all outstanding items are addressed before deadline.',
      mainTopics: [
        'Q1 certification checklist — 12 items, 3 requiring RM sign-off. Review and clear.',
      ],
      secondaryTopics: [],
    },
    capitalFlows: { funded: '$0', distributed: '$0', notices: [] },
    deployment: { deployed: 0, target: 0, byAssetClass: [] },
    pipeline: [],
    performance: [],
    keyNews: [],
    pendingItems: [
      { title: 'Q1 compliance certification — 3 items pending sign-off' },
      { title: 'Annual compliance training — 2 team members outstanding' },
    ],
  },

  // Day 6 — mb-013: Meridian rebalancing execution
  {
    id: 'mb-013',
    clientName: 'Meridian Capital',
    date: meetingDate('mb-013'),
    time: '9:30 AM',
    attendees: [
      { name: 'Sarah Meridian', role: 'CIO' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
      { name: 'Trading Desk', role: 'Execution' },
    ],
    format: 'video',
    duration: '30 min',
    summary: {
      goal: 'Finalize rebalancing execution plan and confirm trade schedule with client before market open.',
      mainTopics: [
        'Execution plan: reduce PE exposure by $2.1M, increase credit allocation by $1.8M, add $0.3M to infrastructure.',
      ],
      secondaryTopics: [],
    },
    capitalFlows: {
      funded: '$4.2M',
      distributed: '$2.8M',
      notices: [
        { fund: 'Rebalance Trades', type: 'capital_call', amount: '$2.1M', status: 'to_approve' },
      ],
    },
    deployment: {
      deployed: 85,
      target: 100,
      byAssetClass: [
        { name: 'Private equity', percentage: 92 },
        { name: 'Real estate', percentage: 68 },
        { name: 'Private credit', percentage: 52 },
        { name: 'Infrastructure', percentage: 38 },
        { name: 'Secondaries', percentage: 60 },
        { name: 'Venture capital', percentage: 25 },
      ],
    },
    pipeline: [],
    performance: [
      { fund: 'KKR Infrastructure II', navDate: 'NAV 25 Mar 2026', qoqChange: 8.7 },
      { fund: 'Carlyle Europe V', navDate: 'NAV 28 Feb 2026', qoqChange: 6.1 },
    ],
    keyNews: [
      { id: 'mn-014', headline: 'European PE exits pick up pace', summary: 'Improving exit environment supports PE reduction timing.', source: 'Mergermarket' },
    ],
    pendingItems: [
      { title: 'Rebalancing execution — confirm trade schedule' },
    ],
  },

  // Day 6 — mb-014: Zenith IPS finalization
  {
    id: 'mb-014',
    clientName: 'Zenith Capital',
    date: meetingDate('mb-014'),
    time: '2:00 PM',
    attendees: [
      { name: 'Richard Zenith', role: 'Founder' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
    ],
    format: 'video',
    duration: '45 min',
    summary: {
      goal: 'Review client edits to IPS draft, finalize investment policy statement, and agree on initial portfolio construction timeline.',
      mainTopics: [
        'IPS amendments — client requested higher allocation to infrastructure (15% vs 10%) and lower VC exposure (3% vs 5%).',
      ],
      secondaryTopics: [
        'Initial deployment timeline — target 40% deployed within 6 months.',
      ],
    },
    capitalFlows: { funded: '$0', distributed: '$0', notices: [] },
    deployment: {
      deployed: 0,
      target: 50,
      byAssetClass: [
        { name: 'Private equity', percentage: 0 },
        { name: 'Real estate', percentage: 0 },
        { name: 'Private credit', percentage: 0 },
        { name: 'Infrastructure', percentage: 0 },
        { name: 'Secondaries', percentage: 0 },
        { name: 'Venture capital', percentage: 0 },
      ],
    },
    pipeline: [
      { name: 'GCC Data Centers Fund I', category: 'Infrastructure', description: 'Potential first commitment — aligns with increased infra allocation.' },
    ],
    performance: [],
    keyNews: [
      { id: 'mn-015', headline: 'Data center demand surges in GCC', summary: 'Relevant for proposed infrastructure allocation.', source: 'Gulf Business' },
    ],
    pendingItems: [
      { title: 'IPS — incorporate client edits and finalize' },
      { title: 'Risk profile — pending compliance approval' },
    ],
  },

  // Day 7 — mb-015: Hamdan succession docs
  {
    id: 'mb-015',
    clientName: 'Hamdan Trust',
    date: meetingDate('mb-015'),
    time: '10:00 AM',
    attendees: [
      { name: 'Khalid Hamdan', role: 'Trustee' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
      { name: 'External Legal', role: 'Counsel' },
    ],
    format: 'in-person',
    duration: '60 min',
    summary: {
      goal: 'Walk through final succession deed with legal counsel and obtain trustee signature.',
      mainTopics: [
        'Succession deed — all amendments from prior review incorporated. Clause-by-clause walkthrough with legal.',
      ],
      secondaryTopics: [
        'Trust protector appointment — new provision for independent oversight.',
      ],
    },
    capitalFlows: {
      funded: '$5.5M',
      distributed: '$3.2M',
      notices: [],
    },
    deployment: {
      deployed: 72,
      target: 95,
      byAssetClass: [
        { name: 'Private equity', percentage: 78 },
        { name: 'Real estate', percentage: 80 },
        { name: 'Private credit', percentage: 45 },
        { name: 'Infrastructure', percentage: 55 },
        { name: 'Secondaries', percentage: 35 },
        { name: 'Venture capital', percentage: 20 },
      ],
    },
    pipeline: [],
    performance: [],
    keyNews: [],
    pendingItems: [
      { title: 'Succession deed — signing today' },
      { title: 'Trust protector — selection process to begin' },
    ],
  },

  // Day 7 — mb-016: Noor Holdings Q1 review
  {
    id: 'mb-016',
    clientName: 'Noor Holdings',
    date: meetingDate('mb-016'),
    time: '2:00 PM',
    attendees: [
      { name: 'Hassan Noor', role: 'CFO' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
    ],
    format: 'video',
    duration: '45 min',
    summary: {
      goal: 'Present Q1 performance summary and discuss pipeline opportunities for H2 deployment.',
      mainTopics: [
        'Q1 performance — portfolio up 4.8% overall. GCC RE Fund III leading at +12.4%, offset by Apollo IX at -3.2%.',
      ],
      secondaryTopics: [
        'Pipeline discussion — GCC Data Centers and private credit opportunities.',
      ],
    },
    capitalFlows: {
      funded: '$4.5M',
      distributed: '$2.1M',
      notices: [
        { fund: 'Apollo IX', type: 'capital_call', amount: '$1.4M', status: 'upcoming' },
      ],
    },
    deployment: {
      deployed: 68,
      target: 85,
      byAssetClass: [
        { name: 'Private equity', percentage: 75 },
        { name: 'Real estate', percentage: 65 },
        { name: 'Private credit', percentage: 50 },
        { name: 'Infrastructure', percentage: 35 },
        { name: 'Secondaries', percentage: 40 },
        { name: 'Venture capital', percentage: 15 },
      ],
    },
    pipeline: [
      { name: 'GCC Data Centers Fund I', category: 'Infrastructure', description: 'Under consideration — aligns with infrastructure target increase.' },
    ],
    performance: [
      { fund: 'GCC RE Fund III', navDate: 'NAV 31 Mar 2026', qoqChange: 12.4 },
      { fund: 'Apollo Secondaries IX', navDate: 'NAV 15 Mar 2026', qoqChange: -3.2 },
      { fund: 'KKR Infrastructure II', navDate: 'NAV 25 Mar 2026', qoqChange: 8.7 },
    ],
    keyNews: [
      { id: 'mn-016', headline: 'KKR Infrastructure II posts strong Q1', summary: 'Ahead-of-schedule construction driving returns.', source: 'Infrastructure Investor' },
    ],
    pendingItems: [
      { title: 'Capital call — wire confirmation pending' },
      { title: 'Tax filing — deadline this week' },
    ],
  },

  // Day 8 — mb-017: Veritas Q1 deep dive
  {
    id: 'mb-017',
    clientName: 'Veritas Group',
    date: meetingDate('mb-017'),
    time: '9:30 AM',
    attendees: [
      { name: 'Marcus Veritas', role: 'CEO' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
    ],
    format: 'video',
    duration: '60 min',
    summary: {
      goal: 'Q1 performance deep dive and present new allocation proposals for H2 — focus on infrastructure and credit opportunities.',
      mainTopics: [
        'Q1 returns — portfolio +6.2% overall. Strong RE and infra, weaker secondaries. Propose increasing credit allocation.',
      ],
      secondaryTopics: [
        'Fund transfer — $2.5M to Apollo IX needs execution.',
      ],
    },
    capitalFlows: {
      funded: '$6.3M',
      distributed: '$4.1M',
      notices: [
        { fund: 'Apollo IX', type: 'capital_call', amount: '$2.5M', status: 'to_approve' },
      ],
    },
    deployment: {
      deployed: 92,
      target: 110,
      byAssetClass: [
        { name: 'Private equity', percentage: 88 },
        { name: 'Real estate', percentage: 70 },
        { name: 'Private credit', percentage: 55 },
        { name: 'Infrastructure', percentage: 42 },
        { name: 'Secondaries', percentage: 48 },
        { name: 'Venture capital', percentage: 22 },
      ],
    },
    pipeline: [
      { name: 'GCC Data Centers Fund I', category: 'Infrastructure', description: '$5M commitment under discussion.' },
    ],
    performance: [
      { fund: 'GCC RE Fund III', navDate: 'NAV 31 Mar 2026', qoqChange: 12.4 },
      { fund: 'KKR Infrastructure II', navDate: 'NAV 25 Mar 2026', qoqChange: 8.7 },
      { fund: 'Apollo Secondaries IX', navDate: 'NAV 15 Mar 2026', qoqChange: -3.2 },
    ],
    keyNews: [
      { id: 'mn-017', headline: 'US commercial RE showing stabilization', summary: 'BREIT and GCC RE positions may benefit.', source: 'CBRE Research' },
    ],
    pendingItems: [
      { title: 'Fund transfer — $2.5M to Apollo IX' },
      { title: 'Subscription agreement — WDR still pending' },
    ],
  },

  // Day 8 — mb-018: Internal team standup
  {
    id: 'mb-018',
    clientName: 'Internal',
    date: meetingDate('mb-018'),
    time: '11:30 AM',
    attendees: [
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
      { name: 'Emily Chen', role: 'Head of Advisory' },
      { name: 'Team', role: 'Advisory Team' },
    ],
    format: 'in-person',
    duration: '30 min',
    summary: {
      goal: 'Weekly team standup — pipeline updates, capacity check, and blockers review.',
      mainTopics: [
        'Pipeline status: GCC Data Centers ($9.5M across 3 clients), Apex co-invest ($4M across 2 clients). Zenith onboarding in progress.',
      ],
      secondaryTopics: [
        'NAV data upload backlog — 3 funds pending manual entry.',
      ],
    },
    capitalFlows: { funded: '$0', distributed: '$0', notices: [] },
    deployment: { deployed: 0, target: 0, byAssetClass: [] },
    pipeline: [
      { name: 'GCC Data Centers Fund I', category: 'Infrastructure', description: '$9.5M total pipeline across 3 clients.' },
      { name: 'Apex Logistics', category: 'Logistics', description: '$4M across 2 clients — IC review pending.' },
    ],
    performance: [],
    keyNews: [],
    pendingItems: [
      { title: 'NAV data upload — 3 funds pending' },
      { title: 'Zenith onboarding — 2 weeks remaining' },
    ],
  },

  // Day 9 — mb-019: IC Apex review
  {
    id: 'mb-019',
    clientName: 'Internal',
    date: meetingDate('mb-019'),
    time: '10:00 AM',
    attendees: [
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
      { name: 'Maria Santos', role: 'Deal Lead' },
      { name: 'Investment Committee', role: 'IC Members' },
    ],
    format: 'in-person',
    duration: '90 min',
    summary: {
      goal: 'IC review of Apex Logistics co-invest. Present updated DD findings and seek formal IC approval for client commitments.',
      mainTopics: [
        'Apex DD summary: EBITDA margins 14.2%, revenue CAGR 22%, customer concentration 38% top-3. Risk score: moderate.',
        'Proposed commitments: Al-Rashidi $2M, Hamdan $2M. Total $4M.',
      ],
      secondaryTopics: [
        'Red Sea risk assessment — minimal direct exposure but supply chain monitoring recommended.',
      ],
    },
    capitalFlows: { funded: '$0', distributed: '$0', notices: [] },
    deployment: { deployed: 0, target: 0, byAssetClass: [] },
    pipeline: [
      { name: 'Apex Logistics', category: 'Logistics', description: 'IC decision required. $4M total across 2 clients.' },
    ],
    performance: [],
    keyNews: [
      { id: 'mn-018', headline: 'Global logistics sector recovers', summary: 'Supportive market context for IC discussion.', source: 'Drewry' },
    ],
    pendingItems: [
      { title: 'IC approval — Apex co-invest' },
      { title: 'Additional DD — operating margin analysis' },
    ],
  },

  // Day 9 — mb-020: Al-Rashidi monthly check-in
  {
    id: 'mb-020',
    clientName: 'Al-Rashidi Family',
    date: meetingDate('mb-020'),
    time: '2:00 PM',
    attendees: [
      { name: 'Ahmed Al-Rashidi', role: 'CFO' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
    ],
    format: 'phone',
    duration: '30 min',
    summary: {
      goal: 'Monthly check-in call — review March statement, discuss any concerns, and preview upcoming activity.',
      mainTopics: [
        'March statement review — portfolio +2.1% MoM. No major concerns. GCC RE Fund III continues to be top performer.',
      ],
      secondaryTopics: [
        'Apex co-invest update — IC review scheduled, will update on outcome.',
      ],
    },
    capitalFlows: {
      funded: '$7.1M',
      distributed: '$5.97M',
      notices: [
        { fund: 'GCC RE Fund III', type: 'capital_call', amount: '$3.2M', status: 'overdue' },
      ],
    },
    deployment: {
      deployed: 98,
      target: 120,
      byAssetClass: [
        { name: 'Private equity', percentage: 85 },
        { name: 'Real estate', percentage: 72 },
        { name: 'Private credit', percentage: 65 },
        { name: 'Infrastructure', percentage: 45 },
        { name: 'Secondaries', percentage: 55 },
        { name: 'Venture capital', percentage: 30 },
      ],
    },
    pipeline: [
      { name: 'Apex Logistics', category: 'Logistics', description: 'IC review pending — $2M co-invest.' },
    ],
    performance: [
      { fund: 'GCC RE Fund III', navDate: 'NAV 31 Mar 2026', qoqChange: 12.4 },
    ],
    keyNews: [],
    pendingItems: [
      { title: 'GCC RE Fund III capital call — overdue' },
      { title: 'Annual risk questionnaire — due this quarter' },
    ],
  },

  // Day 9 — mb-021: Meridian co-invest pipeline
  {
    id: 'mb-021',
    clientName: 'Meridian Capital',
    date: meetingDate('mb-021'),
    time: '4:00 PM',
    attendees: [
      { name: 'Sarah Meridian', role: 'CIO' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
    ],
    format: 'video',
    duration: '45 min',
    summary: {
      goal: 'Discuss co-investment pipeline — Apex Logistics and GCC Data Centers. Assess fit with Meridian\'s updated allocation strategy.',
      mainTopics: [
        'Post-rebalancing allocation review. Apex: $1.5M co-invest (logistics, growth). GCC Data Centers: $3M (infra, contracted).',
      ],
      secondaryTopics: [
        'Fee invoice discrepancy — resolution update.',
      ],
    },
    capitalFlows: {
      funded: '$4.2M',
      distributed: '$2.8M',
      notices: [],
    },
    deployment: {
      deployed: 85,
      target: 100,
      byAssetClass: [
        { name: 'Private equity', percentage: 88 },
        { name: 'Real estate', percentage: 68 },
        { name: 'Private credit', percentage: 55 },
        { name: 'Infrastructure', percentage: 41 },
        { name: 'Secondaries', percentage: 60 },
        { name: 'Venture capital', percentage: 25 },
      ],
    },
    pipeline: [
      { name: 'Apex Logistics', category: 'Logistics', description: '$1.5M co-invest under consideration.' },
      { name: 'GCC Data Centers Fund I', category: 'Infrastructure', description: '$3M commitment — fills infra gap post-rebalancing.' },
    ],
    performance: [
      { fund: 'KKR Infrastructure II', navDate: 'NAV 25 Mar 2026', qoqChange: 8.7 },
      { fund: 'Carlyle Europe V', navDate: 'NAV 28 Feb 2026', qoqChange: 6.1 },
    ],
    keyNews: [
      { id: 'mn-019', headline: 'Data center demand surges in GCC', summary: 'Supports GCC Data Centers Fund I thesis.', source: 'Gulf Business' },
    ],
    pendingItems: [
      { title: 'Fee invoice discrepancy — under review' },
      { title: 'Rebalancing trades — execution complete' },
    ],
  },

  // Day 10 — mb-022: Hamdan GCC DC subscription
  {
    id: 'mb-022',
    clientName: 'Hamdan Trust',
    date: meetingDate('mb-022'),
    time: '9:00 AM',
    attendees: [
      { name: 'Khalid Hamdan', role: 'Trustee' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
    ],
    format: 'in-person',
    duration: '45 min',
    summary: {
      goal: 'Sign subscription agreement for GCC Data Centers Fund I ($1.5M commitment) and discuss next steps.',
      mainTopics: [
        'Subscription signing — $1.5M commitment to GCC Data Centers Fund I. Review terms and expected call schedule.',
      ],
      secondaryTopics: [
        'Succession deed — signed last week, confirm filing status.',
      ],
    },
    capitalFlows: {
      funded: '$5.5M',
      distributed: '$3.2M',
      notices: [
        { fund: 'GCC Data Centers Fund I', type: 'capital_call', amount: '$0.38M', status: 'upcoming' },
      ],
    },
    deployment: {
      deployed: 72,
      target: 95,
      byAssetClass: [
        { name: 'Private equity', percentage: 78 },
        { name: 'Real estate', percentage: 80 },
        { name: 'Private credit', percentage: 45 },
        { name: 'Infrastructure', percentage: 58 },
        { name: 'Secondaries', percentage: 35 },
        { name: 'Venture capital', percentage: 20 },
      ],
    },
    pipeline: [],
    performance: [
      { fund: 'GCC RE Fund III', navDate: 'NAV 31 Mar 2026', qoqChange: 12.4 },
    ],
    keyNews: [],
    pendingItems: [
      { title: 'GCC Data Centers — subscription signing today' },
      { title: 'Succession deed — confirm filing' },
    ],
  },

  // Day 10 — mb-023: Al-Farsi tax planning
  {
    id: 'mb-023',
    clientName: 'Al-Farsi Family',
    date: meetingDate('mb-023'),
    time: '11:00 AM',
    attendees: [
      { name: 'Omar Al-Farsi', role: 'Family Office Director' },
      { name: 'Raoof Naushad', role: 'Relationship Manager' },
      { name: 'Tax Advisor', role: 'External' },
    ],
    format: 'video',
    duration: '60 min',
    summary: {
      goal: 'Review CIT advisory memo and discuss optimal fund holding structure to minimize tax impact under new UAE regime.',
      mainTopics: [
        'CIT structure review — tax advisor proposes QAHC structure for fund holdings. Potential savings of 3-5% on realized gains.',
      ],
      secondaryTopics: [
        'Fund exemption criteria — which existing positions qualify under new QAHC rules.',
      ],
    },
    capitalFlows: {
      funded: '$3.8M',
      distributed: '$5.1M',
      notices: [],
    },
    deployment: {
      deployed: 110,
      target: 120,
      byAssetClass: [
        { name: 'Private equity', percentage: 95 },
        { name: 'Real estate', percentage: 75 },
        { name: 'Private credit', percentage: 40 },
        { name: 'Infrastructure', percentage: 60 },
        { name: 'Secondaries', percentage: 50 },
        { name: 'Venture capital', percentage: 35 },
      ],
    },
    pipeline: [],
    performance: [],
    keyNews: [
      { id: 'mn-020', headline: 'UAE CIT — fund exemption clarity', summary: 'QAHC structures may benefit — central topic for today\'s meeting.', source: 'EY' },
    ],
    pendingItems: [
      { title: 'CIT structure memo — review and decide' },
      { title: 'BREIT distribution allocation — still pending' },
    ],
  },
]

export const MEETING_BRIEFS: MeetingBrief[] = briefs

export function getMeetingBriefById(id: string): MeetingBrief | undefined {
  return MEETING_BRIEFS.find((b) => b.id === id)
}
