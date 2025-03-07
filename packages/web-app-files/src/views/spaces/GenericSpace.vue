<template>
  <div class="oc-flex oc-width-1-1" :class="{ 'space-frontpage': isSpaceFrontpage }">
    <whitespace-context-menu ref="whitespaceContextMenu" :space="space" />
    <files-view-wrapper>
      <app-bar
        ref="appBarRef"
        :breadcrumbs="breadcrumbs"
        :breadcrumbs-context-actions-items="[currentFolder]"
        :has-bulk-actions="displayFullAppBar"
        :show-actions-on-selection="displayFullAppBar"
        :has-view-options="displayFullAppBar"
        :is-side-bar-open="isSideBarOpen"
        :space="space"
        :view-modes="viewModes"
        @item-dropped="fileDropped"
      >
        <template #actions="{ limitedScreenSpace }">
          <oc-button
            v-if="isEmbedModeEnabled"
            key="new-folder-btn"
            v-oc-tooltip="limitedScreenSpace ? $gettext('New folder') : ''"
            data-testid="btn-new-folder"
            :aria-label="$gettext('New folder')"
            appearance="filled"
            variation="primary"
            :disabled="!canUpload"
            @click="createNewFolderAction"
          >
            <oc-icon name="add" />
            <span v-if="!limitedScreenSpace" v-text="$gettext('New folder')" />
          </oc-button>

          <create-and-upload
            v-else
            key="create-and-upload-actions"
            data-testid="actions-create-and-upload"
            :space="space"
            :item="item"
            :item-id="itemId"
            :limited-screen-space="limitedScreenSpace"
          />
        </template>
      </app-bar>
      <app-loading-spinner v-if="areResourcesLoading" />
      <template v-else>
        <not-found-message v-if="folderNotFound" :space="space" class="files-not-found" />
        <template v-else>
          <space-header
            v-if="hasSpaceHeader"
            :space="space"
            :is-side-bar-open="isSideBarOpen"
            class="oc-px-m oc-mt-m"
          />
          <no-content-message
            v-if="isCurrentFolderEmpty"
            id="files-space-empty"
            class="files-empty"
            icon="folder"
          >
            <template #message>
              <span v-text="$gettext('No resources found')" />
            </template>
            <template #callToAction>
              <span v-if="canUpload" class="file-empty-upload-hint" v-text="uploadHint" />
            </template>
          </no-content-message>
          <template v-else>
            <resource-details
              v-if="displayResourceAsSingleResource"
              :single-resource="paginatedResources[0]"
              :space="space"
            />
            <component
              :is="folderView.component"
              v-else
              v-model:selectedIds="selectedResourcesIds"
              :resources="paginatedResources"
              :view-mode="viewMode"
              :target-route-callback="resourceTargetRouteCallback"
              :space="space"
              :are-thumbnails-displayed="displayThumbnails"
              :drag-drop="true"
              :sort-by="sortBy"
              :sort-dir="sortDir"
              :header-position="fileListHeaderY /* table */"
              :sort-fields="sortFields /* tiles */"
              :view-size="viewSize /* tiles */"
              :style="folderViewStyle"
              v-bind="folderView.componentAttrs?.()"
              @file-dropped="fileDropped"
              @file-click="triggerDefaultAction"
              @row-mounted="rowMounted"
              @sort="handleSort"
            >
              <template #contextMenu="{ resource }">
                <context-actions
                  v-if="isResourceInSelection(resource)"
                  :action-options="{ space, resources: selectedResources }"
                />
              </template>

              <template #footer>
                <pagination :pages="paginationPages" :current-page="paginationPage" />
                <list-info
                  v-if="paginatedResources.length > 0"
                  class="oc-width-1-1 oc-my-s"
                  :files="totalResourcesCount.files"
                  :folders="totalResourcesCount.folders"
                  :size="totalResourcesSize"
                />
              </template>
              <template #quickActions="{ resource }">
                <quick-actions
                  :class="resource.preview"
                  class="oc-visible@s"
                  :space="space"
                  :item="resource"
                />
              </template>
            </component>
          </template>
        </template>
      </template>
    </files-view-wrapper>
    <file-side-bar :is-open="isSideBarOpen" :active-panel="sideBarActivePanel" :space="space" />
  </div>
