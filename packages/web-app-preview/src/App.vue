<template>
  <app-banner :file-id="fileId"></app-banner>
  <main
    id="preview"
    ref="preview"
    class="oc-width-1-1"
    tabindex="-1"
    @keydown.left="prev"
    @keydown.right="next"
    @keydown.esc="closeApp"
  >
    <h1 class="oc-invisible-sr" v-text="pageTitle" />
    <app-top-bar
      v-if="!isFileContentError"
      :resource="activeFilteredFile"
      :main-actions="fileActions"
      @close="closeApp"
    />

    <div class="oc-flex oc-width-1-1 oc-height-1-1">
      <div
        v-if="isFolderLoading || isFileContentLoading"
        class="oc-width-1-1"
        :class="{ 'preview-sidebar-open': isSideBarOpen }"
      >
        <div class="oc-position-center">
          <oc-spinner :aria-label="$gettext('Loading media file')" size="xlarge" />
        </div>
      </div>
      <oc-icon
        v-else-if="isFileContentError"
        name="file-damage"
        variation="danger"
        size="xlarge"
        class="oc-position-center"
        :class="{ 'preview-sidebar-open': isSideBarOpen }"
        :accessible-label="$gettext('Failed to load media file')"
      />
      <div
        v-else
        class="oc-flex oc-width-1-1 oc-height-1-1"
        :class="{ 'preview-sidebar-open': isSideBarOpen }"
      >
        <div class="stage" :class="{ lightbox: isFullScreenModeActivated }">
          <div v-show="activeMediaFileCached" class="stage_media">
            <media-image
              v-if="activeMediaFileCached.isImage"
              :file="activeMediaFileCached"
              :current-image-rotation="currentImageRotation"
              :current-image-zoom="currentImageZoom"
              :current-image-position-x="currentImagePositionX"
              :current-image-position-y="currentImagePositionY"
              @pan-zoom-change="onPanZoomChanged"
            />
            <media-video
              v-else-if="activeMediaFileCached.isVideo"
              :file="activeMediaFileCached"
              :is-auto-play-enabled="isAutoPlayEnabled"
            />
            <media-audio
              v-else-if="activeMediaFileCached.isAudio"
              :file="activeMediaFileCached"
              :is-auto-play-enabled="isAutoPlayEnabled"
            />
          </div>
          <media-controls
            class="stage_controls"
            :files="filteredFiles"
            :active-index="activeIndex"
            :is-full-screen-mode-activated="isFullScreenModeActivated"
            :is-folder-loading="isFolderLoading"
            :is-image="activeMediaFileCached?.isImage"
            :current-image-rotation="currentImageRotation"
            :current-image-zoom="currentImageZoom"
            @set-rotation="currentImageRotation = $event"
            @set-zoom="currentImageZoom = $event"
            @reset-image="resetImage"
            @toggle-full-screen="toggleFullscreenMode"
            @toggle-previous="prev"
            @toggle-next="next"
          />
        </div>
      </div>
      <file-side-bar :is-open="isSideBarOpen" :active-panel="sideBarActivePanel" :space="space" />
    </div>
  </main>
</template>
<script lang="ts">
import { computed, defineComponent, ref, unref } from 'vue'
import { RouteLocationRaw } from 'vue-router'
import { Resource } from '@ownclouders/web-client/src'
import {
  AppTopBar,
  FileSideBar,
  ProcessorType,
  useAppsStore,
  useSelectedResources,
  useSideBar
} from '@ownclouders/web-pkg'
import {
  queryItemAsString,
  sortHelper,
  useAppDefaults,
  useRoute,
  useRouteQuery,
  useRouter
} from '@ownclouders/web-pkg'
import { Action, ActionOptions } from '@ownclouders/web-pkg'
import { useDownloadFile } from '@ownclouders/web-pkg'
import { createFileRouteOptions } from '@ownclouders/web-pkg'
import MediaControls from './components/MediaControls.vue'
import MediaAudio from './components/Sources/MediaAudio.vue'
import MediaImage from './components/Sources/MediaImage.vue'
import MediaVideo from './components/Sources/MediaVideo.vue'
import { CachedFile } from './helpers/types'
import AppBanner from '@ownclouders/web-pkg/src/components/AppBanner.vue'
import { watch } from 'vue'
import { getCurrentInstance } from 'vue'
import { getMimeTypes } from './mimeTypes'
import { PanzoomEventDetail } from '@panzoom/panzoom'

