import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { dealsApi } from '../../api'

interface TeamMemberActivity {
  userId: string
  userName: string
  actions: number
  lastActive: string
}

export function TeamActivity() {
  const [activity, setActivity] = useState<TeamMemberActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dealsApi.getTeamActivity()
      .then(setActivity)
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent team activity.</p>
        ) : (
          <div className="space-y-3">
            {activity.map((member) => {
              const maxActions = Math.max(...activity.map(a => a.actions))
              const pct = maxActions > 0 ? (member.actions / maxActions) * 100 : 0

              return (
                <div key={member.userId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{member.userName}</span>
                    <span className="text-muted-foreground">
                      {member.actions} actions
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last active: {new Date(member.lastActive).toLocaleString()}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
