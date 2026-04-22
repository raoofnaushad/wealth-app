import type {
  InvestmentType,
  DocumentTemplate,
  Mandate,
  Opportunity,
  AssetManager,
  NewsItem,
  DashboardSummary,
  EmailAccount,
  SyncedEmail,
  GoogleDriveAccount,
  DriveFolder,
  SourceFile,
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
  {
    id: 'am-vybros',
    name: 'Vybros Capital Partners',
    type: 'Private Equity',
    location: 'Belgium',
    description: 'Belgian private equity firm specializing in buy-and-build strategies in fragmented service markets. Led the leveraged buyout of Envirosoil NV in October 2024.',
    fundInfo: {
      'Current Fund': 'Vybros Capital Fund I',
      'Fund Size': 'Undisclosed',
      'Vintage': '2024',
      'Strategy': 'Buyout (LBO)',
    },
    firmInfo: {
      'Founded': 'N/A',
      'AUM': 'Undisclosed',
      'Team Size': 'N/A',
      'Headquarters': 'Belgium',
    },
    strategy: {
      'Focus': 'Environmental services, buy-and-build',
      'Stage': 'LBO / Platform',
      'Geography': 'Belgium / Benelux',
    },
    characteristics: {
      'Track Record': 'First institutional deal — Envirosoil platform',
      'ESG Rating': 'N/A',
    },
    createdByType: 'manual',
    createdAt: '2026-04-20T10:00:00Z',
    updatedAt: '2026-04-20T10:00:00Z',
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
    strategyFit: 'strong',
    recommendation: 'approve',
    approvalStage: 'ic_review',
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
    strategyFit: 'strong',
    recommendation: 'approve',
    approvalStage: 'approved',
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
    strategyFit: 'moderate',
    recommendation: 'watch',
    approvalStage: 'new',
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
    strategyFit: 'moderate',
    recommendation: 'watch',
    approvalStage: 'pre_screening',
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
    strategyFit: 'limited',
    recommendation: 'pass',
    approvalStage: 'rejected',
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
    strategyFit: 'limited',
    recommendation: 'pass',
    approvalStage: 'rejected',
    createdBy: 'system',
    createdAt: '2025-12-01T10:00:00Z',
    updatedAt: '2026-02-10T09:00:00Z',
  },
  {
    id: 'opp-envirosoil',
    name: 'Envirosoil NV',
    investmentTypeId: 'invtype-direct',
    investmentTypeName: 'Direct',
    pipelineStatus: 'active',
    assetManagerId: 'am-vybros',
    assetManagerName: 'Vybros Capital Partners',
    assignedTo: 'user-raoof',
    snapshotData: {
      'Company Name': 'Envirosoil NV',
      'Sector': 'Environmental Services (Soil Remediation, PFAS Investigation)',
      'Revenue': 10_400_000,
      'EBITDA': 1_900_000,
      'Valuation': 0,
      'Stake Offered': 0,
      'Investment Amount': 0,
    },
    snapshotCitations: {
      'Revenue': 'Sniff Test p. 1 — FY2024 €10.4M',
      'EBITDA': 'Sniff Test p. 1 — FY2024 €1.9M (18.4% margin)',
    },
    sourceType: 'inbound',
    mandateFits: [
      { mandateId: 'mandate-real-assets-ii', fitScore: 'moderate', reasoning: 'Environmental services tangentially related to energy transition theme. Belgian regulatory-driven demand provides stable cash flows similar to infrastructure. Zero debt and capital-light model aligns with real assets criteria.' },
      { mandateId: 'mandate-growth-2026', fitScore: 'weak', reasoning: 'Environmental services sector outside core tech/healthcare focus. Revenue below $10M ARR threshold. However, buy-and-build strategy has growth equity characteristics.' },
    ],
    strategyFit: 'moderate',
    recommendation: 'approve',
    approvalStage: 'pre_screening',
    createdBy: 'user-raoof',
    createdAt: '2026-04-22T10:00:00Z',
    updatedAt: '2026-04-22T10:00:00Z',
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
  {
    id: 'news-6',
    headline: 'Vybros Capital Partners Builds Environmental Services Platform with Envirosoil NV',
    summary: 'Belgian PE firm Vybros Capital Partners is building a buy-and-build platform in environmental services, anchored by Envirosoil NV. The company completed its first add-on acquisition (A+E Consult) in June 2025, validating the consolidation thesis in the fragmented Belgian market.',
    fullContent: null,
    category: 'sector',
    sourceUrl: 'https://example.com/vybros-envirosoil-platform',
    linkedOpportunityIds: ['opp-envirosoil'],
    generatedAt: '2026-04-20T08:00:00Z',
    createdAt: '2026-04-20T08:00:00Z',
  },
]

// ── Dashboard Summary ─────────────────────────────────────────────────

export const MOCK_DASHBOARD_SUMMARY: DashboardSummary = {
  pipelineCounts: [
    { status: 'new', count: 2 },
    { status: 'active', count: 3 },
    { status: 'archived', count: 1 },
    { status: 'ignored', count: 1 },
  ],
  totalOpportunities: 7,
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
      opportunityCount: 4,
    },
  ],
  recentNews: MOCK_NEWS_ITEMS.slice(0, 3),
}

