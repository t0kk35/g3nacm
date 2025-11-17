'use server'

import { LoginForm } from '@/components/login/LoginForm'

export default async function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">Login to g3nACM</h1>
        <LoginForm />
      </div>
    </div>
  )
}