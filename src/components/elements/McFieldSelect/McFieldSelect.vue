<script setup lang="ts">
import {
  computed,
  type PropType,
  ref,
  useSlots,
  watch,
  nextTick,
  onBeforeUnmount,
  defineAsyncComponent,
  inject
} from 'vue'
import { default as MultiSelect } from 'vue-multiselect'
import type { ISelectGroupOptions, ISelectOption, ISelectOptions } from '@/types/ISelect'
import { type DirectionsUnion } from '@/types/IDirections'
import { Directions } from '@/enums/ui/Directions'
import { type ColorTypes } from '@/types/styles/Colors'
import { useFieldErrors } from '@/composables/useFieldErrors'
import type { IconsListUnion } from '@/types/styles/Icons'
import { SelectGroupKeys, SelectListDirections } from '@/enums/Select'
import type { SelectListDirectionsUnion } from '@/types/ISelect'
import { PreviewSizes } from '@/enums/Preview'
import { TitleVariations } from '@/enums/Title'
import { TooltipPositions } from '@/enums/Tooltip'
import { Weights } from '@/enums/ui/Weights'
import { ChipSize } from '@/enums/Chip'
import { useTheme } from '@/composables/useTheme'
import { useThrottleFn } from '@vueuse/core'
import McTitle from '@/components/elements/McTitle/McTitle.vue'
import McSvgIcon from '@/components/elements/McSvgIcon/McSvgIcon.vue'
import { ChipVariationUnion } from '@/types/IChip'
import { IDSOptions } from '@/types/IDSOptions'
const McAvatar = defineAsyncComponent(() => import('@/components/elements/McAvatar/McAvatar.vue'))
const McTooltip = defineAsyncComponent(() => import('@/components/elements/McTooltip/McTooltip.vue'))
const McPreview = defineAsyncComponent(() => import('@/components/patterns/McPreview/McPreview.vue'))
const McChip = defineAsyncComponent(() => import('@/components/elements/McChip/McChip.vue'))

