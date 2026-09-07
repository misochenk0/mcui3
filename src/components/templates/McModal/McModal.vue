<script setup lang="ts">
import { computed, defineAsyncComponent, type PropType, reactive, ref, useSlots, watch } from 'vue'
import { LineHeights, type LineHeightTypes } from '@/types/styles/LineHeights'
import { Sizes, type SizeTypes } from '@/types/styles/Sizes'
import { Spaces, type SpaceTypes } from '@/types/styles/Spaces'
import { HorizontalAlignment } from '@/enums/ui/Alignment'
import { TransitionPresets, useEventListener, useTransition } from '@vueuse/core'
import { ModalVariation } from '@/enums/Modal'
const McSvgIcon = defineAsyncComponent(() => import('@/components/elements/McSvgIcon/McSvgIcon.vue'))

const slots = useSlots()

const emit = defineEmits<{
  (e: 'before-open'): void
  (e: 'before-close'): void
  (e: 'opened'): void
  (e: 'closed'): void
  (e: 'back', value: Event): void
  (e: 'update:modelValue', value: boolean): void
}>()

const props = defineProps({
  modelValue: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  name: {
    type: String as PropType<string>
  },
  /**
   * Максимальная ширина модального окна
   * */
  maxWidth: {
    type: Number as PropType<number>,
    default: 510
  },
  /**
   * Минимальная ширина модального окна
   * */
  minWidth: {
    type: Number as PropType<number>,
    default: 480
  },
  /**
   * Скорость анимации
   * */
  duration: {
    type: Number as PropType<number>,
    default: 200
  },
  /**
   * Показывать кнопку закрытия модали
   * */
  closeVisible: {
    type: Boolean as PropType<boolean>,
    default: true
  },
  showOverlay: {
    type: Boolean as PropType<boolean>,
    default: true
  },
  /**
   *  Нужно ли закрывать попап
   *  кликом вне окна
   */
  clickBackdropToClose: {
    type: Boolean as PropType<boolean>,
    default: true
  },
  /**
   *  Стрелка в хедере
   */
  arrowVisible: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  /**
   *  Кастомное модальное окно
   */
  secondaryModal: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  /**
   * Должен ли контент внутри модалки скроллится с фиксированной шапкой и футером
   * Отключать, когда внутри есть селекты
   * */
  scrollableContent: {
    type: Boolean as PropType<boolean>,
    default: true
  },
  /**
   * Показывать сепараторы у хедера и футера при скролле.
   */
  separators: {
    type: Boolean as PropType<boolean>,
    default: true
  },
  /**
   * Выравнивание заголовка в шапке,
   * если centered добавляются отступы слева и справа, чтобы текст не наезжал на кнопки
   * centered || left || right
   * */
  headerAlign: {
    type: String as PropType<HorizontalAlignment>,
    default: 'center'
  },
  /**
   * Отступ от верхнего края модального окна до контента.
   * Для "красивой" обрезки картинки при скролле в ситуациях, когда нет хедера
   */
  topPadding: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  /**
   * Вариация модалки default || info
   * info модалки имеют меньшие размеры паддингов
   * */
  variation: {
    type: String as () => ModalVariation,
    default: 'default'
  }
})

const modalTransitionState = ref<number>(0)
const modalTransition = useTransition(modalTransitionState, {
  duration: props.duration || 300,
  transition: TransitionPresets.easeOutQuart
})

const mcModalBody = ref<HTMLElement | null>(null)
const mcModalTitle = ref<HTMLElement | null>(null)
const modalInner = ref<HTMLElement | null>(null)
const resize_observer = ref<ResizeObserver | null>(null)

const data = reactive({
  scrolled_top: false,
  scrolled_bottom: false,
  small_indents: false,
  can_shorten_modal: false,
  modal_params: {} as { [key: string]: string | number },
  indent: {
    regular: '400',
    small: '150'
  } as { [key: string]: SpaceTypes },
  footer: {
    button: {
      regular: '600',
      small: '500'
    } as { [key: string]: SizeTypes }
  },
  header: {
    title: {
      line_height: {
        regular: '300',
        small: '250'
      } as { [key: string]: LineHeightTypes }
    }
  }
})

const hasTitleSlot = computed((): boolean => {
  return !!slots['title']
})

