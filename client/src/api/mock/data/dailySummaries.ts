import type { DailySummary, RelationshipPool } from '@/api/types'

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

function getBusinessDays(count: number): string[] {
  const dates: string[] = []
  // Start from yesterday so today is not pre-loaded (empty state demo)
  const d = new Date()
  d.setDate(d.getDate() - 1)
  while (dates.length < count) {
    const day = d.getDay()
    if (day !== 0 && day !== 6) {
      dates.push(d.toISOString().split('T')[0])
    }
    d.setDate(d.getDate() - 1)
  }
  return dates
}

const DATES = getBusinessDays(10)

export const TODAY = getTodayString()

function getNextBusinessDays(count: number): string[] {
  const dates: string[] = []
  const d = new Date()
  d.setDate(d.getDate() + 1)
  while (dates.length < count) {
    const day = d.getDay()
    if (day !== 0 && day !== 6) {
      dates.push(d.toISOString().split('T')[0])
    }
    d.setDate(d.getDate() + 1)
  }
  return dates
}

const TOMORROW = getNextBusinessDays(1)[0]

const CLIENT_HREF = 'https://staging.asbitech.ai/engage/clients?taskStatus=2&page=0&size=20&sort=createdDate%2Casc'

// ── Shared Relationship Pool ────────────────────────────────────────

const RELATIONSHIP_POOL: RelationshipPool = {
  totalClients: 24,
  clientsTrend: 3,
  segmentSplit: [
    { segment: 'Affluents', count: 18 },
    { segment: 'HNI', count: 4 },
    { segment: 'UHNI', count: 2 },
  ],
  totalNetworth: '$347.2m',
  networthTrend: 12.4,
  deployableGaps: [
    { assetClass: 'PE', amount: '$63m', amountNumeric: 63 },
    { assetClass: 'RE', amount: '$34m', amountNumeric: 34 },
    { assetClass: 'Public Equities', amount: '$20m', amountNumeric: 20 },
    { assetClass: 'PD', amount: '$25m', amountNumeric: 25 },
  ],
  insights: [
    '20 clients are looking for PE deals. Talk to deals to prioritize PE.',
    '3 clients have upcoming KYC renewals this month — prioritize outreach.',
  ],
}

// ── Day 1 (Today) ───────────────────────────────────────────────────