const emit = defineEmits<{
  (e: 'original-input', value: ISelectOptions[]): void
  (e: 'tag', value: string): void
  (e: 'search-change', value: string): void
  (e: 'update:modelValue', value: string[] | number[] | string | number | null): void
  (e: 'handle-open'): void
  (e: 'handle-close'): void
}>()
const slots = useSlots()
const dsOptions = inject<IDSOptions>('dsOptions', {})
const props = defineProps({
  /**
   *  Значение
   */
  modelValue: {
    type: [Array, String, Number] as PropType<string[] | number[] | string | number | null>
  },
  /**
   *  Заголовок поля:
   *
   */
  title: {
    type: String as PropType<string>,
    default: null
  },

  /**
   *  Вспомогательный текст под инпутом:
   *
   */
  helpText: {
    type: String as PropType<string>,
    default: null
  },
  /**
   *  Массив элементов
   *  выпадающего списка
   *  [
   *      {
   *          name: String,
   *          value: String | Number,
   *          text: String - доступен, если optionWithPreview=true
   *          icon: String - доступен, если optionWithPreview=true
   *      }
   *  ]
   */
  options: {
    type: Array as PropType<ISelectOptions | ISelectGroupOptions>,
    default: () => [] as ISelectOptions
  },
  /**
   *  Выполняется ли поиск из списка
   *  при вводе в инпут
   */
  searchable: {
    type: Boolean as PropType<boolean>,
    default: true
  },
  /**
   *  Множественный выбор
   */
  multiple: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  /**
   *  Скрывать из списка
   *  выбранные элементы
   */
  hideSelected: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  /**
   *  Допустимо ли
   *  пустое значение
   */
  allowEmpty: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  /**
   *  Отключенное состояние
   */
  disabled: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  /**
   *  Ссылка на аватар/картинку
   *  в начале label
   */
  avatar: {
    type: String as PropType<string>,
    default: null
  },
  /**
   *  Имя иконки
   *  в начале label
   */
  icon: {
    type: String as () => IconsListUnion,
    default: null
  },
  /**
   *  Цвет фона
   */
  backgroundColor: {
    type: String as () => ColorTypes,
    default: null
  },
  /**
   *  placeholder
   */
  placeholder: {
    type: String as PropType<string>,
    default: ''
  },
  /**
   * Направление открытия списка:
   * `top, bottom, auto`
   */
  openDirection: {
    type: String as () => SelectListDirectionsUnion,
    default: 'auto'
  },
  /**
   * Селект в режиме тэгирования, когда можно вводить свои значения и добавлять их в опции
   * */
  taggable: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  /**
   *  Помечать в списке выбранные
   *  элементы
   */
  showLabels: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  /**
   * Поиск по опциям
   * */
  internalSearch: {
    type: Boolean as PropType<boolean>,
    default: true
  },
  /**
   *  Ошибки
   */
  errors: {
    type: Array as PropType<string[]>,
    default: null
  },
  /**
   *  Name
   */
  name: {
    type: String as PropType<string>,
    required: true
  },
  /**
   *  Если нужен тултип
   *  над элементами списка
   */
  optionsTooltip: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  /**
   * При группировке опций, дает возвожность выбрать сразу группу
   * */
  groupSelect: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  required: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  /**
   *  Если айтемам в селекте нужны превью с иконками и описанием
   */
  optionWithPreview: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  tabindex: {
    type: [String, Number],
    default: null
  },
  /**
   * Если нужно ограничить максимальную высоту блока с выбранными элементами
   */
  maxHeight: {
    type: String as PropType<string>,
    default: null
  },
  /**
   * Рендерить ли выпадающий список абсолютно, что бы помещался в ограниченном пространстве
   * */
  renderAbsoluteList: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  /**
   * Для какого языка селект
   */
  locale: {
    type: String as PropType<string>,
    default: null
  },
  /**
   * Текст для пустого селекта, когда неичего не найдено
   */
  noResultsText: {
    type: String as PropType<string>,
    default: null
  },
  /**
   * Текст для пустого списка опций
   */
  emptyList: {
    type: String as PropType<string>,
    default: null
  },
  /**
   * Показывать ли состояние лоадинга
   */
  loading: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  dir: {
    type: String as () => DirectionsUnion,
    default: Directions.Ltr
  },
  /**
   * На какое после смотреть что бы считать его заголовком строки
   * */
  titleField: {
    type: String as PropType<string>,
    default: 'name'
  },
  /**
   * На какое после смотреть что бы считать его значением строки
   * */
  valueField: {
    type: String as PropType<string>,
    default: 'value'
  }
})
const theme = useTheme('select')
const fieldErrors = useFieldErrors(props.errors)
const searchValue = ref<string | null>(null)
const field_select_ref = ref<InstanceType<typeof MultiSelect> | null>(null)
const field_select_wrapper_ref = ref<InstanceType<typeof HTMLDivElement> | null>(null)
const local_options = ref<ISelectOptions>([])
const closest_scroll_element = ref<HTMLElement | null>(null)
const scroll_resize_observer = ref<ResizeObserver>()
const list_teleported_to_body = ref(false)
const list_original_parent = ref<HTMLElement | null>(null)
const list_original_next_sibling = ref<ChildNode | null>(null)
const list_portal_wrapper = ref<HTMLElement | null>(null)

const isGroupedOptions = computed((): boolean => {
  return props.options.some(
    (o) =>
      Object.prototype.hasOwnProperty.call(o, SelectGroupKeys.Label) &&
      Object.prototype.hasOwnProperty.call(o, SelectGroupKeys.Values) &&
      //@ts-ignore
      Array.isArray(o[SelectGroupKeys.Values])
  )
})
const hasTitle = computed(() => {
  return !!props.title
})
const hasPrepend = computed(() => {
  return props.avatar || props.icon
})
const isValueMustBeArray = computed(() => {
  return props.multiple
})
const hasValue = computed((): boolean => {
  // @ts-ignore
  return isValueMustBeArray.value ? !!(props.modelValue || [])?.length : !!props.modelValue
})
const computedNoResultsText = computed((): string => {
  return props.noResultsText ?? dsOptions.componentTranslations?.select?.noResultsText
})
const computedEmptyListText = computed((): string => {
  return props.emptyList ?? dsOptions.componentTranslations?.select?.emptyList
})

