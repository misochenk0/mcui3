import { App, shallowReactive } from 'vue'
import { setStoredAppContext } from './storedAppContext'
import { IDSOptions } from './types'
import { useHelper } from '@/composables'
import { Themes } from '@/enums'
import { ThemesColors, UiThemes } from '@/types'
import defaultAvatar from './assets/img/no_user.png'
const helpers = useHelper()

export * from './types'
export * from './enums'
export * from './components'
export * from './composables'
export * from './consts'
export * from './utils'
export * from './assets/tokens/json'

export default {
  install(app: App, options: IDSOptions = {}) {
    const defaultOptions: IDSOptions = {
      drawerComponents: {},
      modalComponents: {},
      toasts: {},
      defaultAvatar,
      colors: ThemesColors,
      themes: UiThemes,
      theme: Themes.Light,
      meta: {
        router: null,
        isServer: false,
      },
    }

    const dsOptions = shallowReactive({
      ...defaultOptions,
      ...options,
      colors: options.colors ? helpers.mergeReactiveDefaults(defaultOptions.colors!, options.colors) : defaultOptions.colors,
      themes: options.themes ? helpers.mergeReactiveDefaults(defaultOptions.themes!, options.themes) : defaultOptions.themes,
      meta: options.meta ? helpers.mergeReactiveDefaults(defaultOptions.meta!, options.meta) : defaultOptions.meta,
    })

    app.config.globalProperties.$dsOptions = dsOptions
    app.provide('dsOptions', dsOptions)
    setStoredAppContext((app as App & { _context?: unknown })._context ?? null)
  }
}
