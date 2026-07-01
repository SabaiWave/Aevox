// ─── Agent System ────────────────────────────────────────────────────────────

export type AgentStatus = 'success' | 'failed' | 'degraded'

export interface AgentUsage {
  tokensIn?: number
  tokensOut?: number
  searchCount?: number
  charsUsed?: number
}

export interface AgentResult<T> {
  status: AgentStatus
  data: T | null
  error?: string
  confidence?: number   // 0–1, used by ResearchAgent
  gaps?: string[]       // missing info gaps, used by ResearchAgent + buildDegradedContext
  sourceUrls?: string[] // used by ResearchAgent
  durationMs?: number   // elapsed time for this agent stage
  usage?: AgentUsage
}

// ─── Research ────────────────────────────────────────────────────────────────

export interface ResearchSource {
  url: string
  title: string
  snippet: string
  confidence: number // 0–1, per-source relevance score
}

export interface SourcePackage {
  sources: ResearchSource[]
  summary: string
  confidence: number // 0–1
  gaps: string[]
}

// ─── Voice / Publish Outputs ─────────────────────────────────────────────────

export interface VoiceOutput {
  audioUrl: string
  durationSeconds: number
  charsUsed: number
}

export interface VideoOutput {
  videoUrl: string
  durationSeconds: number
  imageCount: number
}

export interface PublishOutput {
  videoId: string
  videoUrl: string
  title: string
}

// ─── Channel Config ──────────────────────────────────────────────────────────

export interface ChannelConfig {
  id: string
  userId: string
  name: string
  niche: string
  tone: string
  scriptStructure: string
  targetDurationMin: number
  forbiddenTopics: string[]
  voiceId: string
  voiceModel: string
  ytTitleTemplate: string
  ytDescriptionTemplate: string
  ytTags: string[]
  ytCategoryId: string
  ytPrivacy: 'private' | 'unlisted' | 'public'
  createdAt: string
  updatedAt: string
}

// ─── Pipeline Run ─────────────────────────────────────────────────────────────

export type PipelineRunStatus = 'pending' | 'running' | 'complete' | 'failed'

export interface PipelineRun {
  id: string
  userId: string
  configId: string | null
  topic: string
  status: PipelineRunStatus
  researchResult: AgentResult<SourcePackage> | null
  scriptResult: AgentResult<string> | null
  voiceResult: AgentResult<VoiceOutput> | null
  videoResult: AgentResult<VideoOutput> | null
  publishResult: AgentResult<PublishOutput> | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export interface DegradedContext {
  failedStages: string[]
  gapMessages: string[]
  availableData: Partial<{
    research: SourcePackage
    script: string
    voice: VoiceOutput
    video: VideoOutput
    publish: PublishOutput
  }>
}

export interface PipelineResult {
  runId: string
  status: PipelineRunStatus
  research: AgentResult<SourcePackage> | null
  script: AgentResult<string> | null
  voice: AgentResult<VoiceOutput> | null
  video: AgentResult<VideoOutput> | null
  publish: AgentResult<PublishOutput> | null
  degradedContext: DegradedContext | null
  totalDurationMs: number
}

// ─── User / Billing ───────────────────────────────────────────────────────────

export type UserTier = 'free' | 'starter' | 'pro'

export interface User {
  id: string
  clerkId: string
  email: string
  tier: UserTier
  createdAt: string
  updatedAt: string
}

// ─── SSE Events ───────────────────────────────────────────────────────────────

export type PipelineStage = 'research' | 'script' | 'voice' | 'video' | 'publish'
export type StageState = 'pending' | 'running' | 'complete' | 'failed' | 'degraded'

export interface SSEEvent {
  type: 'stage_start' | 'stage_complete' | 'stage_failed' | 'pipeline_done' | 'pipeline_error'
  stage?: PipelineStage
  state?: StageState
  data?: unknown
  message?: string
  timestamp: string
}