const tagBind = computed(() => {
  return {
    label: props.titleField,
    trackBy: props.valueField,
    loading: props.loading,
    options: computedOptions.value,
    searchable: props.searchable,
    showLabels: props.showLabels,
    multiple: props.multiple,
    hideSelected: props.hideSelected,
    allowEmpty: props.allowEmpty,
    openDirection: props.openDirection,
    id: props.name,
    taggable: props.taggable,
    tagPlaceholder: '',
    placeholder: props.placeholder,
    disabled: props.disabled,
    internalSearch: props.internalSearch,
    tabindex: +props.tabindex,
    groupSelect: props.groupSelect && props.multiple,
    appendToBody: props.renderAbsoluteList,
    ...(isGroupedOptions.value ? { groupLabel: SelectGroupKeys.Label } : {}),
    ...(isGroupedOptions.value ? { groupValues: SelectGroupKeys.Values } : {})
  }
})

const computedOptions = computed((): ISelectOptions => {
  if (isGroupedOptions.value) return props.options as ISelectOptions

  const unique = new Set()
  const combined = [...props.options, ...local_options.value] as ISelectOptions
  return combined.filter((option) => {
    const key = option[props.valueField]
    if (unique.has(String(key))) return false
    unique.add(String(key))
    return true
  }) as ISelectOptions
})

const flatOptions = computed(() => {
  return isGroupedOptions.value
    ? computedOptions.value.map((co) => co[SelectGroupKeys.Values]).flat()
    : computedOptions.value
})

const flatOptionsMap = computed(() => {
  return new Map(flatOptions.value.map((fo) => [String(fo[props.valueField]), fo]))
})

const rtl = computed((): boolean => {
  return props.dir === Directions.Rtl
})

const classes = computed((): { [key: string]: boolean } => {
  return {
    'mc-field-select': true,
    'mc-field-select--error': !!fieldErrors.errorText.value,
    'mc-field-select--disabled': props.disabled,
    [`mc-field-select--bg-${props.backgroundColor}`]: !!props.backgroundColor,
    'mc-field-select--is-empty-options-list': isEmptyOptionsList.value || props.loading,
    'mc-field-select--with-preview': props.optionWithPreview && hasValue.value,
    'mc-field-select--max-height': !!props.maxHeight,
    'mc-field-select--rtl': rtl.value,
    'mc-field-select--hide-arrow': !!slots['arrow']
  }
})
const computedTitle = computed(() => {
  return `${props.title}${props.required ? ' *' : ''}`
})
const styles = computed((): { [key: string]: string } => {
  const darkColors = ['gray', 'dark-gray', 'black']
  const lightColors = ['white']
  let placeHolderColor: ColorTypes = 'gray'
  let borderColor: ColorTypes = props.backgroundColor
  let backgroundColor: ColorTypes = props.backgroundColor
  let labelColor: ColorTypes = 'black'
  if (!props.backgroundColor || lightColors.includes(props.backgroundColor)) {
    borderColor = theme.component.color as ColorTypes
  }
  if (darkColors.includes(props.backgroundColor)) {
    labelColor = 'white'
    placeHolderColor = 'white'
    borderColor = 'black'
  }
  if (props.disabled && !props.backgroundColor) {
    backgroundColor = 'hover-gray'
  }
  return {
    '--mc-field-select-max-height': props.maxHeight,
    '--mc-field-select-bg-color': backgroundColor && theme.colors[backgroundColor],
    '--mc-field-select-color': theme.colors[theme.component.color as ColorTypes],
    '--mc-field-select-selected-color': theme.colors[theme.component.selected as ColorTypes],
    '--mc-field-select-border-color': borderColor && theme.colors[borderColor],
    '--mc-field-select-label-color': theme.colors[labelColor],
    '--mc-field-select-placeholder-color': theme.colors[placeHolderColor]
  }
})

