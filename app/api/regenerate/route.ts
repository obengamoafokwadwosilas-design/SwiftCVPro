export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildRegenerationPrompt } from '@/lib/prompts'
import { GeneratedCV } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const {
      section,
      currentContent,
      userInstruction,
      cvContext
    }: {
      section: string
      currentContent: string | string[]
      userInstruction?: string
      cvContext: Pick<GeneratedCV, 'fullName' | 'jobTitle'> & { cvType: string }
    } = await req.json()

    if (!section || !currentContent) {
      return NextResponse.json({ error: 'Missing section or content' }, { status: 400 })
    }

    // Normalise content to string for prompt
    const contentStr = Array.isArray(currentContent)
      ? currentContent.join('\n')
      : currentContent

    const prompt = buildRegenerationPrompt(
      section,
      contentStr,
      userInstruction || '',
      cvContext
    )

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    })

    const rawText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('')

    const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    let result: any
    try {
      result = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse regenerated content. Please try again.' }, { status: 500 })
    }

    // Return the right field based on section
    if (section === 'summary') return NextResponse.json({ success: true, content: result.summary })
    if (section === 'skills') return NextResponse.json({ success: true, content: result.skills })
    if (section === 'additionalInfo') return NextResponse.json({ success: true, content: result.additionalInfo })
    if (section.startsWith('experience_')) return NextResponse.json({ success: true, content: result.bullets })
    return NextResponse.json({ success: true, content: result.content })

  } catch (error) {
    console.error('Regenerate error:', error)
    return NextResponse.json({ error: 'Regeneration failed. Please try again.' }, { status: 500 })
  }
}