export const appId = 'preview'

export default defineComponent({
  name: 'Preview',
  components: {
    AppBanner,
    AppTopBar,
    FileSideBar,
    MediaControls,
    MediaAudio,
    MediaImage,
    MediaVideo
  },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const appsStore = useAppsStore()
    const appDefaults = useAppDefaults({ applicationId: 'preview' })
    const contextRouteQuery = useRouteQuery('contextRouteQuery')
    const { downloadFile } = useDownloadFile()

    const activeIndex = ref()
    const cachedFiles = ref<CachedFile[]>([])
    const folderLoaded = ref(false)
    const isFileContentError = ref(false)
    const isAutoPlayEnabled = ref(true)
    const toPreloadImageIds = ref([])
    const currentImageZoom = ref(1)
    const currentImageRotation = ref(0)
    const currentImagePositionX = ref(0)
    const currentImagePositionY = ref(0)
    const preloadImageCount = ref(10)

    const mimeTypes = computed(() => {
      return getMimeTypes(appsStore.externalAppConfig[appId]?.mimeTypes)
    })

    const sortBy = computed(() => {
      if (!unref(contextRouteQuery)) {
        return 'name'
      }
      return unref(contextRouteQuery)['sort-by'] ?? 'name'
    })
    const sortDir = computed(() => {
      if (!unref(contextRouteQuery)) {
        return 'desc'
      }
      return unref(contextRouteQuery)['sort-dir'] ?? 'asc'
    })

    const { activeFiles, currentFileContext, closed } = appDefaults

    const isFullScreenModeActivated = ref(false)
    const toggleFullscreenMode = () => {
      const activateFullscreen = !unref(isFullScreenModeActivated)
      isFullScreenModeActivated.value = activateFullscreen
      if (activateFullscreen) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen()
        }
      }
    }

    const onPanZoomChanged = ({ detail }: { detail: PanzoomEventDetail }) => {
      currentImagePositionX.value = detail.x
      currentImagePositionY.value = detail.y
    }

    const resetImage = () => {
      currentImageZoom.value = 1
      currentImageRotation.value = 0
      currentImagePositionX.value = 0
      currentImagePositionY.value = 0
    }

    const filteredFiles = computed<Resource[]>(() => {
      if (!unref(activeFiles)) {
        return []
      }

      const files = unref(activeFiles).filter((file) => {
        return unref(mimeTypes).includes(file.mimeType?.toLowerCase())
      })

      return sortHelper(files, [{ name: unref(sortBy) }], unref(sortBy), unref(sortDir))
    })
    const activeFilteredFile = computed(() => {
      return unref(filteredFiles)[unref(activeIndex)]
    })
    const activeMediaFileCached = computed(() => {
      return unref(cachedFiles).find((i) => i.id === unref(activeFilteredFile)?.id)
    })

    const updateLocalHistory = () => {
      // this is a rare edge case when browsing quickly through a lot of files
      // we workaround context being null, when useDriveResolver is in loading state
      if (!unref(currentFileContext)) {
        return
      }

      const { params, query } = createFileRouteOptions(
        unref(unref(currentFileContext).space),
        unref(activeFilteredFile)
      )
      router.replace({
        ...unref(route),
        params: { ...unref(route).params, ...params },
        query: { ...unref(route).query, ...query }
      })
    }
    const isFileContentLoading = ref(true)

    const triggerActiveFileDownload = () => {
      if (isFileContentLoading.value) {
        return
      }
      downloadFile(activeFilteredFile.value)
    }

    const fileActions: Action<ActionOptions>[] = [
      {
        name: 'download-file',
        isVisible: () => true,
        componentType: 'button',
        icon: 'file-download',
        id: 'preview-download',
        label: () => 'Download',
        handler: () => {
          triggerActiveFileDownload()
        }
      }
    ]

    const instance = getCurrentInstance() as any
    watch(
      currentFileContext,
      async () => {
        if (!unref(currentFileContext) || unref(closed)) {
          return
        }

        if (!unref(folderLoaded)) {
          await appDefaults.loadFolderForFileContext(unref(currentFileContext))
          folderLoaded.value = true
        }

        instance.proxy.setActiveFile(unref(unref(currentFileContext).driveAliasAndItem))
      },
      { immediate: true }
    )

    const fileId = computed(() => unref(unref(currentFileContext).itemId))
    const space = computed(() => unref(unref(currentFileContext).space))
    const { selectedResources } = useSelectedResources()
    watch(activeFilteredFile, (file) => {
      selectedResources.value = [file]
    })

    return {
      ...useSideBar(),
      ...appDefaults,
      activeFilteredFile,
      activeIndex,
      activeMediaFileCached,
      cachedFiles,
      filteredFiles,
      fileActions,
      isFileContentLoading,
      isFullScreenModeActivated,
      toggleFullscreenMode,
      updateLocalHistory,
      fileId,
      space,
      resetImage,
      isFileContentError,
      isAutoPlayEnabled,
      toPreloadImageIds,
      currentImageZoom,
      currentImageRotation,
      currentImagePositionX,
      currentImagePositionY,
      onPanZoomChanged,
      preloadImageCount
    }
  },
  computed: {
    pageTitle() {
      return this.$gettext('Preview for %{currentMediumName}', {
        currentMediumName: this.activeFilteredFile?.name
      })
    },
    thumbDimensions() {
      switch (true) {
        case window.innerWidth <= 1024:
          return 1024
        case window.innerWidth <= 1280:
          return 1280
        case window.innerWidth <= 1920:
          return 1920
        case window.innerWidth <= 2160:
          return 2160
        default:
          return 3840
      }
    },
    isActiveFileTypeImage() {
      return !this.isActiveFileTypeAudio && !this.isActiveFileTypeVideo
    },
    isActiveFileTypeAudio() {
      return this.isFileTypeAudio(this.activeFilteredFile)
    },
    isActiveFileTypeVideo() {
      return this.isFileTypeVideo(this.activeFilteredFile)
    }
  },

  watch: {
    activeIndex(newValue, oldValue) {
      if (newValue !== oldValue) {
        this.loadMedium()
        this.preloadImages()
      }

      if (oldValue !== null) {
        this.isAutoPlayEnabled = false
      }

      this.currentImageZoom = 1
      this.currentImageRotation = 0
    }
  },

  mounted() {
    // keep a local history for this component
    window.addEventListener('popstate', this.handleLocalHistoryEvent)
    document.addEventListener('fullscreenchange', this.handleFullScreenChangeEvent)
    ;(this.$refs.preview as HTMLElement).focus()
  },

  beforeUnmount() {
    window.removeEventListener('popstate', this.handleLocalHistoryEvent)
    document.removeEventListener('fullscreenchange', this.handleFullScreenChangeEvent)

    this.cachedFiles.forEach((medium) => {
      this.revokeUrl(medium.url)
    })
  },

  methods: {
    setActiveFile(driveAliasAndItem: string) {
      for (let i = 0; i < this.filteredFiles.length; i++) {
        if (
          unref(this.currentFileContext.space)?.getDriveAliasAndItem(this.filteredFiles[i]) ===
          driveAliasAndItem
        ) {
          this.activeIndex = i
          return
        }
      }

      this.isFileContentLoading = false
      this.isFileContentError = true
    },
    // react to PopStateEvent ()
    handleLocalHistoryEvent() {
      const result = this.$router.resolve(document.location as unknown as RouteLocationRaw)
      this.setActiveFile(queryItemAsString(result.params.driveAliasAndItem))
    },
    handleFullScreenChangeEvent() {
      if (document.fullscreenElement === null) {
        this.isFullScreenModeActivated = false
      }
    },
    loadMedium() {
      if (this.activeMediaFileCached) {
        return
      }

      this.loadActiveFileIntoCache()
    },
    async loadActiveFileIntoCache() {
      this.isFileContentLoading = true

      try {
        const loadRawFile = !this.isActiveFileTypeImage
        let mediaUrl
        if (loadRawFile) {
          mediaUrl = await this.getUrlForResource(
            unref(this.currentFileContext.space),
            this.activeFilteredFile
          )
        } else {
          mediaUrl = await this.loadPreview(this.activeFilteredFile)
        }

        this.addPreviewToCache(this.activeFilteredFile, mediaUrl)
        this.isFileContentLoading = false
        this.isFileContentError = false
      } catch (e) {
        this.isFileContentLoading = false
        this.isFileContentError = true
        console.error(e)
      }
    },
    next() {
      if (this.isFileContentLoading) {
        return
      }
      this.isFileContentError = false
      if (this.activeIndex + 1 >= this.filteredFiles.length) {
        this.activeIndex = 0
        this.updateLocalHistory()
        return
      }
      this.activeIndex++
      this.updateLocalHistory()
    },
    prev() {
      if (this.isFileContentLoading) {
        return
      }
      this.isFileContentError = false
      if (this.activeIndex === 0) {
        this.activeIndex = this.filteredFiles.length - 1
        this.updateLocalHistory()
        return
      }
      this.activeIndex--
      this.updateLocalHistory()
    },
    isFileTypeImage(file) {
      return !this.isFileTypeAudio(file) && !this.isFileTypeVideo(file)
    },
    isFileTypeAudio(file) {
      return file.mimeType.toLowerCase().startsWith('audio')
    },

    isFileTypeVideo(file) {
      return file.mimeType.toLowerCase().startsWith('video')
    },
    addPreviewToCache(file, url) {
      this.cachedFiles.push({
        id: file.id,
        name: file.name,
        url,
        ext: file.extension,
        mimeType: file.mimeType,
        isVideo: this.isFileTypeVideo(file),
        isImage: this.isFileTypeImage(file),
        isAudio: this.isFileTypeAudio(file)
      })
    },
    loadPreview(file) {
      return this.$previewService.loadPreview({
        space: unref(this.currentFileContext.space),
        resource: file,
        dimensions: [this.thumbDimensions, this.thumbDimensions] as [number, number],
        processor: ProcessorType.enum.fit
      })
    },
    preloadImages() {
      const loadPreviewAsync = (file) => {
        this.toPreloadImageIds.push(file.id)
        this.loadPreview(file)

          .then((mediaUrl) => {
            this.addPreviewToCache(file, mediaUrl)
          })
          .catch((e) => {
            console.error(e)
            this.toPreloadImageIds = this.toPreloadImageIds.filter((fileId) => fileId !== file.id)
          })
      }

      const preloadFile = (preloadFileIndex) => {
        let cycleIndex =
          (((this.activeIndex + preloadFileIndex) % this.filteredFiles.length) +
            this.filteredFiles.length) %
          this.filteredFiles.length

        const file = this.filteredFiles[cycleIndex]

        if (!this.isFileTypeImage(file) || this.toPreloadImageIds.includes(file.id)) {
          return
        }

        loadPreviewAsync(file)
      }

      for (
        let followingFileIndex = 1;
        followingFileIndex <= this.preloadImageCount;
        followingFileIndex++
      ) {
        preloadFile(followingFileIndex)
      }

      for (
        let previousFileIndex = -1;
        previousFileIndex >= this.preloadImageCount * -1;
        previousFileIndex--
      ) {
        preloadFile(previousFileIndex)
      }
    }
  }
})
</script>

<style lang="scss" scoped>
.stage {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  text-align: center;

  &_media {
    flex-grow: 1;
    overflow: hidden;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &_controls {
    height: auto;
    margin: 10px auto;
  }
}

@media (max-width: $oc-breakpoint-medium-default) {
  .preview-sidebar-open {
    display: none;
  }
}
</style>