const day1: DailySummary = {
  id: 'ds-001',
  date: DATES[0],
  relationshipPool: RELATIONSHIP_POOL,
  sections: {
    portfolioAlerts: [
      { id: 'pa-001', category: 'portfolio_drift', clientName: 'Al Rashidi Family', clientEmail: 'ahmed@alrashidi-fo.com', clientHref: CLIENT_HREF, description: 'Falling behind allocation execution in PE — prioritize discussion in next meeting', severity: 'warning' },
      { id: 'pa-002', category: 'portfolio_drift', clientName: 'George Smith', clientEmail: 'george.smith@smithcapital.com', clientHref: CLIENT_HREF, description: 'Overallocated to public equities by 5%', severity: 'warning' },
      { id: 'pa-003', category: 'portfolio_drift', clientName: '10 clients', clientEmail: 'team@invictus-ai.com', clientHref: CLIENT_HREF, description: 'Need to increase yield — talk to investment team', severity: 'warning' },
      { id: 'pa-004', category: 'margin_call', clientName: 'Noor Holdings', clientEmail: 'khalid.noor@noorholdings.com', clientHref: CLIENT_HREF, description: 'Margin call triggered on leveraged RE position — exposure at 112%, requires immediate action', severity: 'critical' },
    ],
    newsAlerts: [
      {
        id: 'na-001',
        headline: 'Change in Fed Rates',
        summary: 'The Fed rate decision means your fixed income allocation is now 3 percentage points over target. We recommend trimming $2M from short-duration bonds.',
        source: 'Bloomberg',
        sourceUrl: 'https://www.bloomberg.com/news/articles/fed-rate-decision-impact',
        affectedClients: [
          { name: 'Al-Rashidi Family', impact: 'Fixed income portfolio overweight — needs rebalancing', email: 'ahmed@alrashidi-fo.com' },
          { name: 'Saqib & Family', impact: 'Bond duration exposure requires review', email: 'saqib@familyoffice.ae' },
        ],
        clientEmailSubject: 'Important: Fed Rate Decision — Impact on Your Portfolio',
        clientEmailBody: 'Dear Client,\n\nI wanted to bring to your attention the recent Federal Reserve rate decision and its implications for your portfolio.\n\nThe Fed rate decision means your fixed income allocation is now 3 percentage points over target. We recommend trimming $2M from short-duration bonds to realign with your target allocation.\n\nI would like to schedule a brief call to discuss the recommended adjustments and ensure we are aligned on the next steps.\n\nPlease let me know your availability.\n\nBest regards,\n{{ADVISOR_NAME}}\nInvictus AI Wealth Management',
        internalTaskTitle: 'Review fixed income allocation across affected clients post Fed decision',
        internalTaskDescription: 'The Fed rate decision impacts multiple client portfolios. Action required:\n\n1. Review Al-Rashidi Family fixed income allocation — currently 3pp over target\n2. Review Saqib & Family bond duration exposure\n3. Prepare rebalancing recommendations for both clients\n4. Coordinate with trading desk for execution timeline\n\nPriority: High\nDeadline: End of week',
      },
      {
        id: 'na-002',
        headline: 'Apollo Exit Delay',
        summary: 'Distributions may shift, set client expectations proactively. Showcase the impact on the portfolio.',
        source: 'Bloomberg',
        sourceUrl: 'https://www.bloomberg.com/news/articles/apollo-exit-delay-distributions',
        affectedClients: [
          { name: 'Hamdan Trust', impact: 'Expected Q2 distribution timeline affected', email: 'rashid@hamdantrust.ae' },
          { name: 'Meridian Capital', impact: 'Co-invest exit timeline may extend by 6 months', email: 'david.park@meridiancap.com' },
        ],
        clientEmailSubject: 'Update: Apollo Exit Timeline — Expected Distribution Impact',
        clientEmailBody: 'Dear Client,\n\nI am writing to inform you about a recent development regarding your Apollo investment.\n\nApollo has announced a delay in the expected exit timeline, which may impact the distribution schedule for Q2. We are proactively monitoring the situation and will keep you updated as more details emerge.\n\nWe have assessed the impact on your portfolio and would like to walk you through the implications during our next meeting.\n\nPlease do not hesitate to reach out if you have any immediate questions.\n\nBest regards,\n{{ADVISOR_NAME}}\nInvictus AI Wealth Management',
        internalTaskTitle: 'Assess Apollo exit delay impact on client portfolios',
        internalTaskDescription: 'Apollo has announced an exit delay affecting distributions. Action required:\n\n1. Quantify impact on Hamdan Trust Q2 distribution expectations\n2. Assess Meridian Capital co-invest exit timeline extension (est. 6 months)\n3. Prepare updated distribution forecasts for affected clients\n4. Coordinate with investment team for alternative liquidity options\n\nPriority: High\nDeadline: Within 48 hours',
      },
      {
        id: 'na-003',
        headline: 'Jahez Drops to All-Time Low Since IPO',
        summary: 'Jahez (6017) fell to SAR 11.08, its lowest since the IPO at SAR 42.5 (in Jan 2022 after split). The stock has lost ~74% of its value since listing.',
        source: 'Argaam',
        sourceUrl: 'https://www.argaam.com/en/under-spot-report/52066?preview=true',
        affectedClients: [
          { name: 'Al-Rashidi Family', impact: '~$10M in Jahez (20% of $50M public equity portfolio) — may need rebalancing given 74% decline from IPO', email: 'ahmed@alrashidi-fo.com' },
        ],
        clientEmailSubject: 'Alert: Jahez Stock Drop — Portfolio Impact Review',
        clientEmailBody: 'Dear Client,\n\nI am writing to alert you to a significant development regarding your Jahez (6017) holding.\n\nJahez has dropped to SAR 11.08, its lowest price since the IPO at SAR 42.5 in October 2021, representing a ~74% decline. As this ~$10M position represents approximately 20% of your $50M public equity portfolio, we recommend scheduling a review to discuss rebalancing options.\n\nI would like to arrange a call at your earliest convenience to discuss next steps.\n\nBest regards,\n{{ADVISOR_NAME}}\nInvictus AI Wealth Management',
        internalTaskTitle: 'Review Jahez exposure for Al-Rashidi Family',
        internalTaskDescription: 'Jahez (6017) has dropped to SAR 11.08 (all-time low since IPO). Action required:\n\n1. Review Al-Rashidi Family public equity exposure — Jahez is ~$10M (20% of $50M public equity portfolio)\n2. Pull historical context: Al-Rashidi family was founding investor at IPO (Jan 2022 after split), IC meeting in Oct 2022 decided to hold\n3. Prepare rebalancing recommendation\n4. Coordinate with Saqib Al-Rashidi given personal relationship with Jahez founders\n\nPriority: High\nDeadline: End of day',
      },
    ],
    actionItems: [
      { id: 'ai-001', title: 'Al Rashidi Family — KYC Renewal', client: 'Al Rashidi Family', source: 'crm', description: 'Awaiting updated KYC documents — renewal overdue', owner: 'client' },
      { id: 'ai-002', title: 'Hamdan Trust — DocuSign', client: 'Hamdan Trust', source: 'email', description: 'Subscription agreement sent via DocuSign — pending signature', owner: 'client' },
      { id: 'ai-003', title: 'GCC RE Fund III — Pending Distribution Transfer to Client', client: 'GCC RE Fund III', source: 'invest_admin', description: 'Fund distribution approved — awaiting transfer to client account', owner: 'internal' },
      { id: 'ai-004', title: 'Veritas — Q1 Statement', client: 'Veritas Group', source: 'task_hub', description: 'Investment statement outstanding for 6 months — escalate with fund manager', owner: 'client' },
    ],
    meetings: [
      { id: 'dm-001', meetingId: 'mb-001', time: '09:30', date: DATES[0], clientName: 'Al-Rashidi Family', topic: 'Quarterly update with pending KYC discussion', attendees: ['{{ADVISOR_NAME}}', 'Ahmed Al-Rashidi', 'Sarah Chen'], hasBrief: true, briefLabel: 'Meeting brief' },
      { id: 'dm-002', meetingId: 'mb-002', time: '11:00', date: DATES[0], clientName: 'Meridian Capital', topic: 'Portfolio allocation and rebalancing topics', attendees: ['{{ADVISOR_NAME}}', 'David Park', 'Lisa Monroe'], hasBrief: true, briefLabel: 'Meeting brief' },
      { id: 'dm-003', meetingId: 'mb-003', time: '14:00', date: DATES[0], clientName: 'Hamdan Trust', topic: 'Apex deal evaluation and commitment decision', attendees: ['{{ADVISOR_NAME}}', 'Rashid Hamdan', 'Omar Khalil'], hasBrief: true, briefLabel: 'Meeting brief' },
      { id: 'dm-004', meetingId: 'mb-004', time: '10:00', date: TOMORROW, clientName: 'Al-Farsi Family', topic: 'Semi-annual portfolio performance discussion', attendees: ['{{ADVISOR_NAME}}', 'Fatima Al-Farsi', 'Sarah Chen'], hasBrief: true, briefLabel: 'Meeting brief' },
      { id: 'dm-005', meetingId: 'mb-005', time: '15:00', date: TOMORROW, clientName: 'Veritas Group', topic: 'New fund commitment discussion — GCC Data Centers', attendees: ['{{ADVISOR_NAME}}', 'Marcus Reid', 'David Park'], hasBrief: true, briefLabel: 'Meeting brief' },
    ],
    personal: [
      { id: 'pp-001', clientName: 'Ahmed Al-Rashidi', clientEmail: 'ahmed@alrashidi-fo.com', type: 'birthday', note: 'Birthday tomorrow — opportunity for personal outreach', emailSubject: 'Happy Birthday, Ahmed!', emailBody: 'Dear Ahmed,\n\nWishing you a very happy birthday! I hope you have a wonderful day celebrating with your loved ones.\n\nIt has been a pleasure working with you and the Al-Rashidi Family. Here\'s to another great year ahead.\n\nWarm regards,\n{{ADVISOR_NAME}}' },
      { id: 'pp-002', clientName: 'Meridian Capital', clientEmail: 'david.park@meridiancap.com', type: 'anniversary', note: '3-year client anniversary this week — reinforce relationship', emailSubject: 'Celebrating 3 Years Together — Meridian Capital', emailBody: 'Dear David,\n\nI wanted to take a moment to recognize that this week marks the 3rd anniversary of our partnership with Meridian Capital.\n\nIt has been a privilege to support your investment objectives over these years, and I look forward to continuing our collaboration.\n\nWould you be available for a brief call this week to discuss our outlook for the coming year?\n\nBest regards,\n{{ADVISOR_NAME}}' },
    ],
  },
}

