import type { WorkflowDefinition } from '@/api/types'

export const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  // ── Invictus Engage ────────────────────────────────────────────────
  {
    name: 'client_360',
    description: 'Aggregates client data from CRM, portfolio, compliance, and communication modules into a unified 360-degree client profile with key insights.',
    modules: ['engage'],
    is_sample: false,
    workflow: 'client_360',
    category: 'Engage',
    icon: 'User',
    supportsHitl: false,
    inputFields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true, placeholder: 'e.g. CLT-00042' },
    ],
    steps: ['fetch_crm_data', 'fetch_portfolio', 'fetch_compliance', 'fetch_communications', 'aggregate_profile', 'generate_insights'],
  },
  {
    name: 'ai_updates',
    description: 'Extracts key decisions, action items, and follow-ups from meeting notes and writes them back to CRM records for automatic task creation.',
    modules: ['engage'],
    is_sample: false,
    workflow: 'ai_updates',
    category: 'Engage',
    icon: 'ListChecks',
    supportsHitl: false,
    inputFields: [
      { key: 'meeting_id', label: 'Meeting ID', type: 'text', required: true, placeholder: 'e.g. MTG-2026-0404' },
      { key: 'client_id', label: 'Client ID', type: 'text', required: false, placeholder: 'e.g. CLT-00042' },
    ],
    steps: ['fetch_meeting_notes', 'extract_action_items', 'categorize_actions', 'write_to_crm', 'notify_assignees'],
  },
  {
    name: 'fireflies',
    description: 'Parses meeting transcripts from Fireflies.ai, extracts key topics, sentiment, decisions, and participant contributions for relationship intelligence.',
    modules: ['engage'],
    is_sample: false,
    workflow: 'fireflies',
    category: 'Engage',
    icon: 'MessageSquare',
    supportsHitl: false,
    inputFields: [
      { key: 'transcript_id', label: 'Transcript ID', type: 'text', required: true, placeholder: 'e.g. FF-2026-0404-001' },
    ],
    steps: ['fetch_transcript', 'extract_topics', 'analyze_sentiment', 'identify_decisions', 'generate_summary'],
  },

  // ── Risk & Planning ─────────────────────────────────────────────────
  {
    name: 'kyc_fatca',
    description: 'Extracts KYC fields from onboarding documents and auto-generates compliance forms (W-8BEN, W-9, CRS) with confidence scores and source tracing.',
    modules: ['risk_planning'],
    is_sample: false,
    workflow: 'kyc_fatca',
    category: 'Risk & Plan',
    icon: 'Shield',
    supportsHitl: true,
    inputFields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true, placeholder: 'e.g. CLT-00042' },
      { key: 'doc_ids', label: 'Document IDs (comma-separated)', type: 'text', required: true, placeholder: 'e.g. KYC-001, KYC-002' },
    ],
    steps: ['fetch_documents', 'extract_kyc_fields', 'validate_fields', 'determine_form_type', 'generate_forms', 'human_review', 'finalize'],
  },
  {
    name: 'discrepancy_detection',
    description: 'Two-pass comparison identifying portfolio mismatches between internal records and custodian reports with severity classification and resolution suggestions.',
    modules: ['risk_planning'],
    is_sample: false,
    workflow: 'discrepancy_detection',
    category: 'Risk & Plan',
    icon: 'AlertTriangle',
    supportsHitl: false,
    inputFields: [
      { key: 'portfolio_id', label: 'Portfolio ID', type: 'text', required: true, placeholder: 'e.g. PF-00123' },
      { key: 'report_date', label: 'Report Date', type: 'text', required: true, placeholder: 'e.g. 2026-04-01' },
    ],
    steps: ['fetch_internal_records', 'fetch_custodian_data', 'first_pass_comparison', 'second_pass_analysis', 'classify_discrepancies', 'generate_report'],
  },

  {
    name: 'portfolio_recommendation',
    description: 'Scores and recommends investment portfolios based on client risk profile, investment objectives, market conditions, and compliance constraints.',
    modules: ['risk_planning'],
    is_sample: false,
    workflow: 'portfolio_recommendation',
    category: 'Risk & Plan',
    icon: 'PieChart',
    supportsHitl: true,
    inputFields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true, placeholder: 'e.g. CLT-00042' },
      { key: 'investment_amount', label: 'Investment Amount', type: 'number', required: true, placeholder: 'e.g. 1000000' },
    ],
    steps: ['fetch_client_profile', 'analyze_risk_tolerance', 'scan_market_conditions', 'generate_recommendations', 'human_review', 'finalize_recommendation'],
  },

  // ── Data Aggregation & Reporting ───────────────────────────────────
  {
    name: 'data_ingestion',
    description: 'Validates and extracts transaction data from bank statements, custodian reports, and other financial documents with automated reconciliation.',
    modules: ['data_reporting'],
    is_sample: false,
    workflow: 'data_ingestion',
    category: 'Data & Reports',
    icon: 'Database',
    supportsHitl: false,
    inputFields: [
      { key: 'doc_ids', label: 'Document IDs (comma-separated)', type: 'text', required: true, placeholder: 'e.g. STMT-001, STMT-002' },
      { key: 'source_type', label: 'Source Type', type: 'select', required: true, options: ['bank_statement', 'custodian_report', 'trade_confirmation'] },
    ],
    steps: ['validate_documents', 'extract_transactions', 'normalize_data', 'detect_anomalies', 'write_to_database'],
  },
  {
    name: 'post_acquisition_report',
    description: 'Generates weekly post-acquisition performance reports by aggregating portfolio returns, benchmark comparisons, and attribution analysis.',
    modules: ['data_reporting'],
    is_sample: false,
    workflow: 'post_acquisition_report',
    category: 'Data & Reports',
    icon: 'FileBarChart',
    supportsHitl: true,
    inputFields: [
      { key: 'portfolio_id', label: 'Portfolio ID', type: 'text', required: true, placeholder: 'e.g. PF-00123' },
      { key: 'period', label: 'Reporting Period', type: 'select', required: true, options: ['weekly', 'monthly', 'quarterly'] },
    ],
    steps: ['fetch_portfolio_data', 'calculate_returns', 'benchmark_comparison', 'attribution_analysis', 'draft_report', 'human_review', 'finalize_report'],
  },
  {
    name: 'news_feed_recommender',
    description: 'Scans financial news sources daily and curates a personalized feed of market updates, regulatory changes, and client-relevant events.',
    modules: ['data_reporting'],
    is_sample: false,
    workflow: 'news_feed_recommender',
    category: 'Data & Reports',
    icon: 'Newspaper',
    supportsHitl: false,
    inputFields: [
      { key: 'topics', label: 'Topics (comma-separated)', type: 'text', required: false, placeholder: 'e.g. fintech, regulation, markets' },
      { key: 'region', label: 'Region', type: 'select', required: false, options: ['global', 'gcc', 'europe', 'americas', 'asia'] },
    ],
    steps: ['fetch_news_sources', 'filter_relevance', 'score_articles', 'personalize_feed', 'publish_feed'],
  },

  // ── Deals ───────────────────────────────────────────────────────────
  {
    name: 'investment_memo',
    description: 'Generates comprehensive investment memos by extracting financials from deal documents, conducting market research, and drafting executive summaries with key metrics.',
    modules: ['deals'],
    is_sample: false,
    workflow: 'investment_memo',
    category: 'Deals',
    icon: 'FileText',
    supportsHitl: true,
    inputFields: [
      { key: 'deal_id', label: 'Deal ID', type: 'text', required: true, placeholder: 'e.g. DEAL-2026-001' },
      { key: 'doc_ids', label: 'Document IDs (comma-separated)', type: 'text', required: true, placeholder: 'e.g. DOC-001, DOC-002' },
      { key: 'deal_name', label: 'Deal Name', type: 'text', required: false, placeholder: 'e.g. Acme Corp Series B' },
    ],
    steps: ['fetch_documents', 'extract_financials', 'market_research', 'draft_memo', 'human_review', 'finalize'],
  },

  // ── Client Portal ──────────────────────────────────────────────────
  {
    name: 'client_onboarding',
    description: 'Guides new clients through the digital onboarding process — collects documents, validates identity, sets up accounts, and triggers compliance checks.',
    modules: ['client_portal'],
    is_sample: false,
    workflow: 'client_onboarding',
    category: 'Client Portal',
    icon: 'UserPlus',
    supportsHitl: true,
    inputFields: [
      { key: 'client_name', label: 'Client Name', type: 'text', required: true, placeholder: 'e.g. John Smith' },
      { key: 'client_email', label: 'Client Email', type: 'text', required: true, placeholder: 'e.g. john@example.com' },
      { key: 'account_type', label: 'Account Type', type: 'select', required: true, options: ['individual', 'joint', 'corporate', 'trust'] },
    ],
    steps: ['collect_documents', 'validate_identity', 'risk_assessment', 'setup_accounts', 'compliance_check', 'human_review', 'activate_account'],
  },
  {
    name: 'client_report_generator',
    description: 'Generates personalized portfolio performance reports for clients including returns, asset allocation, benchmark comparison, and market commentary.',
    modules: ['client_portal'],
    is_sample: false,
    workflow: 'client_report_generator',
    category: 'Client Portal',
    icon: 'FileSpreadsheet',
    supportsHitl: false,
    inputFields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true, placeholder: 'e.g. CLT-00042' },
      { key: 'period', label: 'Report Period', type: 'select', required: true, options: ['monthly', 'quarterly', 'annual'] },
    ],
    steps: ['fetch_client_data', 'calculate_performance', 'generate_charts', 'add_commentary', 'format_report', 'deliver_to_portal'],
  },

  // ── Copilot (production workflow) ──────────────────────────────────
  {
    name: 'copilot',
    description: 'Conversational AI copilot for wealth management — answers questions using CRM tools, document research, and web search with source citations.',
    modules: ['engage'],
    is_sample: false,
    workflow: 'copilot',
    category: 'Engage',
    icon: 'MessageSquare',
    supportsHitl: false,
    inputFields: [
      { key: 'message', label: 'Message', type: 'text', required: true },
    ],
    steps: ['agent', 'summarize'],
  },
]