// ── Documents (Workspace) ─────────────────────────────────────────────

export interface WorkspaceDocument {
  id: string
  opportunityId: string
  templateId: string | null
  templateName: string
  name: string
  title: string
  documentType: string
  content: string | null
  status: 'draft' | 'in_review' | 'approved' | 'changes_requested'
  version: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export const MOCK_DOCUMENTS: WorkspaceDocument[] = [
  {
    id: 'doc-1',
    opportunityId: 'opp-abingworth-viii',
    templateId: 'tmpl-fund-investment-memo',
    templateName: 'Investment Memo',
    name: 'Abingworth Bioventures VIII — Investment Memo',
    title: 'Abingworth Bioventures VIII — Investment Memo',
    documentType: 'investment_memo',
    content: '<h1>Investment Memo: Abingworth Bioventures VIII</h1><h2>Executive Summary</h2><p>Abingworth Bioventures VIII is a $450M life sciences venture capital fund targeting early to mid-stage biotech companies. The fund represents a compelling opportunity given the GP\'s 50+ year track record and the accelerating AI-driven drug discovery market.</p><h2>Investment Thesis</h2><p>The convergence of AI and biotechnology is creating unprecedented opportunities in drug discovery and development...</p>',
    version: 1,
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
    name: 'Abingworth Bioventures VIII — Pre-Screening Report',
    title: 'Abingworth Bioventures VIII — Pre-Screening Report',
    documentType: 'pre_screening',
    content: '<h1>Pre-Screening: Abingworth Bioventures VIII</h1><h2>Quick Assessment</h2><ul><li><strong>Manager Quality</strong>: Tier 1 — 50+ year track record in life sciences</li><li><strong>Strategy Fit</strong>: Strong — aligns with Growth Equity 2026 healthcare allocation</li><li><strong>Terms</strong>: Market standard (2/20)</li><li><strong>Recommendation</strong>: Proceed to full due diligence</li></ul>',
    version: 1,
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
    name: 'Abingworth Bioventures VIII — Due Diligence Questionnaire',
    title: 'Abingworth Bioventures VIII — Due Diligence Questionnaire',
    documentType: 'ddq',
    content: '<h1>DDQ: Abingworth Bioventures VIII</h1><h2>1. Organization &amp; Team</h2><p><strong>Q: Describe the firm\'s history and evolution.</strong></p><p>A: Founded in 1973, Abingworth is one of the longest-established life sciences venture firms globally...</p><h2>2. Investment Strategy</h2><p><strong>Q: Describe the fund\'s investment strategy.</strong></p><p>A: ABV VIII targets Series A through Series C investments in therapeutics, diagnostics, and medtech...</p>',
    version: 1,
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

// ── Email Accounts ───────────────────────────────────────────────────

export const MOCK_EMAIL_ACCOUNTS: EmailAccount[] = [
  {
    id: 'email-acc-1',
    userId: 'user-raoof',
    provider: 'gmail',
    emailAddress: 'raoof@watar.com',
    status: 'connected',
    lastSyncedAt: '2026-04-13T08:00:00Z',
    syncLabels: ['INBOX'],
    createdAt: '2026-04-10T10:00:00Z',
    updatedAt: '2026-04-13T08:00:00Z',
  },
]

// ── Synced Emails ────────────────────────────────────────────────────

export const MOCK_SYNCED_EMAILS: SyncedEmail[] = [
  {
    id: 'email-1',
    emailAccountId: 'email-acc-1',
    fromAddress: 'ir@abingworth.com',
    fromName: 'Abingworth Investor Relations',
    subject: 'Abingworth ABV 9 — LP Opportunity',
    bodyText: 'We are pleased to present Abingworth Bioventures IX, our latest life sciences fund targeting $600M. Attached is the preliminary PPM and term sheet for your review.',
    bodyHtml: null,
    receivedAt: '2026-04-12T09:15:00Z',
    attachmentCount: 2,
    importStatus: 'new',
    opportunityId: null,
    attachments: [
      { id: 'att-1a', fileName: 'ABV9_PPM_Draft.pdf', fileType: 'application/pdf', fileSize: 4_500_000 },
      { id: 'att-1b', fileName: 'ABV9_Term_Sheet.pdf', fileType: 'application/pdf', fileSize: 890_000 },
    ],
    createdAt: '2026-04-12T09:16:00Z',
  },
  {
    id: 'email-2',
    emailAccountId: 'email-acc-1',
    fromAddress: 'deals@blackstone.com',
    fromName: 'Blackstone Capital Markets',
    subject: 'Blackstone BREP X Co-Investment',
    bodyText: 'Following our discussion, please find the co-investment allocation details for the European logistics portfolio. The minimum ticket is $25M with no management fee.',
    bodyHtml: null,
    receivedAt: '2026-04-11T14:30:00Z',
    attachmentCount: 3,
    importStatus: 'imported',
    opportunityId: 'opp-brep-x',
    attachments: [
      { id: 'att-2a', fileName: 'BREP_X_CoInvest_Memo.pdf', fileType: 'application/pdf', fileSize: 3_200_000 },
      { id: 'att-2b', fileName: 'Logistics_Portfolio_Overview.pdf', fileType: 'application/pdf', fileSize: 2_100_000 },
      { id: 'att-2c', fileName: 'Side_Letter_Draft.docx', fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileSize: 450_000 },
    ],
    createdAt: '2026-04-11T14:31:00Z',
  },
  {
    id: 'email-3',
    emailAccountId: 'email-acc-1',
    fromAddress: 'sarah.chen@cimgroup.com',
    fromName: 'Sarah Chen',
    subject: 'CIM — TechCo Series C Growth Equity',
    bodyText: 'CIM is leading a $150M Series C round in TechCo, a high-growth enterprise SaaS platform. We are offering co-investment alongside our Fund VII. Revenue is $45M ARR growing 80% YoY.',
    bodyHtml: null,
    receivedAt: '2026-04-11T10:00:00Z',
    attachmentCount: 1,
    importStatus: 'new',
    opportunityId: null,
    attachments: [
      { id: 'att-3a', fileName: 'TechCo_SeriesC_Teaser.pdf', fileType: 'application/pdf', fileSize: 1_800_000 },
    ],
    createdAt: '2026-04-11T10:01:00Z',
  },
  {
    id: 'email-4',
    emailAccountId: 'email-acc-1',
    fromAddress: 'mark.jones@goldmansachs.com',
    fromName: 'Mark Jones',
    subject: 'GS Infrastructure Partners Fund V — Final Close',
    bodyText: 'Goldman Sachs Infrastructure Partners is approaching final close for Fund V at $15B. Attached are the updated terms and performance data from Fund IV.',
    bodyHtml: null,
    receivedAt: '2026-04-10T16:45:00Z',
    attachmentCount: 2,
    importStatus: 'new',
    opportunityId: null,
    attachments: [
      { id: 'att-4a', fileName: 'GSIP_V_LP_Update.pdf', fileType: 'application/pdf', fileSize: 5_600_000 },
      { id: 'att-4b', fileName: 'Fund_IV_Performance.xlsx', fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fileSize: 320_000 },
    ],
    createdAt: '2026-04-10T16:46:00Z',
  },
  {
    id: 'email-5',
    emailAccountId: 'email-acc-1',
    fromAddress: 'allocations@sequoiacap.com',
    fromName: 'Sequoia Capital Allocations',
    subject: 'Sequoia Growth Fund — Q1 2026 Update & New Allocation',
    bodyText: 'Please find attached our Q1 2026 quarterly update and details on a new allocation opportunity in the Sequoia Growth Fund evergreen vehicle.',
    bodyHtml: null,
    receivedAt: '2026-04-09T11:20:00Z',
    attachmentCount: 0,
    importStatus: 'imported',
    opportunityId: 'opp-sequoia-growth',
    attachments: [],
    createdAt: '2026-04-09T11:21:00Z',
  },
  {
    id: 'email-6',
    emailAccountId: 'email-acc-1',
    fromAddress: 'fundraising@apolloglobal.com',
    fromName: 'Apollo Global Management',
    subject: 'Apollo Natural Resources Fund II — Invitation to Commit',
    bodyText: 'Apollo is raising its second dedicated natural resources fund targeting $3B. The strategy focuses on energy transition and critical minerals. Minimum commitment is $10M.',
    bodyHtml: null,
    receivedAt: '2026-04-08T08:30:00Z',
    attachmentCount: 0,
    importStatus: 'new',
    opportunityId: null,
    attachments: [],
    createdAt: '2026-04-08T08:31:00Z',
  },
  {
    id: 'email-7',
    emailAccountId: 'email-acc-1',
    fromAddress: 'noreply@pitchbook.com',
    fromName: 'PitchBook Alerts',
    subject: 'Weekly PE Deal Alert — April 7, 2026',
    bodyText: 'Your weekly summary of new PE and VC fundraising activity is ready. This week saw 23 new fund launches across growth equity, buyout, and venture strategies.',
    bodyHtml: null,
    receivedAt: '2026-04-07T07:00:00Z',
    attachmentCount: 0,
    importStatus: 'ignored',
    opportunityId: null,
    attachments: [],
    createdAt: '2026-04-07T07:01:00Z',
  },
  {
    id: 'email-8',
    emailAccountId: 'email-acc-1',
    fromAddress: 'james.wu@brookfield.com',
    fromName: 'James Wu',
    subject: 'Brookfield Real Estate Credit Fund IV — LP Materials',
    bodyText: 'Brookfield is launching its fourth real estate credit fund targeting $8B. The fund will focus on senior secured lending across logistics, data centers, and life sciences real estate.',
    bodyHtml: null,
    receivedAt: '2026-04-06T15:10:00Z',
    attachmentCount: 2,
    importStatus: 'new',
    opportunityId: null,
    attachments: [
      { id: 'att-8a', fileName: 'Brookfield_RECF_IV_Teaser.pdf', fileType: 'application/pdf', fileSize: 2_900_000 },
      { id: 'att-8b', fileName: 'Credit_Strategy_Overview.pdf', fileType: 'application/pdf', fileSize: 1_500_000 },
    ],
    createdAt: '2026-04-06T15:11:00Z',
  },
]

// ── Google Drive Accounts ────────────────────────────────────────────

export const MOCK_GOOGLE_DRIVE_ACCOUNTS: GoogleDriveAccount[] = [
  {
    id: 'gdrive-acc-1',
    userId: 'user-raoof',
    emailAddress: 'raoof@watar.com',
    status: 'connected',
    createdAt: '2026-04-10T10:00:00Z',
    updatedAt: '2026-04-10T10:00:00Z',
  },
]

// ── Drive Folders ────────────────────────────────────────────────────

export const MOCK_DRIVE_FOLDERS: DriveFolder[] = [
  { id: 'folder-1', name: 'Deal Documents 2026', path: '/Deal Documents 2026', hasChildren: true },
  { id: 'folder-2', name: 'Fund Opportunities', path: '/Fund Opportunities', hasChildren: true },
  { id: 'folder-3', name: 'Direct Investments', path: '/Direct Investments', hasChildren: false },
  { id: 'folder-4', name: 'Co-Investment Pipeline', path: '/Co-Investment Pipeline', hasChildren: true },
  { id: 'folder-5', name: 'Archive 2025', path: '/Archive 2025', hasChildren: false },
]

// ── Source Files ─────────────────────────────────────────────────────

export const MOCK_SOURCE_FILES: SourceFile[] = [
  {
    id: 'sf-1',
    opportunityId: 'opp-abingworth-viii',
    fileName: 'Wonder Group Inc — SAFE Note Teaser.pdf',
    fileUrl: '/files/mock/wonder-group-safe-note.pdf',
    fileType: 'application/pdf',
    fileSize: 547_104,
    processed: true,
    sourceOrigin: 'email',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'sf-2',
    opportunityId: 'opp-abingworth-viii',
    fileName: 'Qualia — VC Opportunity Assessment Framework.docx',
    fileUrl: '/files/mock/qualia-vc-assessment.docx',
    fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: 113_273,
    processed: true,
    sourceOrigin: 'google-drive',
    createdAt: '2026-03-05T14:00:00Z',
  },
  {
    id: 'sf-3',
    opportunityId: 'opp-abingworth-viii',
    fileName: 'Deepixel Team Members.xlsx',
    fileUrl: '/files/mock/deepixel-team-members.xlsx',
    fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileSize: 6_610,
    processed: true,
    sourceOrigin: 'email',
    createdAt: '2026-03-10T09:00:00Z',
  },
  {
    id: 'sf-envirosoil-sniff',
    opportunityId: 'opp-envirosoil',
    fileName: 'Sniff Test_Envirosoil.pdf',
    fileUrl: '/files/Sniff Test_Envirosoil.pdf',
    fileType: 'application/pdf',
    fileSize: 261_734,
    processed: true,
    sourceOrigin: 'manual',
    createdAt: '2026-04-22T10:00:00Z',
  },
]

// ── Team Members ─────────────────────────────────────────────────────

export interface TeamMember {
  id: string
  name: string
  role: string
  email: string
}

// ── Approval Requests (Opportunity-Level) ───────────────────────────

export interface MockApprovalRequest {
  id: string
  opportunityId: string
  stage: string
  reviewerId: string
  requestedBy: string
  status: 'pending' | 'approved' | 'changes_requested'
  rationale: string | null
  documentIds: string[]
  requestedAt: string
  reviewedAt: string | null
}

export const MOCK_APPROVALS: MockApprovalRequest[] = [
  {
    id: 'approval-1',
    opportunityId: 'opp-abingworth-viii',
    stage: 'pre_screening',
    reviewerId: 'user-usman',
    requestedBy: 'user-pine',
    status: 'pending',
    rationale: null,
    documentIds: ['doc-1', 'doc-2'],
    requestedAt: '2026-04-10T10:00:00Z',
    reviewedAt: null,
  },
  {
    id: 'approval-2',
    opportunityId: 'opp-brep-x',
    stage: 'pre_screening',
    reviewerId: 'user-pine',
    requestedBy: 'user-raoof',
    status: 'approved',
    rationale: 'Strong sponsor, attractive co-invest terms. Proceed to IC.',
    documentIds: [],
    requestedAt: '2026-03-20T09:00:00Z',
    reviewedAt: '2026-03-22T14:00:00Z',
  },
]

// ── Team Members ─────────────────────────────────────────────────────

export const MOCK_TEAM_MEMBERS: TeamMember[] = [
  { id: 'user-raoof', name: 'Raoof Naushad', role: 'analyst', email: 'raoof@invictus.ai' },
  { id: 'user-usman', name: 'Usman Khan', role: 'manager', email: 'usman@invictus.ai' },
  { id: 'user-pine', name: 'Pine Anderson', role: 'manager', email: 'pine@invictus.ai' },
  { id: 'user-john', name: 'John Smith', role: 'analyst', email: 'john@invictus.ai' },
  { id: 'user-sarah', name: 'Sarah Johnson', role: 'manager', email: 'sarah@invictus.ai' },
]