const classes = computed((): { [key: string]: boolean } => {
  return {
    'mc-modal--arrow-visible': props.arrowVisible,
    'mc-modal--scrolled-top': data.scrolled_top,
    'mc-modal--scrolled-bottom': data.scrolled_bottom,
    'mc-modal--scrollable': props.scrollableContent,
    'mc-modal--top-padding': props.topPadding,
    'mc-modal--small-indents': data.small_indents,
    [`mc-modal--variation-${props.variation}`]: !!props.variation,
    [`mc-modal--header-align-${props.headerAlign}`]: (props.closeVisible || props.arrowVisible) && !!props.headerAlign,
  }
})

const styles = computed((): { [key: string]: string | number } => {
  return {
    '--mc-modal-padding': Spaces[data.indent.regular],
    '--mc-modal-padding-small': Spaces[data.indent.small],
    '--mc-modal-header-line-height': LineHeights[data.header.title.line_height.regular],
    '--mc-modal-header-line-height-small': LineHeights[data.header.title.line_height.small],
    '--mc-modal-button-height': Sizes[data.footer.button.regular],
    '--mc-modal-button-height-small': Sizes[data.footer.button.small],
    '--mc-modal-max-width': `${props.maxWidth + 24}px`,
    '--mc-modal-min-width': `${props.minWidth - 24}px`,
    '--mc-modal-state-number': modalTransition.value,
  }
})

const resetScrollState = (): void => {
  data.scrolled_top = false
  data.scrolled_bottom = false
  data.small_indents = false
  data.can_shorten_modal = false
}

const getModalElement = (): HTMLElement | null => modalInner.value?.parentElement ?? null

const readCssLengthPx = (element: HTMLElement, varName: string): number => {
  const raw = getComputedStyle(element).getPropertyValue(varName).trim()
  if (!raw) return 0
  const value = parseFloat(raw)
  if (raw.endsWith('rem')) {
    return value * parseFloat(getComputedStyle(document.documentElement).fontSize)
  }
  return value
}

const getSizeDifferences = (): number => {
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize)
  const remToPx = (rem: string): number => parseFloat(rem) * rootFontSize

  const padding =
    +data.modal_params['--mc-modal-padding'] || remToPx(Spaces[data.indent.regular])
  const paddingSmall =
    +data.modal_params['--mc-modal-padding-small'] || remToPx(Spaces[data.indent.small])
  const headerLineHeight =
    +data.modal_params['--mc-modal-header-line-height'] ||
    remToPx(LineHeights[data.header.title.line_height.regular])
  const headerLineHeightSmall =
    +data.modal_params['--mc-modal-header-line-height-small'] ||
    remToPx(LineHeights[data.header.title.line_height.small])
  const buttonHeight =
    +data.modal_params['--mc-modal-button-height'] || remToPx(Sizes[data.footer.button.regular])
  const buttonHeightSmall =
    +data.modal_params['--mc-modal-button-height-small'] || remToPx(Sizes[data.footer.button.small])

  const indentDifferences = (padding - paddingSmall) * 3 + paddingSmall
  /**
   * Заголовок может переноситься на несколько строк, а padding-small в CSS
   * сжимает line-height каждой строки. Считаем реальное число строк тайтла,
   * а не считаем его однострочным, иначе экономия высоты недооценивается
   * и переключение mc-modal--small-indents происходит не вовремя.
   */
  const currentLineHeight = data.small_indents ? headerLineHeightSmall : headerLineHeight
  const titleLines =
    mcModalTitle.value && currentLineHeight
      ? Math.max(1, Math.round(mcModalTitle.value.scrollHeight / currentLineHeight))
      : 1
  const lineHeightDifferences = (headerLineHeight - headerLineHeightSmall) * titleLines
  const buttonDifferences = buttonHeight - buttonHeightSmall

  return indentDifferences + lineHeightDifferences + buttonDifferences
}

// Порог, с которого считаем, что скролл "реально есть" (а не суб-пиксельный шум)
const SCROLL_OFFSET_PX = 2

/**
 * Устанавливаем сепараторы, если есть скролл
 */
const calculateSeparators = (): void => {
  if (!mcModalBody.value) return

  const { scrollTop, scrollHeight, clientHeight } = mcModalBody.value
  data.scrolled_top = scrollTop > SCROLL_OFFSET_PX
  data.scrolled_bottom = scrollTop + clientHeight < scrollHeight - SCROLL_OFFSET_PX
}

const calculateSmallIndents = (): void => {
  if (!mcModalBody.value) return

  const { scrollTop } = mcModalBody.value

  if (!data.small_indents) {
    data.small_indents = scrollTop > SCROLL_OFFSET_PX && data.can_shorten_modal
  } else {
    data.small_indents = scrollTop > 0
  }
}

