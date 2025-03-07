<template>
  <div
    id="app-sidebar"
    data-testid="app-sidebar"
    :class="{
      'has-active-sub-panel': !!activeAvailablePanelName,
      'oc-flex oc-flex-center oc-flex-middle': loading
    }"
  >
    <oc-spinner v-if="loading" />
    <template v-else>
      <div
        v-for="panel in panels"
        :id="`sidebar-panel-${panel.name}`"
        :key="`panel-${panel.name}`"
        ref="panelContainer"
        :data-testid="`sidebar-panel-${panel.name}`"
        :tabindex="activePanelName === panel.name ? -1 : null"
        class="sidebar-panel"
        :class="{
          'is-active-sub-panel': activeAvailablePanelName === panel.name,
          'is-active-default-panel': panel.isRoot?.(panelContext) && activePanelName === panel.name,
          'sidebar-panel-default': panel.isRoot?.(panelContext)
        }"
      >
        <div
          v-if="[activePanelName, oldPanelName].includes(panel.name)"
          class="sidebar-panel__header header"
        >
          <oc-button
            v-if="!panel.isRoot?.(panelContext)"
            v-oc-tooltip="accessibleLabelBack"
            class="header__back"
            appearance="raw"
            :aria-label="accessibleLabelBack"
            @click="closePanel"
          >
            <oc-icon name="arrow-left-s" fill-type="line" />
          </oc-button>

          <h2 class="header__title oc-my-rm">
            {{ panel.title(panelContext) }}
          </h2>

          <oc-button
            appearance="raw"
            class="header__close"
            :aria-label="$gettext('Close file sidebar')"
            @click="closeSidebar"
          >
            <oc-icon name="close" />
          </oc-button>
        </div>

        <div>
          <slot name="header" />
        </div>
        <div class="sidebar-panel__body" :class="[`sidebar-panel__body-${panel.name}`]">
          <div
            class="sidebar-panel__body-content"
            :class="{ 'sidebar-panel__body-content-stretch': !panel.isRoot?.(panelContext) }"
          >
            <slot name="body">
              <component
                :is="panel.component"
                v-bind="panel.componentAttrs?.(panelContext) || {}"
                @scroll-to-element="scrollToElement"
              />
            </slot>
          </div>

          <div
            v-if="panel.isRoot?.(panelContext) && subPanels.length > 0"
            class="sidebar-panel__navigation oc-mt-m"
          >
            <oc-button
              v-for="panelSelect in subPanels"
              :id="`sidebar-panel-${panelSelect.name}-select`"
              :key="`panel-select-${panelSelect.name}`"
              :data-testid="`sidebar-panel-${panelSelect.name}-select`"
              appearance="raw"
              @click="openPanel(panelSelect.name)"
            >
              <oc-icon :name="panelSelect.icon" :fill-type="panelSelect.iconFillType" />
              {{ panelSelect.title(panelContext) }}
              <oc-icon name="arrow-right-s" fill-type="line" />
            </oc-button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { VisibilityObserver } from '../../observer'
import { computed, defineComponent, PropType, onBeforeUnmount, unref } from 'vue'
import { SideBarPanel, SideBarPanelContext } from './types'
import { SideBarEventTopics, useEventBus } from '../../composables'

let visibilityObserver: VisibilityObserver
let hiddenObserver: VisibilityObserver

