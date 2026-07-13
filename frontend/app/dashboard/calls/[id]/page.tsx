import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: call } = await supabase
    .from('calls')
    .select('*')
    .eq('id', id)
    .single()

  if (!call) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white px-6 py-8 max-w-2xl mx-auto">
        <p className="text-gray-400">Appel introuvable.</p>
        <Link href="/dashboard" className="text-[#FF6B47] text-sm mt-4 inline-block">
          ← Retour
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white px-6 py-8 max-w-2xl mx-auto">
      <Link href="/dashboard" className="text-gray-400 text-sm flex items-center gap-1 mb-4">
        ← Retour
      </Link>

      <div className="mb-2">
        <span className="text-xs font-bold tracking-widest text-[#FF6B47] uppercase">
          {call.booking_type || call.intent || 'Appel'}
        </span>
      </div>
      <h1 className="text-xl font-bold mb-1">{call.caller_name || 'Inconnu'}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {call.caller_phone} · {new Date(call.created_at).toLocaleString('fr-FR')}
      </p>

      <div className="bg-[#12161F] border-l-2 border-[#FF6B47] rounded-xl p-4 mb-6">
        <p className="text-xs font-bold tracking-wider text-[#FF6B47] mb-2">
          ACTION DE L&apos;IA · {Math.round((call.extraction_confidence || 0) * 100)}% CONFIANCE
        </p>
        <p className="italic text-base" style={{ fontFamily: 'Georgia, serif' }}>
          {call.summary || 'Pas de résumé.'}
        </p>
      </div>

      <p className="text-xs font-bold tracking-wider text-gray-500 mb-3">DÉTAILS EXTRAITS</p>
      <div className="space-y-2 mb-6">
        {call.party_size && (
          <div className="flex justify-between border-b border-[#232833] py-2 text-sm">
            <span className="text-gray-500">Personnes</span>
            <span className="font-semibold">{call.party_size}</span>
          </div>
        )}
        {call.preferred_time && (
          <div className="flex justify-between border-b border-[#232833] py-2 text-sm">
            <span className="text-gray-500">Horaire</span>
            <span className="font-semibold">{call.preferred_time}</span>
          </div>
        )}
        {call.urgency && (
          <div className="flex justify-between border-b border-[#232833] py-2 text-sm">
            <span className="text-gray-500">Urgence</span>
            <span className="font-semibold">{call.urgency}</span>
          </div>
        )}
        <div className="flex justify-between border-b border-[#232833] py-2 text-sm">
          <span className="text-gray-500">Statut</span>
          <span className="font-semibold">{call.status}</span>
        </div>
      </div>

      {call.transcript && (
        <>
          <p className="text-xs font-bold tracking-wider text-gray-500 mb-3">TRANSCRIPTION</p>
          <div className="bg-[#12161F] border border-[#232833] rounded-xl p-4 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {call.transcript}
          </div>
        </>
      )}
    </div>
  )
}