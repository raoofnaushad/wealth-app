import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dealsApi } from '../../api'

interface ConnectGmailButtonProps {
  onConnected: () => void
}

export function ConnectGmailButton({ onConnected }: ConnectGmailButtonProps) {
  const [connecting, setConnecting] = useState(false)

  async function handleConnect() {
    setConnecting(true)
    try {
      await dealsApi.connectEmailAccount({
        provider: 'gmail',
        emailAddress: 'analyst@watar.com',
      })
      onConnected()
    } catch {
      // TODO: surface error to user
    } finally {
      setConnecting(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleConnect} disabled={connecting}>
      <Mail className="size-4 mr-2" />
      {connecting ? 'Connecting...' : 'Connect Gmail'}
    </Button>
  )
}
