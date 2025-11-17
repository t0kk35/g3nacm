'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { signIn } from "next-auth/react"
import { FormError } from "@/components/ui/custom/form-error"

export function LoginForm() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('')
    const res = await signIn("credentials", { name, password, redirect: false })
    // Check if there was an error in the signIn response
    if (res?.error || !res?.ok) {
      console.log(`Error Logging in ${res?.error} ${res?.code}`)
      setError(`Could not Login User`);
      setPassword('');  
    } else {
      // Had to add time-outs here because the forwarding did not work in 'start'-mode. Suspect it 
      // might take a while for the cookies to be added and that the middleware routes back here before
      // it can see the cookies.
      setTimeout(() => {
        router.push('/');
      }, 500);
      setTimeout(() => {
        router.refresh();
      }, 200);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Login</CardTitle>
      </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pb-2">
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                type="text"
                placeholder="Enter your user ID"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <FormError error={error} />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              Log in
            </Button>
          </CardFooter>
      </form>
    </Card>
  )
}