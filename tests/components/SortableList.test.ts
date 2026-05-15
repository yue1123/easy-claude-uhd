import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SortableList from '@/components/form/SortableList.vue'

describe('SortableList', () => {
  it('renders each item', () => {
    const w = mount(SortableList, { props: { modelValue: ['a', 'b', 'c'] } })
    const texts = w.findAll('.sortable-item').map((n) => n.text())
    expect(texts).toHaveLength(3)
    expect(texts.some((t) => t.includes('a'))).toBe(true)
  })

  it('emits reordered list on move-up button', async () => {
    const w = mount(SortableList, { props: { modelValue: ['a', 'b', 'c'] } })
    const items = w.findAll('.sortable-item')
    await items[1].find('.move-up').trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([['b', 'a', 'c']])
  })

  it('move-down on last item is a no-op', async () => {
    const w = mount(SortableList, { props: { modelValue: ['a', 'b'] } })
    const items = w.findAll('.sortable-item')
    await items[1].find('.move-down').trigger('click')
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })
})
