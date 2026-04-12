import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'
import { useDealsStore } from '../../store'
import { dealsApi } from '../../api'

export function CreateOpportunityDialog() {
  const navigate = useNavigate()
  const { investmentTypes, loadingInvestmentTypes, fetchInvestmentTypes } = useDealsStore()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [investmentTypeId, setInvestmentTypeId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open && investmentTypes.length === 0 && !loadingInvestmentTypes) {
      fetchInvestmentTypes()
    }
  }, [open, investmentTypes.length, loadingInvestmentTypes, fetchInvestmentTypes])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !investmentTypeId) return

    setSubmitting(true)
    try {
      const created = await dealsApi.createOpportunity({
        name: name.trim(),
        investmentTypeId,
        sourceType: 'manual',
      })
      setOpen(false)
      setName('')
      setInvestmentTypeId('')
      navigate(`/home/deals/opportunities/${created.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-1.5 size-4" />
        Add Opportunity
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Opportunity</DialogTitle>
            <DialogDescription>
              Create a new deal opportunity manually.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="opp-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="opp-name"
                placeholder="Opportunity name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="opp-type" className="text-sm font-medium">
                Investment Type
              </label>
              <select
                id="opp-type"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={investmentTypeId}
                onChange={(e) => setInvestmentTypeId(e.target.value)}
                required
              >
                <option value="">Select type...</option>
                {investmentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="submit" disabled={submitting || !name.trim() || !investmentTypeId}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