export default defineComponent({
  props: {
    isOpen: {
      type: Boolean,
      required: true
    },
    loading: {
      type: Boolean,
      required: true
    },
    availablePanels: {
      type: Array as PropType<SideBarPanel<unknown, unknown, unknown>[]>,
      required: true
    },
    panelContext: {
      type: Object as PropType<SideBarPanelContext<unknown, unknown, unknown>>,
      required: true
    },
    activePanel: {
      type: String,
      required: false,
      default: ''
    }
  },
  emits: ['close', 'selectPanel'],
  setup(props) {
    const eventBus = useEventBus()
    const panels = computed(() =>
      props.availablePanels.filter((p) => p.isVisible(props.panelContext))
    )
    const subPanels = computed(() => unref(panels).filter((p) => !p.isRoot?.(props.panelContext)))

    onBeforeUnmount(() => {
      eventBus.publish(SideBarEventTopics.close)
    })

    return {
      panels,
      subPanels
    }
  },

  data() {
    return {
      focused: undefined,
      oldPanelName: null,
      selectedFile: {}
    }
  },

  computed: {
    activeAvailablePanelName() {
      const panelName = this.activePanel?.split('#')[0]
      if (!panelName) {
        return null
      }
      if (!this.panels.map((p) => p.name).includes(panelName)) {
        return null
      }
      return panelName
    },
    activePanelName() {
      return this.activeAvailablePanelName || this.rootPanel?.name
    },
    rootPanel() {
      return this.panels.find((panel) => panel.isRoot?.(this.panelContext))
    },
    accessibleLabelBack() {
      return this.$gettext('Back to %{panel} panel', {
        panel: this.rootPanel.title(this.panelContext)
      })
    }
  },
  watch: {
    activePanelName: {
      handler: function (panel, select) {
        this.$nextTick(() => {
          this.focused = panel ? `#sidebar-panel-${panel}` : `#sidebar-panel-select-${select}`
        })
      },
      immediate: true
    },
    isOpen: {
      handler: function (isOpen) {
        if (!isOpen) {
          return
        }
        this.$nextTick(() => {
          this.initVisibilityObserver()
        })
      },
      immediate: true
    }
  },
  beforeUnmount() {
    visibilityObserver.disconnect()
    hiddenObserver.disconnect()
  },
  methods: {
    scrollToElement({ element, panelName }) {
      const sideBarPanelBodyEl = document.getElementsByClassName(
        `sidebar-panel__body-${panelName}`
      )[0]

      const sideBarPanelPadding = Number(
        window.getComputedStyle(sideBarPanelBodyEl).getPropertyValue('padding')?.split('px')[0]
      )

      sideBarPanelBodyEl.scrollTo(
        0,
        element.getBoundingClientRect().y -
          sideBarPanelBodyEl.getBoundingClientRect().y -
          sideBarPanelPadding
      )
    },
    setSidebarPanel(panel: string) {
      this.$emit('selectPanel', panel)
    },

    resetSidebarPanel() {
      this.$emit('selectPanel', null)
    },

    closeSidebar() {
      this.$emit('close')
    },

    initVisibilityObserver() {
      visibilityObserver = new VisibilityObserver({
        root: document.querySelector('#app-sidebar'),
        threshold: 0.9
      })
      hiddenObserver = new VisibilityObserver({
        root: document.querySelector('#app-sidebar'),
        threshold: 0.05
      })
      const doFocus = () => {
        const selector = document.querySelector(this.focused)
        if (!selector) {
          return
        }
        selector.focus()
      }
      const clearOldPanelName = () => {
        this.oldPanelName = null
      }

      if (!this.$refs.panelContainer) {
        return
      }

      visibilityObserver.disconnect()
      hiddenObserver.disconnect()
      ;(this.$refs.panelContainer as HTMLElement[]).forEach((panel) => {
        visibilityObserver.observe(panel, {
          onEnter: doFocus,
          onExit: doFocus
        })
        hiddenObserver.observe(panel, {
          onExit: clearOldPanelName
        })
      })
    },

    setOldPanelName() {
      this.oldPanelName = this.activePanelName
    },

    openPanel(panel) {
      this.setOldPanelName()
      this.setSidebarPanel(panel)
    },

    closePanel() {
      this.setOldPanelName()
      this.resetSidebarPanel()
    }
  }
})
</script>

<style lang="scss">
#app-sidebar {
  border-left: 1px solid var(--oc-color-border);
  position: relative;
  overflow: hidden;
  min-width: 440px;
  width: 440px;
}

@media only screen and (max-width: 960px) {
  #app-sidebar {
    min-width: 100%;
    width: 100%;
  }

  .files-wrapper {
    flex-wrap: nowrap;
  }
}

.sidebar-panel {
  $root: &;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  height: 100%;
  max-height: 100%;
  display: grid;
  grid-template-rows: auto auto 1fr;
  background-color: var(--oc-color-background-default);
  top: 0;
  position: absolute;
  transform: translateX(100%);
  transition:
    transform 0.4s ease,
    visibility 0.4s 0s;
  // visibility is here to prevent focusing panel child elements,
  // the transition delay keeps care that it will only apply if the element is visible or not.
  // hidden: if element is off screen
  // visible: if element is on screen
  visibility: hidden;
  border-top-right-radius: var(--oc-space-medium);
  border-bottom-right-radius: var(--oc-space-medium);

  @media screen and (prefers-reduced-motion: reduce), (update: slow) {
    transition-duration: 0.001ms !important;
  }

  &.sidebar-panel-default {
    &.has-active-sub-panel & {
      transform: translateX(-30%);
      visibility: hidden;
    }
  }

  &.is-active-default-panel,
  &.is-active-sub-panel {
    visibility: unset;
    transform: translateX(0);
  }

  &__header {
    padding: var(--oc-space-small) var(--oc-space-small) 0 var(--oc-space-small);

    &.header {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
    }

    & .header {
      &__back {
        grid-column-start: 1;
      }

      &__title {
        text-align: center;
        color: var(--oc-color-text-default);
        font-size: var(--oc-font-size-large);
        grid-column-start: 2;
      }

      &__close {
        grid-column-start: 3;
      }
    }
  }

  &__body {
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--oc-space-small);
    display: flex;
    flex-direction: column;

    &-content-stretch {
      flex: 1;
    }
  }

  &__navigation {
    margin: var(--oc-space-small) - var(--oc-space-small) - var(--oc-space-small);

    > button {
      border-bottom: 1px solid var(--oc-color-border);
      width: 100%;
      border-radius: 0;
      color: var(--oc-color-text-default) !important;
      display: grid;
      grid-template-columns: auto 1fr auto;
      text-align: left;
      height: 50px;
      padding: 0 var(--oc-space-small);

      &:first-of-type {
        border-top: 1px solid var(--oc-color-border);
      }

      &:last-of-type {
        border-bottom: 0;
      }

      &:hover,
      &:focus {
        border-color: var(--oc-color-border) !important;
      }

      &:hover {
        background-color: var(--oc-color-background-muted) !important;
      }
    }
  }
}
</style>
