<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, type PropType, reactive, ref, useSlots, watch } from 'vue'
import { useHelper } from '@/composables'
import { Weights } from '@/enums'
import {
  type ITableColumn,
  type ITableColumnEnriched,
  type ITableData,
  type ITableSort,
  type ITableTotals,
  type ITablePlaceholders,
  type TableCardState,
  type ITableCardProps
} from '@/types/ITable'
import { TABLE } from '@/consts/table'
import {
  McInfinityLoadingTrigger,
  McTitle,
  McChip,
  McTableSort,
  McTableSkeletonLoading,
  McNoData,
  McBottomLoader,
  McOverlay,
  McFieldCheckbox
} from '@/components'
import { ICheckboxMainCheckbox, IconsListUnion } from '@/types'
import { default as noTableDataImg } from '@/assets/img/no_table_data.png'
import { useRafFn } from '@vueuse/core'

const defaultPlaceholders = {
  no_data: 'No data',
  loading: 'Loading...',
  all_loaded: 'All loaded',
  total: 'Total'
} as ITablePlaceholders

const emit = defineEmits<{
  (e: 'loading'): void
  (e: 'row-click', value: any): void
  (e: 'sort', value: ITableSort): void
  (e: 'table-card-opened', value: TableCardState): void
  (e: 'update:selected-rows', value: Array<number | string>): void
}>()

/**
 * Слоты
 *
 * #header-cell - Заголовок колонки, каждая колонка
 * #`{column.field}-header-right` - Справа от заголовка колонки, именной слот, работает по имени колонки, что бы добавлять в конкретную колонку
 * #`{column.field}-total` - Тотал колонки, именной слот, работает по имени колонки, что бы добавлять в конкретную колонку
 * #column.field - Тело ячейки таблицы. Если не использовать слот, просто будут выводиться данные по названию поля
 * #`{column.field}-right` - Справа от контента колонки, именной слот, работает по имени колонки, что бы добавлять в конкретную колонку
 * №footer-cell - тотал колонки (строка внизу таблицы), каждая колонка
 * */

const helper = useHelper()
const slots = useSlots()
const props = defineProps({
  columns: {
    type: Array as PropType<ITableColumn[]>,
    required: true,
    default: () => [] as ITableColumn[]
  },
  data: {
    type: Array as PropType<ITableData>,
    required: true,
    default: () => []
  },
  /**
   * Тоталы таблицы (отображаются в футере), обьект ключи которого = поле field из массива колонок
   * */
  totals: {
    type: Object as PropType<ITableTotals<ITableColumn>>,
    default: () => ({})
  },
  totalLoading: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  sort: {
    type: Object as PropType<ITableSort>,
    default: () => ({})
  },
  /**
   * Фиксировать ли первую колонку таблицы
   * */
  fixedFirstColumn: {
    type: Boolean as PropType<boolean>,
    default: true
  },
  /**
   * Фиксировать ли последнюю колонку таблицы
   * */
  fixedLastColumn: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  /**
   * Есть ли у таблицы еще данные, если true, при полном пролистывании таблицы вниз, будет вызываться метод @loading
   * */
  hasLoadMore: {
    type: Boolean as PropType<boolean>,
    default: true
  },
  height: {
    type: [Number, String] as PropType<number | 'auto'>,
    default: 'auto'
  },
  /**
   * Высота строки в шапке
   * */
  headerRowHeight: {
    type: Number as PropType<number>,
    default: TABLE.defaultHeaderHeight
  },
  /**
   * Высота строки в теле таблицы
   * */
  rowHeight: {
    type: Number as PropType<number>,
    default: TABLE.defaultRowHeight
  },
  /**
   * Высота строки в подвале (строка с тоталами)
   * */
  footerRowHeight: {
    type: Number as PropType<number>,
    default: TABLE.defaultFooterRowHeight
  },
  /**
   *  Отрисовка всей таблицы и полоса загрузки в каждой ячейке (скелетная загрузка)
   */
  skeletonLoading: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  /**
   * Лоадинг внизу таблицы
   * */
  bottomLoading: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  outlineBorder: {
    type: Boolean as PropType<boolean>,
    default: true
  },
  /**
   * Есть ли у таблицы чекбоксы, которыми можно выбирать строки
   * */
  withCheckboxes: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  /**
   * Сами выбранные строки - массив ID
   * */
  selectedRows: {
    type: Array as PropType<Array<number | string>>,
    default: () => []
  },
  /**
   * Оверлей с затемнение на всю таблицу
   * */
  loading: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  /**
   *  Переводы плейсхолеров и текстов
   */
  placeholders: {
    type: Object as PropType<Partial<ITablePlaceholders>>,
    default: () => ({})
  },
  noDataIcon: {
    type: String as () => IconsListUnion,
    default: null
  },
  noDataImg: {
    type: String as PropType<string>,
    default: noTableDataImg
  },
  /**
   * Любые данные что бы передать их в карточку из таблицы
   * */
  toTableCardProps: {
    type: Object as PropType<Record<any, any>>,
    default: () => ({})
  }
})

