import type {
  InvestmentType,
  DocumentTemplate,
  Mandate,
  Opportunity,
  AssetManager,
  NewsItem,
  DashboardSummary,
} from '@/modules/deals/types'

// ── Investment Types ──────────────────────────────────────────────────

export const MOCK_INVESTMENT_TYPES: InvestmentType[] = [
  {
    id: 'invtype-fund',
    name: 'Fund',
    slug: 'fund',
    isSystem: true,
    sortOrder: 1,
    snapshotConfig: {
      sections: [
        {
          name: 'Fund Overview',
          sortOrder: 1,
          fields: [
            { name: 'Fund Name', type: 'text', required: true, instruction: 'Official name of the fund' },
            { name: 'Fund Size', type: 'currency', required: true, instruction: 'Target or current fund size in USD' },
            { name: 'Vintage Year', type: 'number', required: true, instruction: 'Year the fund was launched' },
            { name: 'Strategy', type: 'select', required: true, instruction: 'Primary investment strategy', options: ['Buyout', 'Growth Equity', 'Venture Capital', 'Credit', 'Real Assets', 'Secondaries'] },
          ],
        },
        {
          name: 'Terms & Structure',
          sortOrder: 2,
          fields: [
            { name: 'Management Fee', type: 'percentage', required: true, instruction: 'Annual management fee percentage' },
            { name: 'Carried Interest', type: 'percentage', required: true, instruction: 'Carried interest percentage' },
            { name: 'Fund Term', type: 'text', required: false, instruction: 'Expected fund life (e.g., 10 years + 2 extensions)' },
            { name: 'Minimum Commitment', type: 'currency', required: false, instruction: 'Minimum LP commitment amount' },
          ],
        },
        {
          name: 'Performance',
          sortOrder: 3,
          fields: [
            { name: 'Target Net IRR', type: 'text', required: false, instruction: 'Target net IRR range' },
            { name: 'Target Net MOIC', type: 'text', required: false, instruction: 'Target net multiple on invested capital' },
            { name: 'Prior Fund Performance', type: 'textarea', required: false, instruction: 'Summary of predecessor fund track record' },
          ],
        },
      ],
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'invtype-direct',
    name: 'Direct',
    slug: 'direct',
    isSystem: true,
    sortOrder: 2,
    snapshotConfig: {
      sections: [
        {
          name: 'Company Overview',
          sortOrder: 1,
          fields: [
            { name: 'Company Name', type: 'text', required: true, instruction: 'Legal name of the target company' },
            { name: 'Sector', type: 'text', required: true, instruction: 'Primary industry sector' },
            { name: 'Revenue', type: 'currency', required: false, instruction: 'Latest annual revenue' },
            { name: 'EBITDA', type: 'currency', required: false, instruction: 'Latest annual EBITDA' },
          ],
        },
        {
          name: 'Deal Terms',
          sortOrder: 2,
          fields: [
            { name: 'Valuation', type: 'currency', required: true, instruction: 'Enterprise or equity valuation' },
            { name: 'Stake Offered', type: 'percentage', required: false, instruction: 'Percentage stake being offered' },
            { name: 'Investment Amount', type: 'currency', required: true, instruction: 'Proposed investment size' },
          ],
        },
      ],
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'invtype-coinvest',
    name: 'Co-Investment',
    slug: 'co-investment',
    isSystem: true,
    sortOrder: 3,
    snapshotConfig: {
      sections: [
        {
          name: 'Co-Investment Details',
          sortOrder: 1,
          fields: [
            { name: 'Lead Sponsor', type: 'text', required: true, instruction: 'Name of the lead GP/sponsor' },
            { name: 'Target Company', type: 'text', required: true, instruction: 'Name of the underlying target company' },
            { name: 'Co-Invest Allocation', type: 'currency', required: true, instruction: 'Amount available for co-investment' },
            { name: 'Fees', type: 'text', required: false, instruction: 'Fee structure (e.g., no management fee, reduced carry)' },
          ],
        },
        {
          name: 'Sponsor Track Record',
          sortOrder: 2,
          fields: [
            { name: 'Sponsor AUM', type: 'currency', required: false, instruction: 'Lead sponsor assets under management' },
            { name: 'Prior Co-Invests', type: 'number', required: false, instruction: 'Number of prior co-investment opportunities offered' },
          ],
        },
      ],
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'invtype-other',
    name: 'Other',
    slug: 'other',
    isSystem: true,
    sortOrder: 4,
    snapshotConfig: {
      sections: [
        {
          name: 'General Information',
          sortOrder: 1,
          fields: [
            { name: 'Description', type: 'textarea', required: true, instruction: 'Describe the investment opportunity' },
            { name: 'Asset Class', type: 'text', required: false, instruction: 'Asset class or category' },
            { name: 'Expected Return', type: 'text', required: false, instruction: 'Target return profile' },
          ],
        },
      ],
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
]

// ── Document Templates ────────────────────────────────────────────────

const templateTypes = ['Investment Memo', 'Pre-Screening', 'DDQ', 'Market Analysis', 'News'] as const

function makeTemplates(invTypeId: string, invTypeSlug: string, startSort: number): DocumentTemplate[] {
  return templateTypes.map((name, i) => ({
    id: `tmpl-${invTypeSlug}-${name.toLowerCase().replace(/[\s-]+/g, '-')}`,
    investmentTypeId: invTypeId,
    name: `${name}`,
    slug: `${invTypeSlug}-${name.toLowerCase().replace(/[\s-]+/g, '-')}`,
    promptTemplate: `Generate a ${name.toLowerCase()} for this ${invTypeSlug} investment opportunity based on the provided snapshot data and attached documents.`,
    isSystem: true,
    sortOrder: startSort + i,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  }))
}

export const MOCK_DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  ...makeTemplates('invtype-fund', 'fund', 1),
  ...makeTemplates('invtype-direct', 'direct', 6),
  ...makeTemplates('invtype-coinvest', 'co-investment', 11),
  ...makeTemplates('invtype-other', 'other', 16),
]

// ── Mandates ──────────────────────────────────────────────────────────

export const MOCK_MANDATES: Mandate[] = [
  {
    id: 'mandate-growth-2026',
    name: 'Growth Equity 2026',
    status: 'active',
    targetAllocation: 150_000_000,
    expectedReturn: '18-22% net IRR',
    timeHorizon: '5-7 years',
    investmentTypes: ['invtype-fund', 'invtype-direct', 'invtype-coinvest'],
    assetAllocation: [
      { assetClass: 'Growth Equity', allocationPct: 50, targetReturn: '20%+ net IRR' },
      { assetClass: 'Venture Capital', allocationPct: 30, targetReturn: '25%+ net IRR' },
      { assetClass: 'Co-Investments', allocationPct: 20, targetReturn: '18%+ net IRR' },
    ],
    targetSectors: ['Technology', 'Healthcare', 'Fintech', 'AI/ML'],
    geographicFocus: ['North America', 'Europe', 'Middle East'],
    investmentCriteria: 'Revenue stage companies with $10M+ ARR, strong unit economics, and clear path to profitability. Prefer B2B SaaS and enterprise software.',
    investmentConstraints: 'No early-stage pre-revenue. Maximum 15% single manager concentration. ESG-compliant only.',
    investmentStrategy: 'Diversified growth equity program targeting top-quartile GPs with proven track records in technology and healthcare sectors.',
    createdBy: 'user-usman',
    createdAt: '2025-11-01T10:00:00Z',
    updatedAt: '2026-03-15T14:00:00Z',
  },
  {
    id: 'mandate-real-assets-ii',
    name: 'Real Assets Fund II',
    status: 'active',
    targetAllocation: 200_000_000,
    expectedReturn: '12-15% net IRR',
    timeHorizon: '7-10 years',
    investmentTypes: ['invtype-fund', 'invtype-coinvest'],
    assetAllocation: [
      { assetClass: 'Infrastructure', allocationPct: 40, targetReturn: '12%+ net IRR' },
      { assetClass: 'Real Estate', allocationPct: 35, targetReturn: '14%+ net IRR' },
      { assetClass: 'Natural Resources', allocationPct: 25, targetReturn: '15%+ net IRR' },
    ],
    targetSectors: ['Infrastructure', 'Real Estate', 'Energy Transition', 'Logistics'],
    geographicFocus: ['Global', 'Middle East', 'Asia Pacific'],
    investmentCriteria: 'Core-plus to value-add strategies with strong cash yield component. Minimum fund size $500M.',
    investmentConstraints: 'No greenfield development risk. Maximum 20% emerging market exposure. Minimum GP commitment of 2%.',
    investmentStrategy: 'Diversified real assets allocation across infrastructure, real estate, and natural resources with focus on inflation protection and stable yields.',
    createdBy: 'user-usman',
    createdAt: '2025-09-01T10:00:00Z',
    updatedAt: '2026-02-20T09:00:00Z',
  },
]

// ── Asset Managers ────────────────────────────────────────────────────

export const MOCK_ASSET_MANAGERS: AssetManager[] = [
  {
    id: 'am-abingworth',
    name: 'Abingworth VC',
    type: 'Venture Capital',
    location: 'London, UK',
    description: 'Leading European life sciences venture capital firm with over 40 years of experience investing in healthcare and biotech.',
    fundInfo: {
      'Current Fund': 'Abingworth Bioventures VIII',
      'Fund Size': '$450M',
      'Vintage': '2025',
      'Strategy': 'Life Sciences VC',
    },
    firmInfo: {
      'Founded': '1973',
      'AUM': '$2.5B',
      'Team Size': '25',
      'Headquarters': 'London',
    },
    strategy: {
      'Focus': 'Early to mid-stage life sciences',
      'Stage': 'Series A to Series C',
      'Geography': 'US and Europe',
    },
    characteristics: {
      'Track Record': 'Top quartile across vintages',
      'ESG Rating': 'A',
    },
    createdByType: 'system',
    createdAt: '2025-06-15T10:00:00Z',
    updatedAt: '2026-01-10T14:00:00Z',
  },
  {
    id: 'am-blackstone-re',
    name: 'Blackstone RE',
    type: 'Real Estate',
    location: 'New York, USA',
    description: 'Global leader in real estate investing with the largest non-listed REIT and significant opportunistic and core-plus strategies.',
    fundInfo: {
      'Current Fund': 'BREP X',
      'Fund Size': '$30.4B',
      'Vintage': '2024',
      'Strategy': 'Opportunistic Real Estate',
    },
    firmInfo: {
      'Founded': '1991',
      'AUM': '$332B (Real Estate)',
      'Team Size': '600+',
      'Headquarters': 'New York',
    },
    strategy: {
      'Focus': 'Global opportunistic real estate',
      'Stage': 'Value-add to opportunistic',
      'Geography': 'Global',
    },
    characteristics: {
      'Track Record': 'Consistent top-decile performance',
      'ESG Rating': 'A+',
    },
    createdByType: 'system',
    createdAt: '2025-05-01T10:00:00Z',
    updatedAt: '2026-02-20T09:00:00Z',
  },
  {
    id: 'am-sequoia',
    name: 'Sequoia Capital',
    type: 'Venture Capital',
    location: 'Menlo Park, USA',
    description: 'Premier technology venture capital firm that has backed companies like Apple, Google, Airbnb, Stripe, and many other category-defining technology companies.',
    fundInfo: {
      'Current Fund': 'Sequoia Capital Fund',
      'Fund Size': 'Evergreen',
      'Vintage': '2025',
      'Strategy': 'Technology VC / Growth',
    },
    firmInfo: {
      'Founded': '1972',
      'AUM': '$85B+',
      'Team Size': '200+',
      'Headquarters': 'Menlo Park, CA',
    },
    strategy: {
      'Focus': 'Technology and consumer',
      'Stage': 'Seed to Growth',
      'Geography': 'US, India, Southeast Asia',
    },
    characteristics: {
      'Track Record': 'Legendary VC returns',
      'ESG Rating': 'A',
    },
    createdByType: 'system',
    createdAt: '2025-04-01T10:00:00Z',
    updatedAt: '2026-03-01T11:00:00Z',
  },
]

// ── Opportunities ─────────────────────────────────────────────────────

export const MOCK_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'opp-abingworth-viii',
    name: 'Abingworth Bioventures VIII',
    investmentTypeId: 'invtype-fund',
    investmentTypeName: 'Fund',
    pipelineStatus: 'active',
    assetManagerId: 'am-abingworth',
    assetManagerName: 'Abingworth VC',
    assignedTo: 'user-pine',
    snapshotData: {
      'Fund Name': 'Abingworth Bioventures VIII',
      'Fund Size': 450_000_000,
      'Vintage Year': 2025,
      'Strategy': 'Venture Capital',
      'Management Fee': 2.0,
      'Carried Interest': 20,
      'Fund Term': '10 years + 2 extensions',
      'Minimum Commitment': 10_000_000,
      'Target Net IRR': '20-25%',
      'Target Net MOIC': '3.0-3.5x',
    },
    snapshotCitations: {
      'Fund Size': 'PPM p. 12',
      'Management Fee': 'LPA Section 4.1',
    },
    sourceType: 'inbound',
    mandateFits: [
      { mandateId: 'mandate-growth-2026', fitScore: 'strong', reasoning: 'Life sciences VC aligns with healthcare sector focus. Top-quartile track record meets criteria.' },
    ],
    createdBy: 'user-usman',
    createdAt: '2026-02-10T10:00:00Z',
    updatedAt: '2026-04-01T14:00:00Z',
  },
  {
    id: 'opp-brep-x',
    name: 'Blackstone BREP X Co-Invest',
    investmentTypeId: 'invtype-coinvest',
    investmentTypeName: 'Co-Investment',
    pipelineStatus: 'active',
    assetManagerId: 'am-blackstone-re',
    assetManagerName: 'Blackstone RE',
    assignedTo: 'user-raoof',
    snapshotData: {
      'Lead Sponsor': 'Blackstone',
      'Target Company': 'European Logistics Portfolio',
      'Co-Invest Allocation': 50_000_000,
      'Fees': 'No management fee, 10% carry above 8% hurdle',
      'Sponsor AUM': 332_000_000_000,
      'Prior Co-Invests': 45,
    },
    snapshotCitations: {
      'Co-Invest Allocation': 'Side letter, section 3',
    },
    sourceType: 'direct-outreach',
    mandateFits: [
      { mandateId: 'mandate-real-assets-ii', fitScore: 'strong', reasoning: 'Top-tier real estate sponsor. Logistics fits infrastructure/real estate allocation. Strong co-invest terms.' },
    ],
    createdBy: 'user-raoof',
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-04-05T16:00:00Z',
  },
  {
    id: 'opp-sequoia-growth',
    name: 'Sequoia Capital Growth Fund',
    investmentTypeId: 'invtype-fund',
    investmentTypeName: 'Fund',
    pipelineStatus: 'new',
    assetManagerId: 'am-sequoia',
    assetManagerName: 'Sequoia Capital',
    assignedTo: 'user-pine',
    snapshotData: {
      'Fund Name': 'Sequoia Capital Growth Fund',
      'Fund Size': 0,
      'Vintage Year': 2026,
      'Strategy': 'Growth Equity',
    },
    snapshotCitations: {},
    sourceType: 'ai-sourced',
    mandateFits: [
      { mandateId: 'mandate-growth-2026', fitScore: 'strong', reasoning: 'Premier growth equity manager with legendary track record. Perfect alignment with technology focus.' },
    ],
    createdBy: 'system',
    createdAt: '2026-04-08T08:00:00Z',
    updatedAt: '2026-04-08T08:00:00Z',
  },
  {
    id: 'opp-infra-partners',
    name: 'GIP Infrastructure Fund V',
    investmentTypeId: 'invtype-fund',
    investmentTypeName: 'Fund',
    pipelineStatus: 'new',
    assetManagerId: 'am-blackstone-re',
    assetManagerName: 'Blackstone RE',
    assignedTo: 'user-john',
    snapshotData: {
      'Fund Name': 'GIP Infrastructure Fund V',
      'Fund Size': 25_000_000_000,
      'Vintage Year': 2026,
      'Strategy': 'Buyout',
      'Management Fee': 1.5,
      'Carried Interest': 20,
    },
    snapshotCitations: {},
    sourceType: 'ai-sourced',
    mandateFits: [
      { mandateId: 'mandate-real-assets-ii', fitScore: 'moderate', reasoning: 'Large infrastructure fund fits real assets mandate. Size may exceed concentration limits.' },
    ],
    createdBy: 'system',
    createdAt: '2026-04-09T12:00:00Z',
    updatedAt: '2026-04-09T12:00:00Z',
  },
  {
    id: 'opp-techbio-direct',
    name: 'TechBio Inc. Series C',
    investmentTypeId: 'invtype-direct',
    investmentTypeName: 'Direct',
    pipelineStatus: 'archived',
    assetManagerId: 'am-abingworth',
    assetManagerName: 'Abingworth VC',
    assignedTo: 'user-pine',
    snapshotData: {
      'Company Name': 'TechBio Inc.',
      'Sector': 'Biotech / AI Drug Discovery',
      'Revenue': 15_000_000,
      'EBITDA': -5_000_000,
      'Valuation': 200_000_000,
      'Stake Offered': 5,
      'Investment Amount': 10_000_000,
    },
    snapshotCitations: {},
    sourceType: 'inbound',
    mandateFits: [
      { mandateId: 'mandate-growth-2026', fitScore: 'weak', reasoning: 'Pre-profitability biotech. Does not meet $10M+ ARR criteria. Negative EBITDA is a concern.' },
    ],
    createdBy: 'user-pine',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-03-20T11:00:00Z',
  },
  {
    id: 'opp-solar-fund',
    name: 'Clean Energy Transition Fund III',
    investmentTypeId: 'invtype-fund',
    investmentTypeName: 'Fund',
    pipelineStatus: 'ignored',
    assetManagerId: 'am-blackstone-re',
    assetManagerName: 'Blackstone RE',
    assignedTo: 'user-john',
    snapshotData: {
      'Fund Name': 'Clean Energy Transition Fund III',
      'Fund Size': 800_000_000,
      'Vintage Year': 2025,
      'Strategy': 'Buyout',
    },
    snapshotCitations: {},
    sourceType: 'ai-sourced',
    mandateFits: [
      { mandateId: 'mandate-real-assets-ii', fitScore: 'weak', reasoning: 'Energy transition theme is relevant but fund size below $500M threshold after GP restructuring.' },
    ],
    createdBy: 'system',
    createdAt: '2025-12-01T10:00:00Z',
    updatedAt: '2026-02-10T09:00:00Z',
  },
]

// ── News ──────────────────────────────────────────────────────────────

export const MOCK_NEWS_ITEMS: NewsItem[] = [
  {
    id: 'news-1',
    headline: 'Blackstone Closes Record $30.4B Real Estate Fund',
    summary: 'Blackstone has completed fundraising for BREP X, its largest-ever global opportunistic real estate fund, surpassing its $25B target.',
    fullContent: null,
    category: 'asset_manager',
    sourceUrl: 'https://example.com/blackstone-brep-x',
    linkedOpportunityIds: ['opp-brep-x'],
    generatedAt: '2026-04-10T08:00:00Z',
    createdAt: '2026-04-10T08:00:00Z',
  },
  {
    id: 'news-2',
    headline: 'Global PE Fundraising Hits $600B in Q1 2026',
    summary: 'Private equity fundraising reached record levels in the first quarter, driven by strong demand for growth equity and buyout strategies.',
    fullContent: null,
    category: 'market',
    sourceUrl: 'https://example.com/pe-fundraising-q1',
    linkedOpportunityIds: [],
    generatedAt: '2026-04-09T10:00:00Z',
    createdAt: '2026-04-09T10:00:00Z',
  },
  {
    id: 'news-3',
    headline: 'EU Introduces New ESG Disclosure Requirements for Fund Managers',
    summary: 'The European Commission has adopted new SFDR Level 2 amendments requiring enhanced sustainability disclosures from alternative fund managers.',
    fullContent: null,
    category: 'regulatory',
    sourceUrl: 'https://example.com/eu-esg-disclosure',
    linkedOpportunityIds: [],
    generatedAt: '2026-04-08T14:00:00Z',
    createdAt: '2026-04-08T14:00:00Z',
  },
  {
    id: 'news-4',
    headline: 'AI-Driven Drug Discovery Sector Sees Record Investment',
    summary: 'Venture capital investment in AI-driven biotech and drug discovery companies reached $12B in 2025, with Abingworth among the most active investors.',
    fullContent: null,
    category: 'sector',
    sourceUrl: 'https://example.com/ai-drug-discovery',
    linkedOpportunityIds: ['opp-abingworth-viii', 'opp-techbio-direct'],
    generatedAt: '2026-04-07T09:00:00Z',
    createdAt: '2026-04-07T09:00:00Z',
  },
  {
    id: 'news-5',
    headline: 'Sequoia Capital Restructures Into Permanent Capital Vehicle',
    summary: 'Sequoia Capital has finalized its transition to an evergreen fund structure, eliminating traditional fund lifecycles in favor of long-duration capital.',
    fullContent: null,
    category: 'asset_manager',
    sourceUrl: 'https://example.com/sequoia-restructure',
    linkedOpportunityIds: ['opp-sequoia-growth'],
    generatedAt: '2026-04-06T11:00:00Z',
    createdAt: '2026-04-06T11:00:00Z',
  },
]

// ── Dashboard Summary ─────────────────────────────────────────────────

export const MOCK_DASHBOARD_SUMMARY: DashboardSummary = {
  pipelineCounts: [
    { status: 'new', count: 2 },
    { status: 'active', count: 2 },
    { status: 'archived', count: 1 },
    { status: 'ignored', count: 1 },
  ],
  totalOpportunities: 6,
  mandateAllocations: [
    {
      mandateId: 'mandate-growth-2026',
      mandateName: 'Growth Equity 2026',
      targetAllocation: 150_000_000,
      currentAllocation: 35_000_000,
      opportunityCount: 3,
    },
    {
      mandateId: 'mandate-real-assets-ii',
      mandateName: 'Real Assets Fund II',
      targetAllocation: 200_000_000,
      currentAllocation: 50_000_000,
      opportunityCount: 3,
    },
  ],
  recentNews: MOCK_NEWS_ITEMS.slice(0, 3),
}

// ── Documents (Workspace) ─────────────────────────────────────────────

export interface WorkspaceDocument {
  id: string
  opportunityId: string
  templateId: string
  templateName: string
  title: string
  content: string
  status: 'draft' | 'in_review' | 'approved' | 'changes_requested'
  createdBy: string
  createdAt: string
  updatedAt: string
}

export const MOCK_DOCUMENTS: WorkspaceDocument[] = [
  {
    id: 'doc-1',
    opportunityId: 'opp-abingworth-viii',
    templateId: 'tmpl-fund-investment-memo',
    templateName: 'Investment Memo',
    title: 'Abingworth Bioventures VIII — Investment Memo',
    content: '# Investment Memo: Abingworth Bioventures VIII\n\n## Executive Summary\nAbingworth Bioventures VIII is a $450M life sciences venture capital fund targeting early to mid-stage biotech companies. The fund represents a compelling opportunity given the GP\'s 50+ year track record and the accelerating AI-driven drug discovery market.\n\n## Investment Thesis\nThe convergence of AI and biotechnology is creating unprecedented opportunities in drug discovery and development...',
    status: 'draft',
    createdBy: 'user-pine',
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-04-01T14:00:00Z',
  },
  {
    id: 'doc-2',
    opportunityId: 'opp-abingworth-viii',
    templateId: 'tmpl-fund-pre-screening',
    templateName: 'Pre-Screening',
    title: 'Abingworth Bioventures VIII — Pre-Screening Report',
    content: '# Pre-Screening: Abingworth Bioventures VIII\n\n## Quick Assessment\n- **Manager Quality**: Tier 1 — 50+ year track record in life sciences\n- **Strategy Fit**: Strong — aligns with Growth Equity 2026 healthcare allocation\n- **Terms**: Market standard (2/20)\n- **Recommendation**: Proceed to full due diligence',
    status: 'approved',
    createdBy: 'user-pine',
    createdAt: '2026-02-20T09:00:00Z',
    updatedAt: '2026-03-01T11:00:00Z',
  },
  {
    id: 'doc-3',
    opportunityId: 'opp-abingworth-viii',
    templateId: 'tmpl-fund-ddq',
    templateName: 'DDQ',
    title: 'Abingworth Bioventures VIII — Due Diligence Questionnaire',
    content: '# DDQ: Abingworth Bioventures VIII\n\n## 1. Organization & Team\n**Q: Describe the firm\'s history and evolution.**\nA: Founded in 1973, Abingworth is one of the longest-established life sciences venture firms globally...\n\n## 2. Investment Strategy\n**Q: Describe the fund\'s investment strategy.**\nA: ABV VIII targets Series A through Series C investments in therapeutics, diagnostics, and medtech...',
    status: 'in_review',
    createdBy: 'user-pine',
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-03-25T16:00:00Z',
  },
]

// ── Reviews ───────────────────────────────────────────────────────────

export interface DocumentReview {
  id: string
  documentId: string
  reviewerId: string
  status: 'pending' | 'approved' | 'changes_requested'
  comments: string | null
  createdAt: string
  updatedAt: string
}

export const MOCK_REVIEWS: DocumentReview[] = [
  {
    id: 'review-1',
    documentId: 'doc-3',
    reviewerId: 'user-usman',
    status: 'pending',
    comments: null,
    createdAt: '2026-03-25T16:00:00Z',
    updatedAt: '2026-03-25T16:00:00Z',
  },
]

// ── Shares ────────────────────────────────────────────────────────────

export interface DocumentShare {
  id: string
  documentId: string
  sharedWith: string
  permission: 'view' | 'comment' | 'edit'
  sharedBy: string
  createdAt: string
}

export const MOCK_SHARES: DocumentShare[] = [
  {
    id: 'share-1',
    documentId: 'doc-2',
    sharedWith: 'user-usman',
    permission: 'view',
    sharedBy: 'user-pine',
    createdAt: '2026-03-01T12:00:00Z',
  },
]
