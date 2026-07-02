import type { NavOperations, ShortcutOptions } from '@slidev/types'
import { defineShortcutsSetup } from '@slidev/types'

// Mantém apenas navegação um a um; remove atalhos de overview ('o'),
// modo escuro, goto etc.
export default defineShortcutsSetup((nav: NavOperations, _base: ShortcutOptions[]) => {
  return [
    { key: 'right', fn: () => nav.next(), autoRepeat: true },
    { key: 'space', fn: () => nav.next(), autoRepeat: true },
    { key: 'down', fn: () => nav.next(), autoRepeat: true },
    { key: 'left', fn: () => nav.prev(), autoRepeat: true },
    { key: 'up', fn: () => nav.prev(), autoRepeat: true },
  ]
})
