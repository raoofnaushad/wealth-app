import { useState, useEffect } from 'react'
import { MessageSquare, Send, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { dealsApi } from '../../api'
import type { DocumentComment } from '../../types'

interface CommentsPanelProps {
  opportunityId: string
}

export function CommentsPanel({ opportunityId }: CommentsPanelProps) {
  const [comments, setComments] = useState<DocumentComment[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    dealsApi.listComments(opportunityId)
      .then((data) => {
        setComments(data)
        // Auto-expand all sections
        const sections = new Set(data.filter(c => c.sectionHeading).map(c => c.sectionHeading!))
        setExpandedSections(sections)
      })
      .finally(() => setLoading(false))
  }, [opportunityId])

  async function handleSubmitComment() {
    if (!newComment.trim() || submitting) return
    setSubmitting(true)
    try {
      const created = await dealsApi.createComment(opportunityId, { content: newComment.trim() })
      setComments([...comments, created])
      setNewComment('')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitReply(parentId: string) {
    if (!replyText.trim() || submitting) return
    setSubmitting(true)
    try {
      const parent = comments.find(c => c.id === parentId)
      const created = await dealsApi.createComment(opportunityId, {
        content: replyText.trim(),
        parentId,
        sectionHeading: parent?.sectionHeading ?? undefined,
        documentId: parent?.documentId ?? undefined,
      })
      setComments([...comments, created])
      setReplyText('')
      setReplyingTo(null)
    } finally {
      setSubmitting(false)
    }
  }

  function toggleSection(section: string) {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  // Group comments by section heading
  const topLevel = comments.filter(c => !c.parentId)
  const bySection = new Map<string, DocumentComment[]>()
  for (const c of topLevel) {
    const key = c.sectionHeading || 'General'
    if (!bySection.has(key)) bySection.set(key, [])
    bySection.get(key)!.push(c)
  }

  function getReplies(parentId: string): DocumentComment[] {
    return comments.filter(c => c.parentId === parentId)
  }

  return (
    <div className="flex flex-col h-full border-l">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <MessageSquare className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Comments</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {comments.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No comments yet. Start the conversation below.</p>
        ) : (
          Array.from(bySection).map(([section, sectionComments]) => (
            <div key={section}>
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground w-full"
                onClick={() => toggleSection(section)}
              >
                {expandedSections.has(section) ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
                {section}
                <span className="ml-auto text-[10px]">{sectionComments.length}</span>
              </button>

              {expandedSections.has(section) && (
                <div className="mt-2 space-y-3 ml-1 border-l pl-3">
                  {sectionComments.map((comment) => (
                    <div key={comment.id}>
                      <CommentBubble
                        comment={comment}
                        onReply={() => setReplyingTo(comment.id)}
                      />

                      {/* Replies */}
                      {getReplies(comment.id).map((reply) => (
                        <div key={reply.id} className="ml-6 mt-2">
                          <CommentBubble comment={reply} />
                        </div>
                      ))}

                      {/* Reply input */}
                      {replyingTo === comment.id && (
                        <div className="ml-6 mt-2 flex items-center gap-1.5">
                          <Input
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Reply..."
                            className="h-7 text-xs flex-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSubmitReply(comment.id)
                              }
                            }}
                          />
                          <Button
                            size="icon"
                            className="size-7 shrink-0"
                            onClick={() => handleSubmitReply(comment.id)}
                            disabled={!replyText.trim() || submitting}
                          >
                            <Send className="size-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New comment input */}
      <div className="border-t p-3">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmitComment() }}
          className="flex items-center gap-1.5"
        >
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="h-8 text-xs flex-1"
          />
          <Button
            type="submit"
            size="icon"
            className="size-8 shrink-0"
            disabled={!newComment.trim() || submitting}
          >
            <Send className="size-3.5" />
          </Button>
        </form>
      </div>
    </div>
  )
}

function CommentBubble({
  comment,
  onReply,
}: {
  comment: DocumentComment
  onReply?: () => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-semibold shrink-0">
          {comment.authorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <span className="text-xs font-medium">{comment.authorName}</span>
        <span className="text-[10px] text-muted-foreground">
          {new Date(comment.createdAt).toLocaleDateString()}
        </span>
      </div>
      <p className="text-xs text-foreground/90 leading-relaxed ml-7">{comment.content}</p>
      {onReply && (
        <button
          type="button"
          onClick={onReply}
          className="ml-7 text-[10px] text-muted-foreground hover:text-foreground"
        >
          Reply
        </button>
      )}
    </div>
  )
}