const isEmptyOptionsList = computed((): boolean => {
  if ((props.hideSelected && !searchValue.value) || !props.options.length) {
    if (props.multiple) {
      if (isGroupedOptions.value) return false
      return Array.isArray(props.modelValue) && props.options.length === props.modelValue.length
    } else {
      return !!props.modelValue && computedOptions.value?.length === 1 && !searchValue.value
    }
  } else if (props.options.length === 0) return !props.options.length
  return false
})

const computedModelValue = computed({
  get() {
    let preparedValue: any = isValueMustBeArray.value ? props.modelValue || [] : [props.modelValue].filter(Boolean)
    preparedValue = preparedValue.map((pv: string): ISelectOption => {
      const item = flatOptionsMap.value.get(String(pv))

      return {
        [props.titleField]: item?.[props.titleField] || pv,
        [props.valueField]: item?.[props.valueField] || pv,
        text: item?.text,
        icon: item?.icon,
        avatar: item?.avatar,
        is_closable: (item && (!Object.prototype.hasOwnProperty.call(item, 'is_closable') || item.is_closable)) || !item
      }
    })

    const [first] = preparedValue
    return isValueMustBeArray.value ? preparedValue : first
  },
  set(value) {
    let preparedValue = isValueMustBeArray.value ? (Array.isArray(value) ? value : []) : [value]
    preparedValue = preparedValue.filter(Boolean).map((v) => v[props.valueField])

    const [first] = preparedValue
    emitOriginalInput(value)
    emitInput(isValueMustBeArray.value ? preparedValue : first)
  }
})

const actualizeSavedOptions = (payload: ISelectOption[] = props.options as ISelectOption[]): void => {
  //Фильтруем локальные опции и оставляем только те, значения которых выбраны в селекте
  const unique = new Set()

  const new_options = isGroupedOptions.value
    ? (payload as ISelectGroupOptions).flatMap((g) => g[SelectGroupKeys.Values] ?? [])
    : (payload as ISelectOption[])

  const combined = [...local_options.value, ...new_options]

  local_options.value = combined.filter((option: ISelectOption) => {
    const key = option[props.valueField]
    if (unique.has(String(key))) return false

    const has_selected =
      props.modelValue?.constructor === Array
        ? props.modelValue.map((v) => String(v)).includes(String(option[props.valueField]))
        : String(option[props.valueField]) === String(props.modelValue)

    if (has_selected) unique.add(String(key))
    return has_selected
  })
}

const findClosestScrollElement = (element: HTMLElement): HTMLElement => {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return document.documentElement
  }
  if (element === document.documentElement) {
    return document.documentElement
  }
  const { overflow, overflowY } = getComputedStyle(element)
  const scrollableVariants = ['auto', 'scroll']
  if (scrollableVariants.some((v) => [overflow, overflowY].includes(v))) {
    return element
  }
  const parent = element.parentNode
  if (!parent || parent.nodeType !== Node.ELEMENT_NODE) {
    return document.documentElement
  }
  return findClosestScrollElement(parent as HTMLElement)
}

/**
 * Находит предка, который является containing block для position: fixed
 * (contain: layout/paint, transform, filter, perspective и т.д.).
 * Нужно для корректного позиционирования списка в модалках с contain: layout paint.
 */
const getFixedContainingBlock = (element: HTMLElement): DOMRect | null => {
  if (!element) return null
  let el: HTMLElement | null = element.parentElement
  while (el && el !== document.body) {
    const style = getComputedStyle(el)
    const contain = style.contain
    if (contain && (contain.includes('layout') || contain.includes('paint'))) {
      return el.getBoundingClientRect()
    }
    if (style.transform !== 'none') return el.getBoundingClientRect()
    if (style.filter !== 'none') return el.getBoundingClientRect()
    if (style.perspective !== 'none') return el.getBoundingClientRect()
    if (style.willChange === 'transform') return el.getBoundingClientRect()
    el = el.parentElement
  }
  return null
}