// ── Day 2 ────────────────────────────────────────────────────────────

const day2: DailySummary = {
  id: 'ds-002',
  date: DATES[1],
  relationshipPool: RELATIONSHIP_POOL,
  sections: {
    portfolioAlerts: [
      { id: 'pa-005', category: 'portfolio_drift', clientName: 'Al-Farsi Family', clientEmail: 'fatima@alfarsi-fo.com', clientHref: CLIENT_HREF, description: 'Allocation drift exceeded 5% — rebalance trigger hit', severity: 'warning' },
      { id: 'pa-006', category: 'portfolio_drift', clientName: 'Veritas Group', clientEmail: 'marcus.reid@veritasgroup.com', clientHref: CLIENT_HREF, description: 'Underweight in infrastructure by 3%', severity: 'warning' },
    ],
    newsAlerts: [
      { id: 'na-003', headline: 'Fed signals June cut unlikely', summary: 'Inflation data surprises to the upside — stay cautious on rate-sensitive positions', source: 'WSJ', sourceUrl: 'https://www.wsj.com/economy/central-banking/fed-signals-june-cut-unlikely', affectedClients: [{ name: 'Al-Farsi Family', impact: 'Rate-sensitive bonds may underperform', email: 'fatima@alfarsi-fo.com' }], clientEmailSubject: 'Market Update: Fed Rate Outlook — Portfolio Implications', clientEmailBody: 'Dear Client,\n\nThe latest inflation data suggests the Fed is unlikely to cut rates in June. This may impact rate-sensitive positions in your portfolio.\n\nWe recommend reviewing your fixed income positioning and will prepare updated recommendations.\n\nBest regards,\n{{ADVISOR_NAME}}', internalTaskTitle: 'Review rate-sensitive positions across client portfolios', internalTaskDescription: 'Fed June cut unlikely. Review all client fixed income positions for rate sensitivity exposure.' },
      { id: 'na-004', headline: 'GCC infrastructure spending accelerates', summary: 'Positive tailwind for regional infra funds', source: 'Gulf News', sourceUrl: 'https://gulfnews.com/business/gcc-infrastructure-spending-accelerates', affectedClients: [{ name: 'Veritas Group', impact: 'Infrastructure allocation could benefit', email: 'marcus.reid@veritasgroup.com' }], clientEmailSubject: 'Opportunity: GCC Infrastructure Spending Surge', clientEmailBody: 'Dear Marcus,\n\nGCC infrastructure spending is accelerating, creating a positive tailwind for regional infra funds. This aligns well with your portfolio strategy.\n\nI would like to discuss increasing your infrastructure allocation to capitalize on this trend.\n\nBest regards,\n{{ADVISOR_NAME}}', internalTaskTitle: 'Evaluate infra allocation increase for Veritas Group', internalTaskDescription: 'GCC infra spending accelerating. Assess opportunity to increase Veritas Group infrastructure allocation.' },
    ],
    actionItems: [
      { id: 'ai-005', title: 'Veritas Group — Subscription Agreement', client: 'Veritas Group', source: 'task_hub', description: 'WDR pending review', owner: 'internal' },
      { id: 'ai-006', title: 'Al-Farsi Portfolio — Rebalance Trigger', client: 'Al-Farsi Family', source: 'compliance', description: 'Allocation drift exceeded 5%', owner: 'internal' },
      { id: 'ai-007', title: 'Noor Holdings — Tax Filing', client: 'Noor Holdings', source: 'email', description: 'Deadline approaching', owner: 'client' },
    ],
    meetings: [
      { id: 'dm-006', meetingId: 'mb-006', time: '10:00', date: DATES[1], clientName: 'Al-Farsi Family', topic: 'Semi-annual portfolio performance discussion', attendees: ['{{ADVISOR_NAME}}', 'Fatima Al-Farsi'], hasBrief: true, briefLabel: 'Meeting brief' },
      { id: 'dm-007', meetingId: 'mb-007', time: '15:00', date: DATES[1], clientName: 'Veritas Group', topic: 'New fund commitment discussion — GCC Data Centers', attendees: ['{{ADVISOR_NAME}}', 'Marcus Reid'], hasBrief: true, briefLabel: 'Meeting brief' },
    ],
    personal: [
      { id: 'pp-003', clientName: 'Hamdan Trust', clientEmail: 'rashid@hamdantrust.ae', type: 'follow_up', note: 'Follow up on DocuSign from last week', emailSubject: 'Follow Up: Subscription Agreement — DocuSign', emailBody: 'Dear Rashid,\n\nI hope this message finds you well. I wanted to follow up on the subscription agreement sent via DocuSign last week.\n\nCould you kindly confirm if you have had a chance to review and sign the document? Please let me know if you need any clarification.\n\nBest regards,\n{{ADVISOR_NAME}}' },
    ],
  },
}

