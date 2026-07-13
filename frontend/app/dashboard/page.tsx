import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  const { data: calls } = await supabase
    .from('calls')
    .select('*')
    .eq('business_id', business?.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white px-6 py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-lg bg-[#FF6B47] flex items-center justify-center font-bold text-[#1a0d06]" style={{ fontFamily: 'Georgia, serif' }}>
          {business?.name?.[0] || 'B'}
        </div>
        <div>
          <p className="font-bold text-sm">{business?.name || 'Loading...'}</p>
          <p className="text-xs text-green-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> IA active
          </p>
        </div>
      </div>

      <h2 className="text-xs font-bold tracking-widest text-gray-500 mb-3">APPELS</h2>

      {!calls || calls.length === 0 ? (
        <p className="text-gray-500 text-sm">Aucun appel pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {calls.map((call) => (
            <Link
              key={call.id}
              href={`/dashboard/calls/${call.id}`}
              className="block bg-[#12161F] border border-[#232833] rounded-xl p-4 hover:border-[#FF6B47] transition-colors"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-sm">{call.caller_name || 'Inconnu'}</span>
                <span className="text-xs text-gray-500">
                  {new Date(call.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-gray-400">{call.summary || 'Pas de résumé.'}</p>
              <p className="text-xs text-gray-600 mt-2">Statut : {call.status}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}