// Добавляем к позиции отступ visualViewport?.offsetTop, который добавляет iOs при открытии вирутальной клавиатуры
const iosViewportIndent = computed(() => {
  return ['iPhone', 'iPad'].some((device) => navigator?.platform?.includes(device))
    ? window.visualViewport?.offsetTop || 0
    : 0
})

const repositionDropDown = useThrottleFn(() => {
  if (!closest_scroll_element.value || !field_select_ref.value) return

  const {
    top = 0,
    bottom = 0,
    height = 0,
    width = 0,
    left = 0
  } = field_select_wrapper_ref.value?.getBoundingClientRect() || {}
  const scrollElementRect = closest_scroll_element.value.getBoundingClientRect()
  const ref = field_select_ref.value
  if (!ref) return

  // Высчитываем реальную позицию селекта относительно первого скроллящегося родителя
  const actualTop = top - scrollElementRect.top
  const actualBottom = bottom - scrollElementRect.bottom
  // if field hides under scrolled element borders -> blur select to prevent overlap
  if (actualTop >= -height && actualBottom < height) {
    const list = ref.$refs.list as HTMLElement
    const cbRect = getFixedContainingBlock(list)
    const offsetX = cbRect ? cbRect.left : 0
    const offsetY = cbRect ? cbRect.top : 0

    list.style.width = `${width}px`
    list.style.position = 'fixed'
    list.style.left = `${left - offsetX}px`
    //@ts-ignore
    const title_height = field_select_wrapper_ref.value?.querySelector('.mc-field-select__header')?.offsetHeight
    const title_margin = 8
    let openDir = props.openDirection
    //@ts-ignore
    if (openDir === SelectListDirections.Auto) openDir = ref?.isAbove ? 'top' : 'bottom'
    switch (openDir) {
      //@ts-ignore
      case 'top': {
        const viewportTop =
          top +
          (hasTitle.value ? title_height + title_margin : 0) +
          iosViewportIndent.value -
          list.getBoundingClientRect().height -
          8
        list.style.top = `${viewportTop - offsetY}px`
        list.style.bottom = 'auto'
        break
      }
      //@ts-ignore
      case 'bottom':
        list.style.bottom = 'auto'
        list.style.top = `${top + iosViewportIndent.value + height - offsetY}px`
        break
    }
    // Для андроидов не прячем селект при оверлапе, так как там работает все криво
    //  при открытии из нижней позиции клавиатура его перекрывает и он сразу сам закрывается
  } else if (!/Android/i.test(navigator.userAgent)) {
    // прячем селект, если его не видно юзеру
    return ref.deactivate()
  }
}, 16)

const initScroll = () => {
  // looking for closest scroll elemen to track select list position dynamically
  removeScrollListener()
  //@ts-ignore
  closest_scroll_element.value = findClosestScrollElement(field_select_ref.value.$el) || document.documentElement
  closest_scroll_element.value.addEventListener('scroll', repositionDropDown)
  scroll_resize_observer.value?.disconnect()
  scroll_resize_observer.value = new ResizeObserver(repositionDropDown)
  scroll_resize_observer.value.observe(closest_scroll_element.value)
}

const handleTag = (value: string): void => {
  const preparedValue = { [props.titleField]: value, [props.valueField]: value }
  local_options.value.push(preparedValue)

  computedModelValue.value = isValueMustBeArray.value ? [...computedModelValue.value, preparedValue] : preparedValue
  /**
   * Событие по добавлению
   * тега в опции (по Enter)
   */
  emit('tag', value)
}

const handleSearchChange = (value: string): void => {
  searchValue.value = value
  /**
   * Событие по вводу данных в инпут
   */
  emit('search-change', value)
}

