export const en = {
  app: {
    subtitle: 'visual config editor',
  },
  topbar: {
    presets: 'presets',
    import: 'import',
    export: 'export',
    copy: 'copy',
    share: 'share',
  },
  tabs: {
    layout: 'Layout',
    elements: 'Elements',
    git: 'Git',
    display: 'Display',
    thresholds: 'Thresholds',
    colors: 'Colors',
    rawJson: 'Raw JSON',
  },
  banner: {
    title: 'Configuration warnings',
    unknownFields: 'Unknown fields preserved on export:',
  },
  dialog: {
    cancel: 'Cancel',
    continue: 'Continue',
    loadPreset: 'Load preset',
    replaceWarning: 'This will replace your current configuration.',
  },
  import: {
    title: 'Import config.json',
    hint: 'Paste JSON below, drag a file in, or pick one. Existing config will be replaced.',
    apply: 'Apply',
  },
  toast: {
    linkCopied: 'Link copied',
    downloaded: 'Downloaded',
    jsonCopied: 'Copied to clipboard',
    copyFailed: 'Copy failed — see console',
  },
}

export type Messages = typeof en
