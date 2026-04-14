import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { dealsApi } from '../../api'
import { useDealsStore } from '../../store'
import type { SyncedEmail } from '../../types'

interface ImportEmailDialogProps {
  email: SyncedEmail
  onClose: () => void
}

export function ImportEmailDialog({ email, onClose }: ImportEmailDialogProps) {
  const { investmentTypes, fetchInvestmentTypes } = useDealsStore()
  const [investmentTypeId, setInvestmentTypeId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<{ opportunityId: string } | null>(null)

  useEffect(() => {
    if (investmentTypes.length === 0) {
      fetchInvestmentTypes()
    }
  }, [investmentTypes.length, fetchInvestmentTypes])

  async function handleImport() {
    if (!investmentTypeId) return
    setSubmitting(true)
    try {
      const opportunity = await dealsApi.importEmail(email.id, { investmentTypeId })
      setSuccess({ opportunityId: opportunity.id })
    } catch {
      // TODO: surface error to user
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        {success ? (
          <>
            <DialogHeader>
              <DialogTitle>Email Imported</DialogTitle>
              <DialogDescription>
                The email has been imported as an opportunity.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <a
                href={`/home/deals/opportunities/${success.opportunityId}`}
                className="text-sm text-primary hover:underline"
              >
                View opportunity
              </a>
            </div>
            <DialogFooter className="mt-4">
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Import as Opportunity</DialogTitle>
              <DialogDescription>
                Import &ldquo;{email.subject || '(No subject)'}&rdquo; as a new opportunity.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2">
              <Label htmlFor="investment-type">Investment Type</Label>
              <Select value={investmentTypeId} onValueChange={(val) => setInvestmentTypeId(val ?? '')}>
                <SelectTrigger id="investment-type">
                  <SelectValue placeholder="Select investment type" />
                </SelectTrigger>
                <SelectContent>
                  {investmentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={submitting || !investmentTypeId}>
                {submitting ? 'Importing...' : 'Import'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