const emitInput = (value: number[] | string[] | number | string): void => {
  fieldErrors.toggleErrorVisible()
  /**
   * Событие инпута (выбранное значение)
   */
  emit('update:modelValue', value)
}
const emitOriginalInput = (value: ISelectOptions[]): void => {
  /**
   * Истинное значение инпута
   */
  emit('original-input', value)
}

const moveListToBody = (): void => {
  const ref = field_select_ref.value
  // @ts-ignore
  if (!ref?.$refs?.list) return
  // @ts-ignore
  const list = ref.$refs.list as HTMLElement
  if (list.parentNode?.nodeName === 'BODY' || list_portal_wrapper.value?.contains(list)) return

  list_original_parent.value = list.parentElement
  list_original_next_sibling.value = list.nextSibling

  const wrapper = document.createElement('div')
  wrapper.className = 'mc-field-select mc-field-select--list-portal'
  const multiselectWrap = document.createElement('div')
  multiselectWrap.className = 'multiselect'
  multiselectWrap.appendChild(list)
  wrapper.appendChild(multiselectWrap)
  document.body.appendChild(wrapper)
  list_portal_wrapper.value = wrapper
  list_teleported_to_body.value = true
  nextTick(repositionDropDown)
}

const moveListBack = (): void => {
  if (!list_teleported_to_body.value || !list_original_parent.value) return
  const ref = field_select_ref.value
  // @ts-ignore
  const list = ref?.$refs?.list as HTMLElement | undefined
  const wrapper = list_portal_wrapper.value
  if (list && wrapper?.contains(list)) {
    list_original_parent.value.insertBefore(list, list_original_next_sibling.value)
  }
  wrapper?.remove()
  list_teleported_to_body.value = false
  list_original_parent.value = null
  list_original_next_sibling.value = null
  list_portal_wrapper.value = null
}

const handleOpen = (): void => {
  emit('handle-open')
  if (props.renderAbsoluteList) {
    initScroll()
    nextTick(moveListToBody)
  }
}

const removeScrollListener = () => {
  scroll_resize_observer.value?.disconnect()

  if (!closest_scroll_element.value) return
  closest_scroll_element.value.removeEventListener('scroll', repositionDropDown)
  closest_scroll_element.value = null
}

const handleClose = (): void => {
  if (list_teleported_to_body.value) moveListBack()
  removeScrollListener()
  emit('handle-close')
}

onBeforeUnmount(() => {
  if (list_teleported_to_body.value) moveListBack()
  removeScrollListener()
})

watch(
  () => props.options,
  (val: ISelectOption[]) => {
    actualizeSavedOptions(val)
  },
  { immediate: true }
)

watch(
  () => props.modelValue,
  () => {
    actualizeSavedOptions()
  },
  { immediate: true, deep: true }
)

watch(
  () => props.errors,
  (value: string[]): void => {
    fieldErrors.setError(value)
  }
)
</script>

