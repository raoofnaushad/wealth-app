import { useState, useRef, useEffect } from 'react'
import { Send, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const COPILOT_MODELS = [
  { group: 'Anthropic', models: [
    { id: 'claude-haiku-4-5-20251001', label: 'Claude 4.5 Haiku', provider: 'Anthropic' },
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'Anthropic' },
    { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', provider: 'Anthropic' },
  ]},
  { group: 'Azure OpenAI', models: [
    { id: 'azure:inv-aii-gpt40-useast2-dev', label: 'GPT-4o', provider: 'Azure OpenAI' },
    { id: 'azure:inv-aii-gpt5chat-useast2-dev', label: 'GPT-5 Chat', provider: 'Azure OpenAI' },
  ]},
  { group: 'Open Source (OpenRouter)', models: [
    { id: 'openrouter:deepseek/deepseek-v3.2', label: 'DeepSeek V3.2', provider: 'DeepSeek' },
    { id: 'openrouter:google/gemma-4-26b-a4b-it', label: 'Gemma 4 26B', provider: 'Google' },
    { id: 'openrouter:moonshotai/kimi-k2.5', label: 'Kimi K2.5', provider: 'Moonshot' },
  ]},
]

const ALL_MODELS = COPILOT_MODELS.flatMap((g) => g.models)

interface ChatInputProps {
  onSend: (message: string, model?: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [selectedModel, setSelectedModel] = useState('claude-haiku-4-5-20251001')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentModel = ALL_MODELS.find((m) => m.id === selectedModel)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [value])

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed, selectedModel)
    setValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-border">
      {/* Model selector */}
      <div className="px-3 pt-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-accent cursor-pointer">
            <span className="font-medium">{currentModel?.label}</span>
            <span className="text-muted-foreground/60">· {currentModel?.provider}</span>
            <ChevronDown className="h-3 w-3 ml-0.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {COPILOT_MODELS.map((group, gi) => (
              <div key={group.group}>
                {gi > 0 && <DropdownMenuSeparator />}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {group.group}
                  </DropdownMenuLabel>
                  {group.models.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{model.label}</span>
                      <span className="text-[10px] text-muted-foreground">{model.provider}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Input row */}
      <div className="flex items-end gap-2 p-3 pt-1.5">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the AI copilot..."
          disabled={disabled}
          className="min-h-[36px] max-h-[120px] resize-none text-sm"
          rows={1}
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          className="h-9 w-9 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