// ── Day 3 ────────────────────────────────────────────────────────────

const day3: DailySummary = {
  id: 'ds-003',
  date: DATES[2],
  relationshipPool: RELATIONSHIP_POOL,
  sections: {
    portfolioAlerts: [
      { id: 'pa-007', category: 'portfolio_drift', clientName: 'Noor Holdings', clientEmail: 'khalid.noor@noorholdings.com', clientHref: CLIENT_HREF, description: 'Cash position above target — deploy into PE pipeline', severity: 'warning' },
    ],
    newsAlerts: [
      { id: 'na-005', headline: 'Carlyle Europe V shows +6.1% QoQ', summary: 'Strong exit from logistics portfolio company', source: 'PE Wire', sourceUrl: 'https://www.privateequitywire.co.uk/carlyle-europe-v-performance', affectedClients: [{ name: 'Al-Rashidi Family', impact: 'Positive mark-up on Carlyle position', email: 'ahmed@alrashidi-fo.com' }], clientEmailSubject: 'Good News: Carlyle Europe V Performance Update', clientEmailBody: 'Dear Ahmed,\n\nI am pleased to share that Carlyle Europe V has posted a +6.1% QoQ return, driven by a strong exit from their logistics portfolio company.\n\nThis positively impacts your Carlyle position. I will include the detailed performance attribution in your next portfolio review.\n\nBest regards,\n{{ADVISOR_NAME}}', internalTaskTitle: 'Update Carlyle Europe V performance in client reports', internalTaskDescription: 'Carlyle Europe V +6.1% QoQ. Update performance attribution for Al-Rashidi Family portfolio.' },
      { id: 'na-006', headline: 'UAE CIT implementation update', summary: 'New guidance on fund exemptions — review client structures', source: 'KPMG', sourceUrl: 'https://kpmg.com/ae/en/home/insights/uae-cit-implementation-update.html', affectedClients: [{ name: 'Al-Farsi Family', impact: 'Tax structure may need adjustment', email: 'fatima@alfarsi-fo.com' }], clientEmailSubject: 'UAE CIT Update — Potential Impact on Your Tax Structure', clientEmailBody: 'Dear Fatima,\n\nNew guidance on UAE CIT fund exemptions has been released. This may require adjustments to your current tax structure.\n\nI recommend scheduling a tax advisory session to review the implications.\n\nBest regards,\n{{ADVISOR_NAME}}', internalTaskTitle: 'Review UAE CIT implications for Al-Farsi Family structure', internalTaskDescription: 'New CIT guidance on fund exemptions. Review Al-Farsi Family tax structure for potential adjustments. Coordinate with tax advisor.' },
    ],
    actionItems: [
      { id: 'ai-008', title: 'Noor Holdings — Capital Call Response', client: 'Noor Holdings', source: 'email', description: 'Awaiting client wire confirmation', owner: 'client' },
      { id: 'ai-009', title: 'Q1 Book Review Prep', client: 'Internal', source: 'task_hub', description: 'Prepare consolidated performance deck', owner: 'internal' },
    ],
    meetings: [
      { id: 'dm-008', meetingId: 'mb-008', time: '09:00', date: DATES[2], clientName: 'Noor Holdings', topic: 'Capital call planning and liquidity review', attendees: ['{{ADVISOR_NAME}}', 'Khalid Noor'], hasBrief: true, briefLabel: 'Meeting brief' },
      { id: 'dm-009', meetingId: 'mb-009', time: '14:30', date: DATES[2], clientName: 'Internal', topic: 'Q1 book review — internal performance alignment', attendees: ['{{ADVISOR_NAME}}', 'Sarah Chen', 'David Park'], hasBrief: true, briefLabel: 'Meeting brief' },
    ],
    personal: [
      { id: 'pp-004', clientName: 'Fatima Al-Farsi', clientEmail: 'fatima@alfarsi-fo.com', type: 'birthday', note: 'Birthday next week — arrange card/gift', emailSubject: 'Happy Birthday, Fatima!', emailBody: 'Dear Fatima,\n\nWishing you a very happy birthday! May this year bring you health, happiness, and prosperity.\n\nWarm regards,\n{{ADVISOR_NAME}}' },
    ],
  },
}

