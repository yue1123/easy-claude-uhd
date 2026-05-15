export interface RenderSpan {
  text: string
  color?: string
  bold?: boolean
  dim?: boolean
}

export type RenderLine = RenderSpan[]
