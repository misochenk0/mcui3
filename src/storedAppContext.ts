import type { AppContext } from 'vue'

let storedAppContext: AppContext | null = null

export function setStoredAppContext(context: AppContext | null): void {
  storedAppContext = context
}

export function getStoredAppContext(): AppContext | null {
  return storedAppContext
}
