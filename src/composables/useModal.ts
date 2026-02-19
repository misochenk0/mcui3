import { reactive, h, render, shallowRef, markRaw, inject } from 'vue'
import ModalContainer from '@/components/templates/McModal/McModalContainer.vue'
import { getStoredAppContext } from '@/storedAppContext'
import type { IModalServiceState, IModalState } from '@/types/IModal'
import { IDSOptions } from '@/types'

const closeServiceState = () => {
  modalServiceState.isOpen = false
  reactiveProps.modals = []
}

const modalServiceState = reactive<IModalServiceState>({
  isOpen: false,
  closeServiceState: closeServiceState
})

const modalComponents = shallowRef({})
const reactiveProps = reactive<{ modals: IModalState[] }>({ modals: [] })

const createModalContainer = () => {
  if (typeof window === 'undefined') return
  const modalContainerElement = document.createElement('div')
  modalContainerElement.id = 'modal-container'
  document.body.appendChild(modalContainerElement)

  const vnode = h(ModalContainer, { modalServiceState, reactiveProps })
  vnode.appContext = getStoredAppContext()
  render(vnode, modalContainerElement)
}

const ensureModalContainerExists = () => {
  if (document.getElementById('modal-container')) return
  if (getStoredAppContext()) {
    createModalContainer()
  } else {
    console.warn(
      'Mediacube UI Modal: app context not available. Ensure MediacubeUI is installed with app.use(MediacubeUI, { modalComponents: {...} }) so the modal container can be created.'
    )
  }
}

const showModal = (
  componentName: string, // Component name from modalComponents: {...}
  componentProps = {}
) => {
  //@ts-ignore
  if (!modalComponents.value[componentName]) {
    return console.warn(
      'The component is not provided in Mediacube-ui DS\n' +
        'Check and add to app.use(MediacubeUI, { modalComponents: {...} })'
    )
  }
  ensureModalContainerExists()

  const id = Date.now()
  const newModal: IModalState = {
    //@ts-ignore
    component: markRaw(modalComponents.value[componentName]),
    componentName: componentName,
    componentProps: componentProps,
    modelValue: true,
    id,
    close: () => {
      const modals = reactiveProps.modals
      const modalToClose = modals.length > 0 
        ? modals.find((d) => d.id === id) || modals[modals.length - 1]
        : null
      
      if (modalToClose) {
        modalToClose.modelValue = false
        setTimeout(() => {
          reactiveProps.modals = reactiveProps.modals.filter((d) => d.id !== modalToClose?.id)
        }, 300)
      }
    }
  }
  reactiveProps.modals.push(newModal)
  modalServiceState.isOpen = true
}

const closeModal = (componentName: string) => {
  const modals = reactiveProps.modals
  const modalToClose = modals.length > 0
    ? modals.find((d) => d.componentName === componentName) || modals[modals.length - 1]
    : null
  
  if (modalToClose) {
    modalToClose.close()
  }
}

const closeAllModals = () => {
  reactiveProps.modals.forEach((d) => {
    d.close()
  })
}

export function useModal() {
  const dsOptions = inject<IDSOptions>('dsOptions', {})
  if (dsOptions.modalComponents) {
    modalComponents.value = dsOptions.modalComponents
  }

  return { showModal, closeModal, closeAllModals }
}
