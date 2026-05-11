import { ShiftForm } from '@/components/shifts/shift-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function NewShiftPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link href="/shifts" className="w-8 h-8 glass rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors">
          <ChevronLeft size={16} />
        </Link>
        <h1 className="text-xl font-bold">Новая смена</h1>
      </div>
      <div className="glass-heavy rounded-3xl overflow-hidden">
        <ShiftForm />
      </div>
    </div>
  )
}
