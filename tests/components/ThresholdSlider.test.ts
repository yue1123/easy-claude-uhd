import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ThresholdSlider from '@/components/form/ThresholdSlider.vue'

describe('ThresholdSlider', () => {
  it('renders both slider and number input with the modelValue', () => {
    const w = mount(ThresholdSlider, { props: { modelValue: 70 } })
    const inputs = w.findAll('input')
    expect((inputs[0].element as HTMLInputElement).value).toBe('70')
    expect((inputs[1].element as HTMLInputElement).value).toBe('70')
  })

  it('emits update when slider changes', async () => {
    const w = mount(ThresholdSlider, { props: { modelValue: 70 } })
    await w.findAll('input')[0].setValue('85')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([85])
  })

  it('emits update when number input changes', async () => {
    const w = mount(ThresholdSlider, { props: { modelValue: 70 } })
    await w.findAll('input')[1].setValue('30')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([30])
  })
})
