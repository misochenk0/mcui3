import { reactive, h, render, shallowRef, markRaw, inject } from 'vue'
import DrawerContainer from '@/components/templates/McDrawer/McDrawerContainer.vue'
import { getStoredAppContext } from '@/storedAppContext'
import type { IDrawerServiceState, IDrawerProps, IDrawerState } from '@/types/IDrawer'
import { IDSOptions } from '@/types'

const closeServiceState = () => {
  drawerServiceState.isOpen = false
  reactiveProps.drawers = []
}

const drawerServiceState = reactive<IDrawerServiceState>({
  isOpen: false,
  activeDrawer: null,
  closeServiceState: closeServiceState
})

const drawerComponents = shallowRef({})
const reactiveProps = reactive<{ drawers: IDrawerState[] }>({ drawers: [] })

const createDrawerContainer = () => {
  if (typeof window === 'undefined') return
  const drawerContainerElement = document.createElement('div')
  drawerContainerElement.id = 'drawer-container'
  document.body.appendChild(drawerContainerElement)

  const vnode = h(DrawerContainer, { drawerServiceState, reactiveProps })
  vnode.appContext = getStoredAppContext()
  render(vnode, drawerContainerElement)
}

const ensureDrawerContainerExists = () => {
  if (document.getElementById('drawer-container')) return
  if (getStoredAppContext()) {
    createDrawerContainer()
  } else {
    console.warn(
      'Mediacube UI Drawer: app context not available. Ensure MediacubeUI is installed with app.use(MediacubeUI, { drawerComponents: {...} }) so the drawer container can be created.'
    )
  }
}

const showDrawer = (
  componentName: string, // Component name from drawerComponents: {...}
  drawerProps: Partial<IDrawerProps> = {},
  componentProps = {}
) => {
  //@ts-ignore
  if (!drawerComponents.value[componentName]) {
    return console.warn(
      'The component is not provided in Mediacube-ui DS\n' +
        'Check and add to app.use(MediacubeUI, { drawerComponents: {...} })'
    )
  }
  ensureDrawerContainerExists()

  const id = `${componentName}-${Date.now()}`
  const newDrawer: IDrawerState = {
    //@ts-ignore
    component: markRaw(drawerComponents.value[componentName]),
    componentName: componentName,
    drawerProps: drawerProps,
    componentProps: componentProps,
    modelValue: true,
    id,
    close: () => {
      //@ts-ignore
      const drawerToClose = reactiveProps.drawers.findLast((d) => d.id === id)
      drawerToClose && (drawerToClose.modelValue = false)
      setTimeout(() => {
        reactiveProps.drawers = reactiveProps.drawers.filter((d) => d.id !== drawerToClose?.id)
        drawerServiceState.activeDrawer = reactiveProps.drawers[reactiveProps.drawers.length - 1] || null
      }, drawerProps?.duration || 300)
    }
  }
  reactiveProps.drawers.push(newDrawer)
  drawerServiceState.isOpen = true
  drawerServiceState.activeDrawer = newDrawer
}

const closeDrawer = (componentName: string) => {
  //@ts-ignore
  const drawerToClose = reactiveProps.drawers.findLast((d) => d.componentName === componentName)
  drawerToClose && drawerToClose.close()
}

const closeAllDrawers = () => {
  reactiveProps.drawers.forEach((d) => {
    d.close()
  })
}

export function useDrawer() {
  const dsOptions = inject<IDSOptions>('dsOptions', {})
  if (dsOptions.drawerComponents) {
    drawerComponents.value = dsOptions.drawerComponents
  }

  return { showDrawer, closeDrawer, closeAllDrawers, drawerServiceState }
}
