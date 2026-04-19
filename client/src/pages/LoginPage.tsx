import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/useAuthStore'
import { InvictusLogo } from '@/components/shared/InvictusLogo'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) {
      setError('Please enter your credentials')
      return
    }
    try {
      await login(username, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <InvictusLogo size="xl" />
          </div>
          <h1 className="text-xl font-semibold">Invictus AI</h1>
          <p className="text-sm text-muted-foreground mt-1">Insights Platform</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Login</CardTitle>
            <CardDescription className="text-xs">
              Login with the data you entered during your registration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs">Username</Label>
                <Input
                  id="email"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError('') }}
                  placeholder="Username"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError('') }}
                    placeholder="Password"
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button type="submit" className="w-full h-10">
                Login
              </Button>
            </form>

            <button className="text-xs text-primary hover:underline mt-4 block text-center w-full">
              Forgot Password?
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
