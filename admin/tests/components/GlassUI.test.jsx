import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GlassButton, GlassCard } from '../../src/components/GlassUI'

describe('GlassUI components', () => {
  it('renders GlassButton with text', () => {
    render(<GlassButton>保存</GlassButton>)
    expect(screen.getByText('保存')).toBeTruthy()
  })

  it('renders GlassCard with title and content', () => {
    render(
      <GlassCard title="标题">
        <div>内容</div>
      </GlassCard>
    )
    expect(screen.getByText('标题')).toBeTruthy()
    expect(screen.getByText('内容')).toBeTruthy()
  })
})