// ── Day 4 ────────────────────────────────────────────────────────────

const day4: DailySummary = {
  id: 'ds-004',
  date: DATES[3],
  relationshipPool: RELATIONSHIP_POOL,
  sections: {
    portfolioAlerts: [
      { id: 'pa-008', category: 'portfolio_drift', clientName: 'Meridian Capital', clientEmail: 'david.park@meridiancap.com', clientHref: CLIENT_HREF, description: 'PE allocation 2% below target after distribution', severity: 'warning' },
      { id: 'pa-009', category: 'margin_call', clientName: 'Zenith Capital', clientEmail: 'alex@zenithcapital.com', clientHref: CLIENT_HREF, description: 'Near margin threshold on leveraged equity position — 98% utilization', severity: 'critical' },
    ],
    newsAlerts: [
      { id: 'na-007', headline: 'Apollo Secondaries IX nears $5B final close', summary: 'Strong demand — confirm client commitments before deadline', source: 'PE News', sourceUrl: 'https://www.privateequitywire.co.uk/apollo-secondaries-ix-final-close', affectedClients: [{ name: 'Hamdan Trust', impact: 'Commitment deadline in 2 weeks', email: 'rashid@hamdantrust.ae' }], clientEmailSubject: 'Action Required: Apollo Secondaries IX — Final Close Approaching', clientEmailBody: 'Dear Rashid,\n\nApollo Secondaries IX is approaching its final close at $5B. Your commitment deadline is in 2 weeks.\n\nPlease confirm your commitment at your earliest convenience so we can ensure your allocation is secured.\n\nBest regards,\n{{ADVISOR_NAME}}', internalTaskTitle: 'Confirm Hamdan Trust commitment for Apollo Secondaries IX', internalTaskDescription: 'Apollo Secondaries IX final close approaching ($5B). Confirm Hamdan Trust commitment before 2-week deadline. Prepare commitment letter.' },
    ],
    actionItems: [
      { id: 'ai-010', title: 'Zenith Capital — Onboarding Documents', client: 'Zenith Capital', source: 'crm', description: 'New client, pending KYC/AML', owner: 'client' },
      { id: 'ai-011', title: 'Apollo Secondaries IX — Commitment Letter', client: 'Multiple Clients', source: 'email', description: 'Send commitment letters to 3 clients', owner: 'internal' },
      { id: 'ai-012', title: 'Meridian Capital — Fee Invoice Review', client: 'Meridian Capital', source: 'invest_admin', description: 'Q1 fee invoice discrepancy', owner: 'internal' },
    ],
    meetings: [
      { id: 'dm-010', meetingId: 'mb-010', time: '10:30', date: DATES[3], clientName: 'Zenith Capital', topic: 'New client onboarding — investment objectives and risk profiling', attendees: ['{{ADVISOR_NAME}}', 'Alex Zenith', 'Sarah Chen'], hasBrief: true, briefLabel: 'Meeting brief' },
      { id: 'dm-011', meetingId: 'mb-011', time: '13:00', date: DATES[3], clientName: 'Al-Rashidi Family', topic: 'Apex Logistics co-invest deep dive', attendees: ['{{ADVISOR_NAME}}', 'Ahmed Al-Rashidi'], hasBrief: true, briefLabel: 'Meeting brief' },
    ],
    personal: [
      { id: 'pp-005', clientName: 'Hamdan Trust', clientEmail: 'rashid@hamdantrust.ae', type: 'anniversary', note: '10-year client anniversary — plan recognition', emailSubject: 'Celebrating 10 Years Together — Hamdan Trust', emailBody: 'Dear Rashid,\n\nThis month marks a special milestone — 10 years of our partnership with Hamdan Trust.\n\nIt has been an honour to serve as your trusted advisor through a decade of growth and success. We deeply value this relationship.\n\nI would love to arrange a celebratory dinner at your convenience.\n\nWith warmest regards,\n{{ADVISOR_NAME}}' },
      { id: 'pp-006', clientName: 'Veritas Group', clientEmail: 'marcus.reid@veritasgroup.com', type: 'follow_up', note: 'CEO returning from travel — good time to reconnect', emailSubject: 'Welcome Back — Catching Up', emailBody: 'Dear Marcus,\n\nI hope you had a wonderful trip. Now that you are back, I would love to schedule a brief catch-up to discuss some exciting developments in your portfolio.\n\nPlease let me know your availability this week.\n\nBest regards,\n{{ADVISOR_NAME}}' },
    ],
  },
}

// ── Day 5 ────────────────────────────────────────────────────────────

