import { api } from './client'
import type { AgentRunResponse, TriggerRequest, TriggerResponse, ResumeRequest, WorkflowDefinition, DailySummary, MeetingBrief, FeedbackRequest, FeedbackResponse } from './types'

export const agentsApi = {
  list: () => api.get<WorkflowDefinition[]>('/agents'),
  trigger: (workflow: string, data: TriggerRequest) => api.post<TriggerResponse>(`/agents/${workflow}/run`, data),
}

export const runsApi = {
  get: (runId: string) => api.get<AgentRunResponse>(`/runs/${runId}`),
  list: (workflow?: string) => api.get<AgentRunResponse[]>(`/runs${workflow ? `?workflow=${workflow}` : ''}`),
  resume: (runId: string, data: ResumeRequest) => api.post<TriggerResponse>(`/runs/${runId}/resume`, data),
  feedback: (runId: string, data: FeedbackRequest) => api.post<FeedbackResponse>(`/runs/${runId}/feedback`, data),
}

export const summariesApi = {
  list: () => api.get<DailySummary[]>('/daily-summaries'),
}

export const meetingBriefsApi = {
  get: (meetingId: string) => api.get<MeetingBrief>(`/meeting-briefs/${meetingId}`),
}