const openCardState = ref<TableCardState>({ state: false })
const mcTable = ref<null | HTMLElement>(null)
const checkedRows = ref<Array<any>>(props.selectedRows)

const activeRowId = computed(() => String(openCardState.value.id))

const hasData = computed((): boolean => {
  return !helper.isEmpty(props.data)
})
const hasTotals = computed((): boolean => {
  return !helper.isEmpty(props.totals)
})
const hasFixedColumn = computed((): boolean => {
  return props.fixedFirstColumn || props.fixedLastColumn
})
const placeholders = reactive<ITablePlaceholders>(helper.deepMerge(defaultPlaceholders, props.placeholders))

const shadows = reactive({
  firstColHasShadow: false,
  lastColHasShadow: false
})

const containerClasses = computed(() => {
  return {
    'mc-table__container': true,
    'mc-table__container--card-opened': openCardState.value.state,
    'mc-table__container--outline-border': props.outlineBorder
  }
})

const tableClasses = computed(() => {
  return {
    'mc-table': true,
    'mc-table--card-opened': openCardState.value.state
  }
})

const allDataIds = computed(() => {
  return props.data.map((item) => item.id)
})

const computedColumns = computed((): ITableColumnEnriched[] => {
  const [first] = props.columns
  return (openCardState.value.state ? [first] : props.columns).map((column, index) => {
    const fixedFirst = props.fixedFirstColumn && index === 0
    const fixedLast = props.fixedLastColumn && index === props.columns.length - 1

    return {
      ...column,
      fixedFirst,
      fixedLast,
      style: {
        ...(column.width
          ? {
              '--mc-table-cell-width': `${column.width}px`,
              '--mc-table-cell-max-width': `${column.width}px`,
              '--mc-table-cell-min-width': `${column.width}px`
            }
          : {
              '--mc-table-cell-min-width': column.minWidth && `${column.minWidth}px`,
              '--mc-table-cell-width': '100%'
            })
      }
    }
  })
})

const tableFirstColWidth = computed((): number => {
  const [first] = computedColumns.value
  return first?.width ? first.width : TABLE.defaultTableFirstColWidth
})

const computedHeaderColumns = computed((): ITableColumnEnriched[] => {
  return computedColumns.value.map((column) => ({
    ...column,
    class: {
      'mc-table__table_header-cell': true,
      'mc-table__table_header-cell--fixed-first': column.fixedFirst,
      'mc-table__table_header-cell--fixed-last': column.fixedLast,
      'mc-table__table_header-cell--shadow-first': column.fixedFirst && shadows.firstColHasShadow,
      'mc-table__table_header-cell--shadow-last': column.fixedLast && shadows.lastColHasShadow,
      [`mc-table__table_header-cell--align-${column.align}`]: !!column.align,
      ...(column.class ? { [String(column.class)]: true } : {})
    }
  }))
})

const computedBodyColumns = computed((): ITableColumnEnriched[] => {
  return computedColumns.value.map((column) => ({
    ...column,
    class: {
      'mc-table__table_body-cell': true,
      'mc-table__table_body-cell--fixed-first': column.fixedFirst,
      'mc-table__table_body-cell--fixed-last': column.fixedLast,
      'mc-table__table_body-cell--shadow-first': column.fixedFirst && shadows.firstColHasShadow,
      'mc-table__table_body-cell--shadow-last': column.fixedLast && shadows.lastColHasShadow,
      [`mc-table__table_body-cell--align-${column.align}`]: !!column.align,
      ...(column.class ? { [String(column.class)]: true } : {})
    }
  }))
})

