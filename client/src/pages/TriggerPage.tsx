import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Play, ArrowLeft, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useAgentStore } from '@/store/useAgentStore'
import { LLMConfigForm } from '@/components/agents/LLMConfigForm'
import { agentsApi } from '@/api/endpoints'
import { LoadingScreen } from '@/components/shared/LoadingScreen'

export function TriggerPage() {
  const { workflow } = useParams<{ workflow: string }>()
  const navigate = useNavigate()
  const { fetchAgents, getAgent } = useAgentStore()

  const [provider, setProvider] = useState('azure_openai')
  const [model, setModel] = useState('gpt-4o')
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const agent = getAgent(workflow!)

  if (!agent) {
    return <LoadingScreen message="Loading workflow..." fullScreen={false} />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validate required fields
    const missing = (agent!.inputFields ?? []).filter((f) => f.required && !inputs[f.key]?.trim())
    if (missing.length > 0) {
      setError(`Missing required fields: ${missing.map((f) => f.label).join(', ')}`)
      return
    }

    setSubmitting(true)
    try {
      const processedInput: Record<string, unknown> = {}
      for (const field of agent!.inputFields ?? []) {
        const val = inputs[field.key]?.trim()
        if (!val) continue
        if (field.type === 'number') {
          processedInput[field.key] = Number(val)
        } else if (field.key.includes('ids') || field.key.includes('doc_ids')) {
          processedInput[field.key] = val.split(',').map((s) => s.trim())
        } else {
          processedInput[field.key] = val
        }
      }

      const result = await agentsApi.trigger(workflow!, {
        input: processedInput,
        llm_config: { provider, model },
      })
      navigate(`/home/runs/${result.run_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger run')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-3 -ml-2 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <h1 className="text-lg font-semibold">Trigger: {agent.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{agent.description}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Input Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(agent.inputFields ?? []).map((field) => (
              <div key={field.key} className="space-y-2">
                <Label className="text-xs">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {field.type === 'select' && field.options ? (
                  <Select
                    value={inputs[field.key] || ''}
                    onValueChange={(v) => { if (v) setInputs({ ...inputs, [field.key]: v }) }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={inputs[field.key] || ''}
                    onChange={(e) => setInputs({ ...inputs, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="h-9 text-sm"
                  />
                )}
              </div>
            ))}

            <Separator className="my-4" />

            <div>
              <h4 className="text-xs font-medium mb-3">LLM Configuration</h4>
              <LLMConfigForm
                provider={provider}
                model={model}
                onProviderChange={setProvider}
                onModelChange={setModel}
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting} className="w-full gap-2">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {submitting ? 'Triggering...' : 'Trigger Run'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
