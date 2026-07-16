'use client'

import { TemplateId } from '@/types'

const templates: {
  id: TemplateId
  name: string
  desc: string
}[] = [
  { id: 'classic', name: 'Classic ATS', desc: 'Traditional and recruiter-safe' },
  { id: 'vertex', name: 'Modern Rail', desc: 'Bold single-column design' },
  { id: 'sovereign', name: 'Executive Gold', desc: 'Prestige corporate design' },
  { id: 'ascend', name: 'Corporate Blue', desc: 'Structured colour-bar design' },
  { id: 'harbour', name: 'Refined Teal', desc: 'Elegant editorial design' },
  { id: 'academic', name: 'Academic', desc: 'Scholarly and structured' }
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