const computedFooterColumns = computed((): ITableColumnEnriched[] => {
  return computedColumns.value.map((column) => ({
    ...column,
    class: {
      'mc-table__table_footer-cell': true,
      'mc-table__table_footer-cell--fixed-first': column.fixedFirst,
      'mc-table__table_footer-cell--fixed-last': column.fixedLast,
      'mc-table__table_footer-cell--shadow-first': column.fixedFirst && shadows.firstColHasShadow,
      'mc-table__table_footer-cell--shadow-last': column.fixedLast && shadows.lastColHasShadow,
      [`mc-table__table_footer-cell--align-${column.align}`]: !!column.align,
      ...(column.class ? { [String(column.class)]: true } : {})
    }
  }))
})

const containerStyle = computed((): { [key: string]: string } => {
  return {
    height: typeof props.height === 'number' ? `${props.height}px` : props.height,
    'max-height': typeof props.height === 'number' ? `${props.height}px` : props.height,
    '--mc-table-header-row-height': helper.isNumber(props.headerRowHeight) ? `${props.headerRowHeight}px` : '40px',
    '--mc-table-row-height': helper.isNumber(props.rowHeight) ? `${props.rowHeight}px` : '40px',
    '--mc-table-footer-row-height': helper.isNumber(props.footerRowHeight) ? `${props.footerRowHeight}px` : '40px',
    '--mc-table-first-col-width': `${tableFirstColWidth.value}px`
  }
})

const computedTableCardProps = computed((): ITableCardProps => {
  return {
    tableColumns: props.columns,
    tableData: props.data,
    tableTotals: props.totals,
    tableSort: props.sort,
    tableHeaderRowHeight: props.headerRowHeight,
    tableFooterRowHeight: props.footerRowHeight,
    tableFixedFirstColumn: props.fixedFirstColumn,
    tableCardProps: props.toTableCardProps
  }
})

onMounted((): void => {
  addListeners()
  rafResume()
})
onBeforeUnmount((): void => {
  removeListeners()
  rafPause()
})

const onBodyScroll = () => {
  if (!mcTable.value) return
  const { scrollLeft, scrollWidth, clientWidth } = mcTable.value
  const firstColShadow = props.fixedFirstColumn && scrollLeft > 0
  const lastColShadow = props.fixedLastColumn && scrollLeft + clientWidth < scrollWidth
  if (shadows.firstColHasShadow !== firstColShadow) shadows.firstColHasShadow = firstColShadow
  if (shadows.lastColHasShadow !== lastColShadow) shadows.lastColHasShadow = lastColShadow
}

const { pause: rafPause, resume: rafResume } = useRafFn(onBodyScroll, { immediate: false })

const addListeners = (): void => {
  if (hasFixedColumn.value && mcTable.value) {
    onBodyScroll()
    mcTable.value.addEventListener('scroll', onBodyScroll)
  }
}
const removeListeners = (): void => {
  if (hasFixedColumn.value && mcTable.value) mcTable.value.removeEventListener('scroll', onBodyScroll)
}

const handleRowClick = (row: any): void => {
  emit('row-click', row)
}

const handleCheckAll = () => {
  if (checkedRows.value.length === props.data.length) {
    checkedRows.value = []
  } else {
    checkedRows.value = allDataIds.value
  }
}

const handleSetCardState = (payload: TableCardState) => {
  openCardState.value = payload
  emit('table-card-opened', payload)
}

watch(
  () => checkedRows.value,
  () => {
    emit('update:selected-rows', checkedRows.value)
  }
)
</script>