</template>

<script lang="ts">
import { debounce, omit, last } from 'lodash-es'
import { basename } from 'path'
import { computed, defineComponent, PropType, onBeforeUnmount, onMounted, unref, ref } from 'vue'
import { RouteLocationNamedRaw } from 'vue-router'
import { useGettext } from 'vue3-gettext'
import { Resource } from '@ownclouders/web-client'
import {
  isPersonalSpaceResource,
  isProjectSpaceResource,
  isPublicSpaceResource,
  isShareSpaceResource,
  SpaceResource
} from '@ownclouders/web-client/src/helpers'

import {
  FolderViewExtension,
  ProcessorType,
  ResourceTransfer,
  TransferType,
  useCapabilityStore,
  useConfigStore,
  useEmbedMode,
  useExtensionRegistry,
  useFileActions,
  useFileActionsCreateNewFolder,
  useResourcesStore,
  useUserStore
} from '@ownclouders/web-pkg'

import {
  AppBar,
  AppLoadingSpinner,
  ContextActions,
  FileSideBar,
  NoContentMessage,
  Pagination,
  ResourceTable,
  CreateTargetRouteOptions,
  FolderViewModeConstants,
  VisibilityObserver,
  createFileRouteOptions,
  createLocationPublic,
  createLocationSpaces,
  displayPositionedDropdown,
  useBreadcrumbsFromPath,
  useClientService,
  useDocumentTitle,
  useOpenWithDefaultApp,
  useKeyboardActions,
  useRoute,
  useRouteQuery
} from '@ownclouders/web-pkg'
import CreateAndUpload from '../../components/AppBar/CreateAndUpload.vue'
import FilesViewWrapper from '../../components/FilesViewWrapper.vue'
import ListInfo from '../../components/FilesList/ListInfo.vue'
import NotFoundMessage from '../../components/FilesList/NotFoundMessage.vue'
import QuickActions from '../../components/FilesList/QuickActions.vue'
import ResourceDetails from '../../components/FilesList/ResourceDetails.vue'
import { ResourceTiles } from '@ownclouders/web-pkg'
import SpaceHeader from '../../components/Spaces/SpaceHeader.vue'
import WhitespaceContextMenu from 'web-app-files/src/components/Spaces/WhitespaceContextMenu.vue'
import { eventBus } from '@ownclouders/web-pkg'
import { useResourcesViewDefaults } from '../../composables'
import { FolderLoaderOptions } from '../../services/folder'
import { BreadcrumbItem } from 'design-system/src/components/OcBreadcrumb/types'
import { v4 as uuidv4 } from 'uuid'
import {
  useKeyboardTableMouseActions,
  useKeyboardTableNavigation,
  useKeyboardTableSpaceActions
} from 'web-app-files/src/composables/keyboardActions'
import { storeToRefs } from 'pinia'
import { ComponentPublicInstance } from 'vue'

const visibilityObserver = new VisibilityObserver()

