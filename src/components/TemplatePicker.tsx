'use client'

import { TemplateId } from '@/types'

const templates: {
  id: TemplateId
  name: string
  desc: string
}[] = [
  { id: 'classic', name: 'Classic ATS', desc: 'Safe for all jobs' },
  { id: 'modern', name: 'Modern Sidebar', desc: 'Clean & stylish' },
  { id: 'executive', name: 'Executive', desc: 'Premium corporate' },
  { id: 'editorial', name: 'Editorial', desc: 'Magazine style' }
]

export default function TemplatePicker({
  selected,
  onSelect
}: {
  selected: TemplateId
  onSelect: (id: TemplateId) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {templates.map((t) => (
        <div
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`cursor-pointer border rounded-xl p-4 transition hover:shadow-lg ${
            selected === t.id ? 'border-black' : 'border-gray-200'
          }`}
        >
          <div className="h-40 bg-gray-200 rounded mb-3" />
          <h3 className="font-semibold">{t.name}</h3>
          <p className="text-sm text-gray-500">{t.desc}</p>
        </div>
      ))}
    </div>
  )
}