const day5: DailySummary = {
  id: 'ds-005',
  date: DATES[4],
  relationshipPool: RELATIONSHIP_POOL,
  sections: {
    portfolioAlerts: [
      { id: 'pa-010', category: 'portfolio_drift', clientName: 'Al-Farsi Family', clientEmail: 'fatima@alfarsi-fo.com', clientHref: CLIENT_HREF, description: 'BREIT distribution received — needs reallocation instruction', severity: 'warning' },
    ],
    newsAlerts: [
      { id: 'na-008', headline: 'BREIT redemption queue shrinks', summary: 'Positive signal for NAV stability', source: 'Bloomberg', sourceUrl: 'https://www.bloomberg.com/news/articles/breit-redemption-queue-shrinks', affectedClients: [{ name: 'Al-Farsi Family', impact: 'BREIT position may recover faster', email: 'fatima@alfarsi-fo.com' }], clientEmailSubject: 'Positive Update: BREIT Redemption Queue Shrinking', clientEmailBody: 'Dear Fatima,\n\nPositive news regarding your BREIT position — the redemption queue is shrinking, signaling improved NAV stability.\n\nWe will continue to monitor and update you on any further developments.\n\nBest regards,\n{{ADVISOR_NAME}}', internalTaskTitle: 'Monitor BREIT NAV stability for Al-Farsi Family', internalTaskDescription: 'BREIT redemption queue shrinking. Track NAV movements and update Al-Farsi Family portfolio projections.' },
    ],
    actionItems: [
      { id: 'ai-013', title: 'Al-Farsi Family — Distribution Allocation', client: 'Al-Farsi Family', source: 'invest_admin', description: 'BREIT distribution needs allocation instruction', owner: 'client' },
      { id: 'ai-014', title: 'Compliance — Quarterly Certification', client: 'Internal', source: 'compliance', description: 'Q1 compliance cert due end of week', owner: 'internal' },
    ],
    meetings: [
      { id: 'dm-012', meetingId: 'mb-012', time: '11:00', date: DATES[4], clientName: 'Al-Farsi Family', topic: 'Distribution reinvestment strategy', attendees: ['{{ADVISOR_NAME}}', 'Fatima Al-Farsi'], hasBrief: true, briefLabel: 'Meeting brief' },
    ],
    personal: [
      { id: 'pp-007', clientName: 'Noor Holdings', clientEmail: 'khalid.noor@noorholdings.com', type: 'follow_up', note: 'Pending response on capital call — follow up', emailSubject: 'Follow Up: Capital Call Response — Noor Holdings', emailBody: 'Dear Khalid,\n\nI wanted to follow up on the pending capital call response. Could you kindly confirm the wire status at your earliest convenience?\n\nBest regards,\n{{ADVISOR_NAME}}' },
    ],
  },
}

// ── Day 6 ────────────────────────────────────────────────────────────

const day6: DailySummary = {
  id: 'ds-006',
  date: DATES[5],
  relationshipPool: RELATIONSHIP_POOL,
  sections: {
    portfolioAlerts: [
      { id: 'pa-011', category: 'portfolio_drift', clientName: 'Meridian Capital', clientEmail: 'david.park@meridiancap.com', clientHref: CLIENT_HREF, description: 'Approved rebalance awaiting execution', severity: 'warning' },
    ],
    newsAlerts: [
      { id: 'na-009', headline: 'Data center demand surges in GCC', summary: 'AI-driven demand creating strong pipeline', source: 'Gulf Business', sourceUrl: 'https://gulfbusiness.com/data-center-demand-surges-gcc', affectedClients: [{ name: 'Hamdan Trust', impact: 'Relevant to GCC Data Centers Fund I commitment', email: 'rashid@hamdantrust.ae' }], clientEmailSubject: 'Market Insight: GCC Data Center Demand Surge', clientEmailBody: 'Dear Rashid,\n\nGCC data center demand is surging, driven by AI adoption. This is directly relevant to your GCC Data Centers Fund I commitment.\n\nI will share a detailed market briefing in our next meeting.\n\nBest regards,\n{{ADVISOR_NAME}}', internalTaskTitle: 'Prepare GCC data center market briefing for Hamdan Trust', internalTaskDescription: 'GCC data center demand surging. Prepare market briefing for Hamdan Trust ahead of Fund I commitment discussion.' },
    ],
    actionItems: [
      { id: 'ai-015', title: 'Zenith Capital — Risk Profile Approval', client: 'Zenith Capital', source: 'compliance', description: 'New client risk assessment pending approval', owner: 'internal' },
      { id: 'ai-016', title: 'GCC Data Centers Fund I — DD Report', client: 'Multiple Clients', source: 'task_hub', description: 'Complete due diligence summary', owner: 'internal' },
    ],
    meetings: [
      { id: 'dm-013', meetingId: 'mb-013', time: '09:30', date: DATES[5], clientName: 'Meridian Capital', topic: 'Rebalancing execution review', attendees: ['{{ADVISOR_NAME}}', 'David Park'], hasBrief: true, briefLabel: 'Meeting brief' },
    ],
    personal: [
      { id: 'pp-008', clientName: 'Ahmed Al-Rashidi', clientEmail: 'ahmed@alrashidi-fo.com', type: 'follow_up', note: 'Sent birthday wishes — await response', emailSubject: 'Checking In — Ahmed', emailBody: 'Dear Ahmed,\n\nI hope you had a wonderful birthday celebration. Just checking in to see if there is anything you need from our side.\n\nBest regards,\n{{ADVISOR_NAME}}' },
    ],
  },
}

// ── Day 7–10 (lighter data) ──────────────────────────────────────────