export default defineComponent({
  name: 'GenericSpace',

  components: {
    AppBar,
    AppLoadingSpinner,
    ContextActions,
    CreateAndUpload,
    FileSideBar,
    FilesViewWrapper,
    ListInfo,
    NoContentMessage,
    NotFoundMessage,
    Pagination,
    QuickActions,
    ResourceDetails,
    ResourceTable,
    ResourceTiles,
    SpaceHeader,
    WhitespaceContextMenu
  },
  props: {
    space: {
      type: Object as PropType<SpaceResource>,
      required: false,
      default: null
    },
    item: {
      type: String,
      required: false,
      default: null
    },
    itemId: {
      type: [String, Number],
      required: false,
      default: null
    }
  },

  setup(props) {
    const userStore = useUserStore()
    const capabilityStore = useCapabilityStore()
    const capabilityRefs = storeToRefs(capabilityStore)
    const { $gettext, $ngettext } = useGettext()
    const openWithDefaultAppQuery = useRouteQuery('openWithDefaultApp')
    const clientService = useClientService()
    const { breadcrumbsFromPath, concatBreadcrumbs } = useBreadcrumbsFromPath()
    const { openWithDefaultApp } = useOpenWithDefaultApp()
    const { actions: createNewFolder } = useFileActionsCreateNewFolder({ space: props.space })
    const { isEnabled: isEmbedModeEnabled } = useEmbedMode()

    const configStore = useConfigStore()
    const { options: configOptions } = storeToRefs(configStore)

    const resourcesStore = useResourcesStore()
    const { removeResources, resetSelection, updateResourceField } = resourcesStore
    const { currentFolder, totalResourcesCount, totalResourcesSize } = storeToRefs(resourcesStore)

    let loadResourcesEventToken: string

    const canUpload = computed(() => {
      return unref(currentFolder)?.canUpload({ user: userStore.user })
    })

    const extensionRegistry = useExtensionRegistry()
    const viewModes = computed(() => {
      return [
        ...extensionRegistry
          .requestExtensions<FolderViewExtension>('folderView', ['resource'])
          .map((e) => e.folderView)
      ]
    })

    const resourceTargetRouteCallback = ({
      path,
      fileId
    }: CreateTargetRouteOptions): RouteLocationNamedRaw => {
      const { params, query } = createFileRouteOptions(props.space, { path, fileId })
      if (isPublicSpaceResource(props.space)) {
        return createLocationPublic('files-public-link', { params, query })
      }
      return createLocationSpaces('files-spaces-generic', { params, query })
    }

    const hasSpaceHeader = computed(() => {
      // for now the space header is only available in the root of a project space.
      return props.space.driveType === 'project' && props.item === '/'
    })

    const folderNotFound = computed(() => unref(currentFolder) === null)

    const isCurrentFolderEmpty = computed(
      () => unref(resourcesViewDefaults.paginatedResources).length < 1
    )

    const titleSegments = computed(() => {
      const segments = [props.space.name]
      if (props.item !== '/') {
        segments.unshift(basename(props.item))
      }

      return segments
    })
    useDocumentTitle({ titleSegments })

    const route = useRoute()
    const breadcrumbs = computed(() => {
      const space = props.space
      const rootBreadcrumbItems: BreadcrumbItem[] = []
      if (isProjectSpaceResource(space)) {
        rootBreadcrumbItems.push({
          id: uuidv4(),
          text: $gettext('Spaces'),
          to: createLocationSpaces('files-spaces-projects'),
          isStaticNav: true
        })
      } else if (isShareSpaceResource(space)) {
        rootBreadcrumbItems.push(
          {
            id: uuidv4(),
            text: $gettext('Shares'),
            to: { path: '/files/shares' },
            isStaticNav: true
          },
          {
            id: uuidv4(),
            text: $gettext('Shared with me'),
            to: { path: '/files/shares/with-me' },
            isStaticNav: true
          }
        )
      }

      let spaceBreadcrumbItem: BreadcrumbItem
      let { params, query } = createFileRouteOptions(space, { fileId: space.fileId })
      query = omit({ ...unref(route).query, ...query }, 'page')
      if (isPersonalSpaceResource(space)) {
        spaceBreadcrumbItem = {
          id: uuidv4(),
          text: space.name,
          ...(space.isOwner(userStore.user) && {
            to: createLocationSpaces('files-spaces-generic', {
              params,
              query
            })
          })
        }
      } else if (isShareSpaceResource(space)) {
        spaceBreadcrumbItem = {
          id: uuidv4(),
          allowContextActions: true,
          text: space.name,
          to: createLocationSpaces('files-spaces-generic', {
            params,
            query: omit(query, 'fileId')
          })
        }
      } else if (isPublicSpaceResource(space)) {
        spaceBreadcrumbItem = {
          id: uuidv4(),
          text: $gettext('Public link'),
          to: createLocationPublic('files-public-link', {
            params,
            query
          }),
          isStaticNav: true
        }
      } else {
        spaceBreadcrumbItem = {
          id: uuidv4(),
          allowContextActions: !unref(hasSpaceHeader),
          text: space.name,
          to: createLocationSpaces('files-spaces-generic', {
            params,
            query
          })
        }
      }

      return concatBreadcrumbs(
        ...rootBreadcrumbItems,
        spaceBreadcrumbItem,
        // FIXME: needs file ids for each parent folder path
        ...breadcrumbsFromPath({ route: unref(route), space, resourcePath: props.item })
      )
    })

    const focusAndAnnounceBreadcrumb = (sameRoute) => {
      const breadcrumbEl = document.getElementById('files-breadcrumb')
      if (!breadcrumbEl) {
        return
      }
      const activeBreadcrumb = last(breadcrumbEl.children[0].children)
      const activeBreadcrumbItem = activeBreadcrumb.getElementsByTagName('button')[0]
      if (!activeBreadcrumbItem) {
        return
      }

      const totalFilesCount = unref(totalResourcesCount)
      const itemCount = totalFilesCount.files + totalFilesCount.folders

      const announcement = $ngettext(
        'This folder contains %{ amount } item.',
        'This folder contains %{ amount } items.',
        itemCount,
        { amount: itemCount.toString() }
      )

      const translatedHint = itemCount > 0 ? announcement : $gettext('This folder has no content.')

      document.querySelectorAll('.oc-breadcrumb-sr').forEach((el) => el.remove())

      const invisibleHint = document.createElement('p')
      invisibleHint.className = 'oc-invisible-sr oc-breadcrumb-sr'
      invisibleHint.innerHTML = translatedHint

      activeBreadcrumb.append(invisibleHint)
      if (sameRoute) {
        activeBreadcrumbItem.focus()
      }
    }

    const resourcesViewDefaults = useResourcesViewDefaults<Resource, any, any[]>()

    const folderView = computed(() => {
      const viewMode = unref(resourcesViewDefaults.viewMode)
      return unref(viewModes).find((v) => v.name === viewMode)
    })
    const appBarRef = ref<ComponentPublicInstance | null>()
    const folderViewStyle = computed(() => {
      return {
        ...(unref(folderView)?.isScrollable === false && {
          height: `calc(100% - ${unref(appBarRef)?.$el.getBoundingClientRect().height}px)`
        })
      }
    })

    const keyActions = useKeyboardActions()
    useKeyboardTableNavigation(
      keyActions,
      resourcesViewDefaults.paginatedResources,
      resourcesViewDefaults.viewMode
    )
    useKeyboardTableMouseActions(keyActions, resourcesViewDefaults.viewMode)
    useKeyboardTableSpaceActions(keyActions, props.space)

    const performLoaderTask = async (
      sameRoute: boolean,
      path?: string,
      fileId?: string | number
    ) => {
      if (resourcesViewDefaults.loadResourcesTask.isRunning) {
        return
      }

      const options: FolderLoaderOptions = { loadShares: !isPublicSpaceResource(props.space) }
      await resourcesViewDefaults.loadResourcesTask.perform(
        props.space,
        path || props.item,
        fileId || props.itemId,
        options
      )

      resourcesViewDefaults.scrollToResourceFromRoute(
        [unref(currentFolder), ...unref(resourcesViewDefaults.paginatedResources)],
        'files-app-bar'
      )
      resourcesViewDefaults.refreshFileListHeaderPosition()
      focusAndAnnounceBreadcrumb(sameRoute)

      if (unref(openWithDefaultAppQuery) === 'true') {
        openWithDefaultApp({
          space: props.space,
          resource: unref(resourcesViewDefaults.selectedResources)[0]
        })
      }
    }

    onMounted(() => {
      performLoaderTask(false)
      loadResourcesEventToken = eventBus.subscribe(
        'app.files.list.load',
        (path?: string, fileId?: string | number) => {
          performLoaderTask(true, path, fileId)
        }
      )
      const filesViewWrapper = document.getElementsByClassName('files-view-wrapper')[0]
      filesViewWrapper?.addEventListener('contextmenu', (event) => {
        const { target } = event
        if ((target as HTMLElement).closest('.has-item-context-menu')) {
          return
        }
        event.preventDefault()
        const newEvent = new MouseEvent('contextmenu', event)
        showContextMenu(newEvent)
      })
    })

    onBeforeUnmount(() => {
      visibilityObserver.disconnect()
      eventBus.unsubscribe('app.files.list.load', loadResourcesEventToken)
    })

    const whitespaceContextMenu = ref(null)
    const showContextMenu = (event) => {
      resourcesStore.resetSelection()
      displayPositionedDropdown(
        unref(whitespaceContextMenu).$el._tippy,
        event,
        unref(whitespaceContextMenu)
      )
    }

    const createNewFolderAction = computed(() => unref(createNewFolder)[0].handler)

    return {
      ...useFileActions(),
      ...resourcesViewDefaults,
      configOptions,
      canUpload,
      breadcrumbs,
      folderNotFound,
      hasSpaceHeader,
      isCurrentFolderEmpty,
      resourceTargetRouteCallback,
      performLoaderTask,
      FolderViewModeConstants,
      viewModes,
      appBarRef,
      folderView,
      folderViewStyle,
      uploadHint: $gettext(
        'Drag files and folders here or use the "New" or "Upload" buttons to add files'
      ),
      whitespaceContextMenu,
      clientService,
      createNewFolderAction,
      isEmbedModeEnabled,
      currentFolder,
      totalResourcesCount,
      totalResourcesSize,
      removeResources,
      resetSelection,
      updateResourceField
    }
  },

  computed: {
    displayFullAppBar() {
      return !this.displayResourceAsSingleResource
    },

    displayResourceAsSingleResource() {
      if (this.paginatedResources.length !== 1) {
        return false
      }

      if (this.paginatedResources[0].isFolder) {
        return false
      }

      if (isPublicSpaceResource(this.space) && !this.currentFolder?.fileId) {
        return true
      }

      if (this.configOptions.runningOnEos) {
        if (
          !this.currentFolder.fileId ||
          this.currentFolder.path === this.paginatedResources[0].path
        ) {
          return true
        }
      }

      return false
    },

    displayThumbnails() {
      return !this.configOptions.disablePreviews
    },

    isSpaceFrontpage() {
      return isProjectSpaceResource(this.space) && this.item === '/'
    }
  },

  watch: {
    item: {
      handler: function () {
        this.performLoaderTask(true)
      }
    },
    space: {
      handler: function () {
        this.performLoaderTask(true)
      }
    }
  },

  methods: {
    async fileDropped(fileTarget) {
      const selected = [...this.selectedResources]
      let targetFolder = null
      if (typeof fileTarget === 'string') {
        targetFolder = this.paginatedResources.find((e) => e.id === fileTarget)
        const isTargetSelected = selected.some((e) => e.id === fileTarget)
        if (isTargetSelected) {
          return
        }
      } else if (fileTarget instanceof Object) {
        const spaceRootRoutePath = this.$router.resolve(
          createLocationSpaces('files-spaces-generic', {
            params: {
              driveAliasAndItem: this.space.driveAlias
            }
          })
        ).path

        const splitIndex = fileTarget.path.indexOf(spaceRootRoutePath) + spaceRootRoutePath.length
        const path = decodeURIComponent(fileTarget.path.slice(splitIndex, fileTarget.path.length))

        try {
          targetFolder = await this.clientService.webdav.getFileInfo(this.space, { path })
        } catch (e) {
          console.error(e)
          return
        }
      }
      if (!targetFolder) {
        return
      }
      if (targetFolder.type !== 'folder') {
        return
      }

      const copyMove = new ResourceTransfer(
        this.space,
        selected,
        this.space,
        targetFolder,
        this.$clientService,
        this.$loadingService,
        this.$gettext,
        this.$ngettext
      )
      const movedResources = await copyMove.perform(TransferType.MOVE)
      this.removeResources(movedResources)
      this.resetSelection()
    },

    rowMounted(resource: Resource, component, dimensions) {
      if (!this.displayThumbnails) {
        return
      }

      const loadPreview = async () => {
        const processor =
          this.viewMode === FolderViewModeConstants.name.tiles
            ? ProcessorType.enum.fit
            : ProcessorType.enum.thumbnail

        const preview = await this.$previewService.loadPreview(
          {
            space: this.space,
            resource,
            processor,
            dimensions
          },
          true
        )
        if (preview) {
          this.updateResourceField({ id: resource.id, field: 'thumbnail', value: preview })
        }
      }

      const debounced = debounce(({ unobserve }) => {
        unobserve()
        loadPreview()
      }, 250)

      visibilityObserver.observe(component.$el, { onEnter: debounced, onExit: debounced.cancel })
    }
  }
})
</script>
