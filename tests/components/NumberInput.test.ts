import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NumberInput from '@/components/form/NumberInput.vue'

describe('NumberInput', () => {
  it('renders the modelValue', () => {
    const w = mount(NumberInput, { props: { modelValue: 42 } })
    expect((w.find('input').element as HTMLInputElement).value).toBe('42')
  })

  it('emits numeric update on input', async () => {
    const w = mount(NumberInput, { props: { modelValue: 0 } })
    await w.find('input').setValue('150')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([150])
  })

  it('emits null when cleared and nullable=true', async () => {
    const w = mount(NumberInput, { props: { modelValue: 42, nullable: true } })
    await w.find('input').setValue('')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([null])
  })

  it('omits null when not nullable (clears to 0)', async () => {
    const w = mount(NumberInput, { props: { modelValue: 42 } })
    await w.find('input').setValue('')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([0])
  })
})