const scrollHandler = (): void => {
  calculateIndents()
  calculateSeparators()
  calculateSmallIndents()
}

const onBodyScroll = (): void => {
  if (props.separators) scrollHandler()
}

useEventListener(mcModalBody, 'scroll', onBodyScroll, { passive: true })

const detachResizeObserver = (): void => {
  resize_observer.value?.disconnect()
  resize_observer.value = null
}

const attachResizeObserver = (): void => {
  if (!mcModalBody.value || !props.separators) return
  detachResizeObserver()
  resize_observer.value = new ResizeObserver(resizeHandler)
  resize_observer.value.observe(mcModalBody.value)
}

const scheduleInitScrollState = (): void => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initScrollState()
    })
  })
}

const initScrollState = (): void => {
  if (!mcModalBody.value) return

  getParams()
  mcModalBody.value.scrollTop = 0
  calculateIndents()
  calculateSeparators()
}

const handleBack = (event: Event): void => {
  emit('back', event)
}

const getParams = (): void => {
  try {
    const modalEl = getModalElement()
    if (!modalEl) return

    const vars = [
      '--mc-modal-padding',
      '--mc-modal-padding-small',
      '--mc-modal-header-line-height',
      '--mc-modal-header-line-height-small',
      '--mc-modal-button-height',
      '--mc-modal-button-height-small'
    ]

    vars.forEach((attr) => {
      const param = readCssLengthPx(modalEl, attr)
      param && (data.modal_params[attr] = param)
    })
  } catch (e) {
    console.error(e)
  }
}

const SMALL_INDENTS_SAFETY_MARGIN_PX = 24

const calculateIndents = (): void => {
  /* Сжимаем шапку/футер только если overflow больше, чем экономия от сжатия */
  if (!mcModalBody.value) return

  const { scrollTop, scrollHeight, clientHeight } = mcModalBody.value
  const sizeDifferences = getSizeDifferences()

  if (!data.small_indents || scrollTop === 0) {
    data.can_shorten_modal = scrollHeight - clientHeight - sizeDifferences > SMALL_INDENTS_SAFETY_MARGIN_PX
  }
}

const resizeHandler = (): void => {
  calculateIndents()
  calculateSeparators()
}

const closeModal = (): void => {
  /**
   * Событие перед закрытием
   * @property {Object}
   */
  emit('before-close')
  emit('closed')
  emit('update:modelValue', false)
}

const handleOverlayClick = (): void => {
  if (!props.clickBackdropToClose) return
  closeModal()
}

watch(
  () => props.modelValue,
  (open, wasOpen) => {
    if (open === wasOpen) return

    if (open) {
      modalTransitionState.value = 1
      emit('before-open')
      return
    }

    detachResizeObserver()
    resetScrollState()
    modalTransitionState.value = 0
    closeModal()
  },
  { immediate: true }
)

watch(
  mcModalBody,
  (body, prevBody) => {
    if (!props.modelValue || !body || !props.separators) return

    attachResizeObserver()

    if (!prevBody) {
      scheduleInitScrollState()
      emit('opened')
    }
  },
  { flush: 'post' }
)
</script>

<template>
  <div v-if="props.modelValue" class="mc-modal__wrapper">
    <div v-if="props.showOverlay" class="mc-modal__overlay" @click.stop="handleOverlayClick" />
    <div class="mc-modal" :class="classes" :style="styles">
      <div ref="modalInner" class="mc-modal__inner" :class="{ 'mc-modal__inner--with-title': $slots.title }">
        <div v-if="$slots.title" class="mc-modal__header">
          <div ref="mcModalTitle" class="mc-modal__title">
            <!-- @slot Слот заголовка -->
            <slot name="title" />
          </div>
        </div>
        <div ref="mcModalBody" class="mc-modal__body">
          <!-- @slot Слот контента -->
          <slot />
        </div>
        <!-- @slot Слот футера -->
        <!-- Телепорта в футер <Teleport to="#mcModalFooter"> -->
        <div v-if="$slots.footer" class="mc-modal__control" id="mcModalFooter">
          <slot name="footer" />
        </div>
        <button v-if="arrowVisible" type="button" class="mc-modal__btn-back" @click.prevent="handleBack">
          <mc-svg-icon name="arrow_leftward" class="mc-modal__icon-back" />
        </button>
        <button v-if="closeVisible" type="button" class="mc-modal__btn-close" @click.prevent="closeModal">
          <mc-svg-icon class="mc-modal__icon-close" width="24" height="24" name="close" />
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./index.scss"></style>
