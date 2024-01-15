import { defineStore } from 'pinia'
import { computed, ref, unref } from 'vue'
import { AppConfigObject, ApplicationInformation, ApplicationFileExtension } from '../../apps'

export const useAppsStore = defineStore('apps', () => {
  const apps = ref<Record<string, ApplicationInformation>>({})
  const externalAppConfig = ref<Record<string, AppConfigObject>>({})
  const fileExtensions = ref<ApplicationFileExtension[]>([])

  const appIds = computed(() => Object.keys(unref(apps)))

  const registerApp = (appInfo: ApplicationInformation) => {
    if (!appInfo.id) {
      return
    }

    if (appInfo.extensions) {
      appInfo.extensions.forEach((extension) => {
        registerFileExtension({ appId: appInfo.id, data: extension })
      })
    }

    unref(apps)[appInfo.id] = {
      applicationMenu: appInfo.applicationMenu || { enabled: () => false },
      defaultExtension: appInfo.defaultExtension || '',
      icon: 'check_box_outline_blank',
      name: appInfo.name || appInfo.id,
      ...appInfo
    }
  }

  const registerFileExtension = ({
    appId,
    data
  }: {
    appId: string
    data: ApplicationFileExtension
  }) => {
    unref(fileExtensions).push({
      app: appId,
      extension: data.extension,
      handler: data.handler,
      label: data.label,
      mimeType: data.mimeType,
      routeName: data.routeName,
      newFileMenu: data.newFileMenu,
      hasPriority:
        data.hasPriority ||
        unref(externalAppConfig)?.[appId]?.priorityExtensions?.includes(data.extension) ||
        false
    })
  }

  const loadExternalAppConfig = ({ appId, config }: { appId: string; config: AppConfigObject }) => {
    externalAppConfig.value = { ...unref(externalAppConfig), [appId]: config }
  }

  return {
    apps,
    externalAppConfig,
    appIds,
    fileExtensions,

    registerApp,
    loadExternalAppConfig
  }
})

export type AppsStore = ReturnType<typeof useAppsStore>