<template>
  <div :class="containerClasses" :style="containerStyle">
    <div ref="mcTable" :class="tableClasses">
      <div class="mc-table__table">
        <!-- HEADER -->
        <div class="mc-table__table_header">
          <div class="mc-table__table_header-row">
            <div
              v-for="(column, cI) in computedHeaderColumns"
              :key="column.field"
              :class="column.class"
              :style="column.style"
            >
              <div class="mc-table__table_header-cell_content">
                <div class="mc-table__table_header-cell_content-left">
                  <mc-field-checkbox
                    v-if="!cI && props.withCheckboxes"
                    :main-checkbox="{ selected: checkedRows, all: allDataIds } as ICheckboxMainCheckbox"
                    checkbox-size="200"
                    @update:modelValue="handleCheckAll"
                  />
                  <mc-table-sort
                    v-if="column.sortable"
                    :column="column.field"
                    :sort="sort"
                    @change="(val) => emit('sort', val)"
                  />
                  <!-- slot для ячейки колонки хедера -->
                  <slot :name="`${column.field}-header-cell`" :column="column" :cellIndex="cI">
                    <mc-title :text-align="column.align" :weight="Weights.SemiBold" max-width="100%" pre-line
                      >{{ column.header }}
                    </mc-title>
                  </slot>
                </div>
                <div class="mc-table__table_header-cell_content-right">
                  <!-- slot справа от хедера колонки -->
                  <slot :name="`${column.field}-header-right`" :column="column" :cellIndex="cI" />
                  <!-- slot для тотала (выводится в chip) -->
                  <slot :name="`${column.field}-total`" :column="column" :cellIndex="cI">
                    <mc-chip
                      v-if="column.total"
                      :title="column.total"
                      variation="gray-invert"
                      text-color="gray"
                      size="s-compact"
                    >
                      <template v-if="totalLoading" #icon>
                        <mc-overlay v-if="totalLoading" size="200" />
                      </template>
                    </mc-chip>
                  </slot>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- BODY -->
        <div class="mc-table__table_body">
          <!-- Отображение скелетной загрузки -->
          <mc-table-skeleton-loading v-if="props.skeletonLoading" :columns="computedBodyColumns" />
          <template v-if="hasData">
            <div
              v-for="(row, rI) in props.data"
              :key="row.id ?? `${rI}-row`"
              class="mc-table__table_body-row"
              :class="{
                'mc-table__table_body-row--active': activeRowId === String(row.id),
                [row.metadata?.class]: !!row.metadata?.class
              }"
              @click="handleRowClick(row)"
            >
              <div
                v-for="(column, cI) in computedBodyColumns"
                :key="column.field"
                :class="column.class"
                :style="column.style"
              >
                <div class="mc-table__table_body-cell_content">
                  <div class="mc-table__table_body-cell_content-left">
                    <mc-field-checkbox
                      v-if="!cI && props.withCheckboxes"
                      v-model="checkedRows"
                      multiple
                      :checked-value="row.id"
                      checkbox-size="200"
                      @click.stop
                    />
                    <!-- slot для контента ячейки (по именем колонки) -->
                    <slot
                      :name="column.field"
                      :row="row"
                      :rowIndex="rI"
                      :column="column"
                      :cellIndex="cI"
                      :cellValue="row[column.field]"
                    >
                      <mc-title :text-align="column.align" max-width="100%" ellipsis>{{ row[column.field] }}</mc-title>
                    </slot>
                  </div>
                  <!-- slot срава от контента (по именем колонки + '-right') -->
                  <div v-if="$slots[`${column.field}-right`]" class="mc-table__table_body-cell_content-right">
                    <slot
                      :name="`${column.field}-right`"
                      :row="row"
                      :rowIndex="rI"
                      :column="column"
                      :cellIndex="cI"
                      :cellValue="row[column.field]"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div v-if="!openCardState.state" class="mc-table__table_body-row mc-table__table_body-row--fake">
              <div
                v-for="(column, cI) in computedBodyColumns"
                :key="column.field"
                :class="column.class"
                :style="column.style"
              >
                <div class="mc-table__table_body-cell_content">
                  <div class="mc-table__table_body-cell_content-left"></div>
                  <div v-if="$slots[`${column.field}-right`]" class="mc-table__table_body-cell_content-right"></div>
                </div>
              </div>
            </div>
          </template>
          <mc-infinity-loading-trigger
            v-if="props.hasLoadMore"
            :active="props.hasLoadMore"
            @loading="emit('loading')"
          />
        </div>

        <!-- FOOTER -->
        <div v-if="hasTotals" class="mc-table__table_footer">
          <div class="mc-table__table_footer-row">
            <div
              v-for="(column, cI) in computedFooterColumns"
              :key="column.field"
              :class="column.class"
              :style="column.style"
            >
              <slot
                :name="`${column.field}-footer-cell`"
                :column="column"
                :cellIndex="cI"
                :cellValue="totals[column.field]"
              >
                <mc-title :text-align="column.align" :weight="Weights.SemiBold" max-width="100%">
                  {{ totals[column.field] }}
                </mc-title>
              </slot>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- slot для карточки, по дефолту будет выводить карточку из вложенного роута -->
    <slot v-bind="computedTableCardProps" @setTableCardState="handleSetCardState"></slot>
    <mc-bottom-loader v-if="bottomLoading" class="mc-table__table-bottom-loader" />
    <mc-overlay v-if="loading" />
    <mc-no-data
      v-if="!hasData"
      variation="small"
      :title="placeholders.no_data"
      :img="props.noDataImg"
      :icon="props.noDataIcon"
    />
  </div>