const day7: DailySummary = {
  id: 'ds-007', date: DATES[6], relationshipPool: RELATIONSHIP_POOL,
  sections: {
    portfolioAlerts: [
      { id: 'pa-012', category: 'portfolio_drift', clientName: 'Hamdan Trust', clientEmail: 'rashid@hamdantrust.ae', clientHref: CLIENT_HREF, description: 'Succession plan execution may impact portfolio structure', severity: 'warning' },
    ],
    newsAlerts: [
      { id: 'na-010', headline: 'KKR Infrastructure II posts strong Q1', summary: 'Ahead-of-schedule construction driving returns', source: 'Infrastructure Investor', sourceUrl: 'https://www.infrastructureinvestor.com/kkr-infra-ii-q1', affectedClients: [{ name: 'Noor Holdings', impact: 'Positive performance attribution', email: 'khalid.noor@noorholdings.com' }], clientEmailSubject: 'Performance Update: KKR Infrastructure II', clientEmailBody: 'Dear Khalid,\n\nKKR Infrastructure II has posted a strong Q1, with construction milestones ahead of schedule driving returns.\n\nThis positively impacts your portfolio. I will include the detailed attribution in your next review.\n\nBest regards,\n{{ADVISOR_NAME}}', internalTaskTitle: 'Update KKR Infra II performance in Noor Holdings report', internalTaskDescription: 'KKR Infrastructure II strong Q1. Update performance attribution in Noor Holdings portfolio report.' },
    ],
    actionItems: [
      { id: 'ai-018', title: 'Noor Holdings — AML Clearance', client: 'Noor Holdings', source: 'compliance', description: 'Routine AML check cleared — file documentation', owner: 'internal' },
      { id: 'ai-019', title: 'Hamdan Trust — Succession Docs Review', client: 'Hamdan Trust', source: 'task_hub', description: 'Legal review complete, needs client sign-off', owner: 'client' },
    ],
    meetings: [
      { id: 'dm-015', meetingId: 'mb-015', time: '10:00', date: DATES[6], clientName: 'Hamdan Trust', topic: 'Succession document walkthrough', attendees: ['{{ADVISOR_NAME}}', 'Rashid Hamdan', 'Legal Team'], hasBrief: true, briefLabel: 'Meeting brief' },
    ],
    personal: [
      { id: 'pp-009', clientName: 'Al-Rashidi Family', clientEmail: 'ahmed@alrashidi-fo.com', type: 'follow_up', note: 'Quarterly review went well — send summary email', emailSubject: 'Quarterly Review Summary — Al-Rashidi Family', emailBody: 'Dear Ahmed,\n\nThank you for a productive quarterly review. Please find attached the summary of key takeaways and next steps.\n\nBest regards,\n{{ADVISOR_NAME}}' },
    ],
  },
}

const day8: DailySummary = {
  id: 'ds-008', date: DATES[7], relationshipPool: RELATIONSHIP_POOL,
  sections: {
    portfolioAlerts: [
      { id: 'pa-013', category: 'portfolio_drift', clientName: 'Veritas Group', clientEmail: 'marcus.reid@veritasgroup.com', clientHref: CLIENT_HREF, description: 'New allocation proposal pending — $2.5M to Apollo IX', severity: 'warning' },
    ],
    newsAlerts: [
      { id: 'na-011', headline: 'US commercial RE showing stabilization', summary: 'BREIT and GCC RE positions may benefit from bottoming cycle', source: 'CBRE Research', sourceUrl: 'https://www.cbre.com/insights/us-commercial-re-stabilization', affectedClients: [{ name: 'Al-Farsi Family', impact: 'RE allocation outlook improving', email: 'fatima@alfarsi-fo.com' }], clientEmailSubject: 'Market Update: US Commercial RE Stabilization', clientEmailBody: 'Dear Fatima,\n\nUS commercial real estate is showing signs of stabilization. Your BREIT and GCC RE positions may benefit from the bottoming cycle.\n\nI will prepare an updated outlook for our next discussion.\n\nBest regards,\n{{ADVISOR_NAME}}', internalTaskTitle: 'Prepare RE market outlook for Al-Farsi Family', internalTaskDescription: 'US commercial RE stabilizing. Prepare updated RE market outlook for Al-Farsi Family portfolio review.' },
    ],
    actionItems: [
      { id: 'ai-020', title: 'Veritas Group — Fund Transfer', client: 'Veritas Group', source: 'email', description: '$2.5M transfer pending execution', owner: 'internal' },
      { id: 'ai-021', title: 'Portfolio Dashboard — Data Refresh', client: 'Internal', source: 'task_hub', description: 'Q1 NAV data needs manual upload for 3 funds', owner: 'internal' },
    ],
    meetings: [
      { id: 'dm-017', meetingId: 'mb-017', time: '09:30', date: DATES[7], clientName: 'Veritas Group', topic: 'Q1 performance deep dive', attendees: ['{{ADVISOR_NAME}}', 'Marcus Reid'], hasBrief: true, briefLabel: 'Meeting brief' },
    ],
    personal: [
      { id: 'pp-010', clientName: 'Veritas Group CEO', clientEmail: 'marcus.reid@veritasgroup.com', type: 'follow_up', note: 'Just returned from travel — reconnect call went well', emailSubject: 'Great Catching Up, Marcus', emailBody: 'Dear Marcus,\n\nIt was great catching up after your travels. Looking forward to executing the plans we discussed.\n\nBest regards,\n{{ADVISOR_NAME}}' },
    ],
  },
}

