'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-3 h-3 rounded-full bg-[#FF6B47]" />
          <span className="text-white text-xs font-bold tracking-widest">AI FRONT DESK</span>
        </div>

        <h1 className="text-white text-2xl italic mb-2" style={{ fontFamily: 'Georgia, serif' }}>
          Bon retour.
        </h1>
        <p className="text-gray-400 text-sm mb-8">Connectez-vous à votre tableau de bord.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold tracking-wider text-gray-500 mb-2">
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#12161F] border border-[#232833] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF6B47]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wider text-gray-500 mb-2">
              MOT DE PASSE
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#12161F] border border-[#232833] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF6B47]"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF6B47] text-[#1a0d06] font-bold rounded-lg py-3 text-sm mt-2 disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}