</template>

<style lang="scss">
@use '../../../../assets/styles/mixins' as *;
@use '../../../../assets/tokens/colors' as *;
@use '../../../../assets/tokens/font-families' as *;
@use '../../../../assets/tokens/font-weights' as *;
@use '../../../../assets/tokens/font-sizes' as *;
@use '../../../../assets/tokens/spacings' as *;
@use '../../../../assets/tokens/sizes' as *;
@use '../../../../assets/tokens/box-shadows' as *;
@use '../../../../assets/tokens/z-indexes' as *;
@use '../../../../assets/tokens/media-queries' as *;
.mc-table {
  --mc-table-z-index-header: 14;
  --mc-table-z-index-footer: 14;
  --mc-table-z-index-fixed-col-card-opened: 13;
  --mc-table-z-index-fixed-col: 12;
  --mc-table-z-index-cell-right-slot: 11;
  --mc-table-z-index-cell: 10;
  @mixin fixed-first {
    left: 0;
    z-index: var(--mc-table-z-index-fixed-col);
    border-right: var(--border-style);
    background-color: $color-white;
  }
  @mixin fixed-last {
    right: 0;
    z-index: var(--mc-table-z-index-fixed-col);
    background-color: $color-white;
  }
  @mixin fixed-classes {
    &--fixed-first {
      @include fixed-first;
    }
    &--fixed-last {
      @include fixed-last;
    }
  }
  @mixin shadow-classes {
    &--shadow-first {
      @include shadow-first;
    }
    &--shadow-last {
      @include shadow-last;
    }
  }
  @mixin shadow-first {
    border-right-color: $color-transparent;
    &::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      background: none;
      width: 1px;
      height: 100%;
      box-shadow: 5px 0 8px $color-black;
      pointer-events: none;
    }
  }
  @mixin shadow-last {
    border-left-color: $color-transparent;
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      background: none;
      width: 1px;
      height: 100%;
      box-shadow: -5px 0 8px $color-black;
      pointer-events: none;
    }
  }
  @mixin grow {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }
  @mixin cell-alignment {
    display: flex;
    align-items: center;
    padding: 0 $space-200;
  }

  font-family: $font-family-main;
  overflow-y: auto;
  max-height: 100%;
  @include grow;
  * {
    box-sizing: border-box;
  }
  .mc-title {
    width: 100%;
  }
  &--card-opened {
    width: max-content;
    z-index: var(--mc-table-z-index-fixed-col-card-opened);
  }
  &__container {
    --border-style: 1px solid #{$color-hover-gray};
    --table-row-hover-background-color: #{$color-hover-gray};
    --mc-table-cell-width: auto;
    --mc-table-cell-max-width: auto;
    --mc-table-cell-min-width: auto;
    --mc-table-row-height: 40px;
    --mc-table-footer-row-height: 40px;
    --mc-table-first-col-width: auto;

    position: relative;
    overflow: hidden;
    font-size: $font-size-200;
    @include grow;
    &--outline-border {
      border: var(--border-style);
    }
    &--card-opened {
      & > .mc-table__table-bottom-loader {
        width: var(--mc-table-first-col-width);
      }
    }
  }
  &__table {
    @include grow;
    &_header {
      position: sticky;
      top: 0;
      z-index: var(--mc-table-z-index-header);
      &-row {
        display: flex;
        flex-wrap: nowrap;
        height: var(--mc-table-header-row-height);
        min-height: var(--mc-table-header-row-height);
      }
      &-cell {
        position: sticky;
        text-align: left;
        top: 0;
        z-index: var(--mc-table-z-index-cell);
        width: var(--mc-table-cell-width);
        max-width: var(--mc-table-cell-max-width);
        min-width: var(--mc-table-cell-min-width);
        background-color: $color-white;
        border-bottom: var(--border-style);
        @include cell-alignment;
        @include fixed-classes;
        @include shadow-classes;
        &_content {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          &-left {
            display: flex;
            align-items: center;
            @include child-indent-right($space-50);
          }
          &-right {
            margin-inline-start: $space-50;
            display: flex;
            align-items: center;
            font-weight: $font-weight-semi-bold;
            @include child-indent-right($space-50);
          }
          &_total-loading {
            .mc-chip__icon {
              margin: 0 !important;
            }
          }
        }
        &--align-left {
          justify-content: flex-start;
          .mc-table__table_header-cell_content {
            justify-content: flex-start;
          }
        }
        &--align-center {
          justify-content: center;
          .mc-table__table_header-cell_content {
            justify-content: center;
          }
        }
        &--align-right {
          justify-content: flex-end;
          .mc-table__table_header-cell_content {
            justify-content: flex-end;
          }
        }
        .mc-table-sort,
        .mc-tooltip-target {
          display: inline-flex;
          align-items: center;
        }
      }
    }
    &_body {
      @include grow;
      $body: &;
      &-row {
        display: flex;
        flex-wrap: nowrap;
        height: var(--mc-table-row-height);
        min-height: var(--mc-table-row-height);
        cursor: pointer;
        &--active {
          #{$body}-cell {
            background-color: var(--table-row-hover-background-color);
          }
        }
        &:hover {
          #{$body}-cell {
            background-color: var(--table-row-hover-background-color);
            &_content-right {
              display: flex;
            }
          }
        }
        @media #{$media-mobile} {
          #{$body}-cell {
            &_content-right {
              display: flex;
            }
          }
        }
        &--fake {
          min-height: 0;
          max-height: 100%;
          height: 100%;
          cursor: default;
          &:hover {
            #{$body}-cell {
              background-color: transparent;
              &_content-right {
                display: none;
              }
            }
          }
          @media #{$media-mobile} {
            #{$body}-cell {
              &_content-right {
                display: none;
              }
            }
          }
        }
      }
      &-cell {
        position: sticky;
        z-index: var(--mc-table-z-index-cell);
        text-align: left;
        width: var(--mc-table-cell-width);
        max-width: var(--mc-table-cell-max-width);
        min-width: var(--mc-table-cell-min-width);
        @include cell-alignment;
        @include fixed-classes;
        @include shadow-classes;
        &_content {
          width: 100%;
          &-right {
            position: absolute;
            display: none;
            top: 0;
            right: 0;
            padding-right: $space-200;
            padding-left: $space-200;
            height: var(--mc-table-row-height);
            min-height: var(--mc-table-row-height);
            align-items: center;
            background: linear-gradient(90deg, rgba($color-hover-gray, 0.2) 0%, $color-hover-gray 60%);
            z-index: var(--mc-table-z-index-cell-right-slot);
            @include child-indent-right($space-50);
          }
          &-left {
            display: flex;
            align-items: center;
            @include child-indent-right($space-50);
          }
          .mc-cell {
            width: 100%;
          }
        }
        &--align-left {
          text-align: left;
          .mc-table__table_body-cell_content-left {
            text-align: left;
            justify-content: flex-start;
          }
        }
        &--align-center {
          text-align: center;
          .mc-table__table_body-cell_content-left {
            text-align: center;
            justify-content: center;
          }
        }
        &--align-right {
          text-align: right;
          .mc-table__table_body-cell_content-left {
            text-align: right;
            justify-content: flex-end;
          }
        }
      }
    }
    &_footer {
      position: sticky;
      bottom: 0;
      z-index: var(--mc-table-z-index-footer);
      &-row {
        display: flex;
        flex-wrap: nowrap;
        height: var(--mc-table-footer-row-height);
        min-height: var(--mc-table-footer-row-height);
      }
      &-cell {
        position: sticky;
        z-index: var(--mc-table-z-index-cell);
        text-align: left;
        width: var(--mc-table-cell-width);
        max-width: var(--mc-table-cell-max-width);
        min-width: var(--mc-table-cell-min-width);
        background-color: $color-white;
        border-top: var(--border-style);
        @include cell-alignment;
        @include fixed-classes;
        @include shadow-classes;
        &--align-left {
          justify-content: flex-start;
        }
        &--align-center {
          justify-content: center;
        }
        &--align-right {
          justify-content: flex-end;
        }
      }
    }
  }
}
</style>