<template>
  <div ref="field_select_wrapper_ref" :dir="dir" :class="classes" :style="styles">
    <div class="mc-field-select__header">
      <!-- @slot Слот заголовка -->
      <slot name="header">
        <mc-title v-if="hasTitle" max-width="100%" :weight="Weights.Medium">
          {{ computedTitle }}
        </mc-title>
      </slot>
    </div>
    <div class="mc-field-select__main">
      <multi-select
        ref="field_select_ref"
        v-model="computedModelValue"
        v-bind="tagBind"
        @tag="handleTag"
        @search-change="handleSearchChange"
        @open="handleOpen"
        @close="handleClose"
      >
        <template #singleLabel="{ option }">
          <mc-preview v-if="props.optionWithPreview" class="option__desc" :size="PreviewSizes.L">
            <template v-if="!!option.icon || !!option.avatar" #left>
              <mc-svg-icon v-if="option.icon" :name="option.icon" :color="option.iconColor || 'main'" size="400" />
              <mc-avatar v-else :src="option.avatar" size="400" rounded />
            </template>
            <template #top>
              <mc-title :weight="Weights.SemiBold" :html-data="option[props.titleField]" />
            </template>
            <!-- Слот для замены стандартной стрелки при выведенном превью -->
            <template #right>
              <!-- @slot -->
              <slot name="arrow" />
            </template>
            <template v-if="!!option.text" #bottom>
              <mc-title color="gray" ellipsis>{{ option.text }}</mc-title>
            </template>
          </mc-preview>
          <div v-else class="mc-field-select__single-label">
            <div v-if="hasPrepend" class="mc-field-select__prepend">
              <mc-avatar v-if="avatar" :src="avatar" />
              <mc-svg-icon v-else :color="option.iconColor || 'main'" :name="props.icon" />
            </div>
            <div
              class="mc-field-select__label-text"
              :class="hasPrepend ? 'mc-field-select__label-text--indent-left' : ''"
            >
              {{ option ? option[props.titleField] : placeholder }}
            </div>
          </div>
        </template>
        <template v-if="optionsTooltip || props.optionWithPreview" #option="{ option }">
          <mc-title v-if="option.$isLabel" color="gray">{{ option.$groupLabel }}</mc-title>
          <mc-preview v-if="props.optionWithPreview" class="option__desc" :size="PreviewSizes.L">
            <template v-if="!!option.icon || !!option.avatar" #left>
              <mc-svg-icon v-if="option.icon" :name="option.icon" :color="option.iconColor || 'main'" size="400" />
              <mc-avatar v-else :src="option.avatar" size="400" rounded />
            </template>
            <template #top>
              <mc-title :weight="Weights.SemiBold" :html-data="option[props.titleField]" />
            </template>
            <template v-if="!!option.text" #bottom>
              <mc-title color="gray">{{ option.text }}</mc-title>
            </template>
          </mc-preview>
          <mc-tooltip
            v-else
            class="mc-field-select__options-tooltip-target"
            max-width="m"
            color="black"
            :placement="TooltipPositions.Top"
            :content="option[props.titleField]"
          >
            <span>{{ option[props.titleField] }}</span>
          </mc-tooltip>
        </template>
        <template #noResult>
          <!-- @slot Слот для текста, если ничего не найдено -->
          <slot name="noResult">
            <span>{{ computedNoResultsText }}</span>
          </slot>
        </template>
        <template #noOptions>
          <!-- @slot Слот для текста, если список опций пуст -->
          <slot name="noOptions">
            <span>{{ computedEmptyListText }}</span>
          </slot>
        </template>

        <!-- multiselect selected tag -->
        <template #tag="multiselectTag">
          <mc-chip
            :size="ChipSize.Xs"
            class="multiselect__tag"
            :variation="`${theme.component.selected}-invert` as ChipVariationUnion"
            text-color="black"
            :closable="!multiselectTag?.option?.hasOwnProperty('is_closable') || multiselectTag?.option?.is_closable"
            @close="multiselectTag.remove(multiselectTag.option)"
          >
            {{ multiselectTag.option[props.titleField] }}
            <template #button>
              <mc-svg-icon size="250" name="cancel" />
            </template>
          </mc-chip>
        </template>
      </multi-select>
    </div>
    <div v-if="fieldErrors.errorText.value || props.helpText || $slots.footer" class="mc-field-select__footer">
      <mc-title
        v-if="fieldErrors.errorText.value"
        tag-name="div"
        color="red"
        :variation="TitleVariations.Overline"
        max-width="100%"
        :html-data="fieldErrors.errorText.value"
      />
      <br v-if="fieldErrors.errorText.value" />
      <!-- @slot Слот доп. текста под инпутом -->
      <slot name="footer">
        <mc-title
          v-if="props.helpText"
          tag-name="div"
          :variation="TitleVariations.Overline"
          color="gray"
          max-width="100%"
        >
          {{ props.helpText }}
        </mc-title>
      </slot>
    </div>
  </div>
</template>

<style lang="scss" src="./index.scss"></style>
