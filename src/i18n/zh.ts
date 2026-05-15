import type { Messages } from './en'

export const zh: Messages = {
  app: {
    subtitle: '可视化配置编辑器',
  },
  topbar: {
    presets: '预设',
    import: '导入',
    export: '导出',
    copy: '复制',
    share: '分享',
  },
  tabs: {
    layout: '布局',
    elements: '元素',
    git: 'Git',
    display: '显示',
    thresholds: '阈值',
    colors: '配色',
    rawJson: '原始 JSON',
  },
  banner: {
    title: '配置警告',
    unknownFields: '导出时保留的未知字段:',
  },
  dialog: {
    cancel: '取消',
    continue: '继续',
    loadPreset: '加载预设',
    replaceWarning: '这将替换你当前的配置。',
  },
  import: {
    title: '导入 config.json',
    hint: '粘贴 JSON、拖入文件,或者选取一个文件。已有配置会被覆盖。',
    apply: '应用',
  },
  toast: {
    linkCopied: '链接已复制',
    downloaded: '已下载',
    jsonCopied: '已复制到剪贴板',
    copyFailed: '复制失败 — 请查看控制台',
  },
}