const day9: DailySummary = {
  id: 'ds-009', date: DATES[8], relationshipPool: RELATIONSHIP_POOL,
  sections: {
    portfolioAlerts: [
      { id: 'pa-014', category: 'portfolio_drift', clientName: 'Multiple Clients', clientEmail: 'team@invictus-ai.com', clientHref: CLIENT_HREF, description: 'March statements ready — review before sending', severity: 'warning' },
    ],
    newsAlerts: [
      { id: 'na-012', headline: 'Global logistics sector recovers', summary: 'Freight rates normalizing — positive for Apex thesis', source: 'Drewry', sourceUrl: 'https://www.drewry.co.uk/shipping-insight/global-logistics-recovery', affectedClients: [{ name: 'Al-Rashidi Family', impact: 'Apex co-invest thesis strengthened', email: 'ahmed@alrashidi-fo.com' }], clientEmailSubject: 'Market Update: Global Logistics Recovery — Apex Impact', clientEmailBody: 'Dear Ahmed,\n\nThe global logistics sector is recovering with freight rates normalizing. This strengthens the thesis behind the Apex co-investment.\n\nI will include this analysis in the next IC presentation.\n\nBest regards,\n{{ADVISOR_NAME}}', internalTaskTitle: 'Update Apex co-invest IC materials with logistics recovery data', internalTaskDescription: 'Global logistics recovering. Update Apex Logistics IC materials with latest Drewry freight rate data to strengthen investment thesis.' },
    ],
    actionItems: [
      { id: 'ai-023', title: 'Multiple Clients — Monthly Statements', client: 'Multiple', source: 'task_hub', description: 'March statements ready for review and send', owner: 'internal' },
      { id: 'ai-024', title: 'Apex Logistics — DD Follow-up', client: 'Internal', source: 'task_hub', description: 'Additional questions from IC on operating margins', owner: 'internal' },
    ],
    meetings: [
      { id: 'dm-019', meetingId: 'mb-019', time: '10:00', date: DATES[8], clientName: 'Internal', topic: 'Investment committee — Apex review', attendees: ['{{ADVISOR_NAME}}', 'Sarah Chen', 'IC Members'], hasBrief: true, briefLabel: 'Meeting brief' },
    ],
    personal: [
      { id: 'pp-011', clientName: 'Noor Holdings', clientEmail: 'khalid.noor@noorholdings.com', type: 'anniversary', note: '5-year client relationship milestone next week', emailSubject: 'Celebrating 5 Years Together — Noor Holdings', emailBody: 'Dear Khalid,\n\nNext week marks the 5th anniversary of our partnership with Noor Holdings. It has been a privilege to support your growth.\n\nI would love to celebrate this milestone together.\n\nBest regards,\n{{ADVISOR_NAME}}' },
    ],
  },
}

const day10: DailySummary = {
  id: 'ds-010', date: DATES[9], relationshipPool: RELATIONSHIP_POOL,
  sections: {
    portfolioAlerts: [
      { id: 'pa-015', category: 'portfolio_drift', clientName: 'Hamdan Trust', clientEmail: 'rashid@hamdantrust.ae', clientHref: CLIENT_HREF, description: 'GCC Data Centers Fund I commitment — pending subscription', severity: 'warning' },
    ],
    newsAlerts: [
      { id: 'na-013', headline: 'UAE CIT — fund exemption clarity', summary: 'QAHC structures may benefit clients', source: 'EY', sourceUrl: 'https://www.ey.com/en_ae/tax/uae-cit-fund-exemption-clarity', affectedClients: [{ name: 'Al-Farsi Family', impact: 'Tax structure optimization opportunity', email: 'fatima@alfarsi-fo.com' }], clientEmailSubject: 'Tax Update: UAE CIT Fund Exemption — Opportunity for Your Portfolio', clientEmailBody: 'Dear Fatima,\n\nNew clarity on UAE CIT fund exemptions presents an opportunity to optimize your tax structure through QAHC arrangements.\n\nI recommend we schedule a session with our tax advisor to discuss the implications.\n\nBest regards,\n{{ADVISOR_NAME}}', internalTaskTitle: 'Coordinate tax advisory session for Al-Farsi Family CIT review', internalTaskDescription: 'UAE CIT fund exemption clarity from EY. Coordinate with tax advisor to review Al-Farsi Family structure for QAHC optimization.' },
    ],
    actionItems: [
      { id: 'ai-025', title: 'Hamdan Trust — Subscription Execution', client: 'Hamdan Trust', source: 'task_hub', description: 'GCC Data Centers Fund I commitment — pending signature', owner: 'client' },
      { id: 'ai-026', title: 'Al-Farsi — Tax Planning Follow-up', client: 'Al-Farsi Family', source: 'email', description: 'CIT advisor requesting additional info', owner: 'client' },
    ],
    meetings: [
      { id: 'dm-022', meetingId: 'mb-022', time: '09:00', date: DATES[9], clientName: 'Hamdan Trust', topic: 'GCC Data Centers Fund I — subscription signing', attendees: ['{{ADVISOR_NAME}}', 'Rashid Hamdan'], hasBrief: true, briefLabel: 'Meeting brief' },
    ],
    personal: [
      { id: 'pp-012', clientName: 'Zenith Capital', clientEmail: 'alex@zenithcapital.com', type: 'follow_up', note: 'IPS signed — send welcome package', emailSubject: 'Welcome to Invictus AI — Zenith Capital', emailBody: 'Dear Alex,\n\nThank you for signing the Investment Policy Statement. We are thrilled to officially welcome Zenith Capital to our family.\n\nPlease find attached your onboarding materials and welcome package.\n\nBest regards,\n{{ADVISOR_NAME}}' },
    ],
  },
}

export const DAILY_SUMMARIES: DailySummary[] = [
  day1, day2, day3, day4, day5, day6, day7, day8, day9, day10,
]

export function getDailySummaryByDate(date: string): DailySummary | undefined {
  return DAILY_SUMMARIES.find((s) => s.date === date)
}

export function createTodaySummary(): DailySummary {
  return {
    ...day1,
    id: `ds-today-${Date.now()}`,
    date: TODAY,
  }
}
