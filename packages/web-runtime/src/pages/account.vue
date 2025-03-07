<template>
  <app-loading-spinner v-if="isLoading" />
  <main v-else id="account" class="oc-height-1-1 oc-m">
    <h1 id="account-page-title" class="oc-page-title oc-m-rm oc-invisible-sr">{{ pageTitle }}</h1>
    <div v-if="showAccountSection">
      <div class="oc-flex oc-flex-between oc-flex-bottom oc-width-1-1">
        <h2 class="oc-text-bold" v-text="$gettext('Account Information')" />
        <oc-button
          v-if="accountEditLink"
          variation="primary"
          type="a"
          :href="accountEditLink.href"
          target="_blank"
          data-testid="account-page-edit-url-btn"
        >
          <oc-icon name="edit" />
          <span v-text="$gettext('Edit')" />
        </oc-button>
      </div>
      <dl class="account-page-info oc-flex oc-flex-wrap">
        <div class="account-page-info-username oc-mb oc-width-1-2@s">
          <dt class="oc-text-normal oc-text-muted" v-text="$gettext('Username')" />
          <dd>
            {{ user.onPremisesSamAccountName }}
          </dd>
        </div>
        <div class="account-page-info-displayname oc-mb oc-width-1-2@s">
          <dt class="oc-text-normal oc-text-muted" v-text="$gettext('First and last name')" />
          <dd>
            {{ user.displayName }}
          </dd>
        </div>
        <div class="account-page-info-email oc-mb oc-width-1-2@s">
          <dt class="oc-text-normal oc-text-muted" v-text="$gettext('Email')" />
          <dd>
            <template v-if="user.mail">{{ user.mail }}</template>
            <span v-else v-text="$gettext('No email has been set up')" />
          </dd>
        </div>
        <div class="account-page-info-groups oc-mb oc-width-1-2@s">
          <dt class="oc-text-normal oc-text-muted" v-text="$gettext('Group memberships')" />
          <dd data-testid="group-names">
            <span v-if="groupNames">{{ groupNames }}</span>
            <span
              v-else
              data-testid="group-names-empty"
              v-text="$gettext('You are not part of any group')"
            />
          </dd>
        </div>
      </dl>
    </div>
    <div>
      <div class="oc-flex oc-width-1-1">
        <h2 class="oc-text-bold" v-text="$gettext('Preferences')" />
      </div>
      <dl class="account-page-preferences oc-flex oc-flex-wrap">
        <div class="account-page-info-language oc-mb oc-width-1-2@s">
          <dt class="oc-text-normal oc-text-muted" v-text="$gettext('Language')" />
          <dd data-testid="language" class="oc-width-1-3">
            <oc-select
              v-if="languageOptions"
              :placeholder="$gettext('Please choose...')"
              :model-value="selectedLanguageValue"
              :clearable="false"
              :options="languageOptions"
              @update:model-value="updateSelectedLanguage"
            />
          </dd>
        </div>
        <div class="account-page-info-theme oc-mb oc-width-1-2@s">
          <dt class="oc-text-normal oc-text-muted" v-text="$gettext('Theme')" />
          <dd data-testid="theme" class="oc-width-1-3">
            <theme-switcher />
          </dd>
        </div>
      </dl>
    </div>
  </main>
</template>

<script lang="ts">
import { storeToRefs } from 'pinia'
import EditPasswordModal from '../components/EditPasswordModal.vue'
import { SettingsBundle, LanguageOption, SettingsValue } from '../helpers/settings'
import { computed, defineComponent, onMounted, unref, ref } from 'vue'
import {
  useAuthStore,
  useCapabilityStore,
  useClientService,
  useConfigStore,
  useMessages,
  useModals,
  useResourcesStore,
  useSpacesStore,
  useUserStore
} from '@ownclouders/web-pkg'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import { setCurrentLanguage } from 'web-runtime/src/helpers/language'
import GdprExport from 'web-runtime/src/components/Account/GdprExport.vue'
import { AppLoadingSpinner } from '@ownclouders/web-pkg'
import { SSEAdapter } from '@ownclouders/web-client/src/sse'
import { supportedLanguages } from '../defaults/languages'
import { User } from '@ownclouders/web-client/src/generated'
import ThemeSwitcher from 'web-runtime/src/components/ThemeSwitcher.vue'

export default defineComponent({
  name: 'AccountPage',
  components: {
    AppLoadingSpinner,
    GdprExport,
    ThemeSwitcher
  },
  setup() {
    const { showMessage, showErrorMessage } = useMessages()
    const userStore = useUserStore()
    const authStore = useAuthStore()
    const language = useGettext()
    const { $gettext } = language
    const clientService = useClientService()
    const resourcesStore = useResourcesStore()

    const valuesList = ref<SettingsValue[]>()
    const graphUser = ref<User>()
    const accountBundle = ref<SettingsBundle>()
    const selectedLanguageValue = ref<LanguageOption>()
    const disableEmailNotificationsValue = ref<boolean>()
    const viewOptionWebDavDetailsValue = ref<boolean>(resourcesStore.areWebDavDetailsShown)
    const { dispatchModal } = useModals()
    const spacesStore = useSpacesStore()
    const capabilityStore = useCapabilityStore()
    const configStore = useConfigStore()

    // FIXME: Use settings service capability when we have it
    const isSettingsServiceSupported = computed(() => !configStore.options.runningOnEos)

    const { user } = storeToRefs(userStore)

    const showGdprExport = computed(() => {
      return (
        authStore.userContextReady &&
        capabilityStore.personalDataExport &&
        spacesStore.personalSpace
      )
    })
    const showChangePassword = computed(() => {
      return authStore.userContextReady && !capabilityStore.graphUsersChangeSelfPasswordDisabled
    })
    const showAccountSection = computed(() => authStore.userContextReady)
    const showWebDavDetails = computed(() => authStore.userContextReady)
    const showNotifications = computed(
      () => authStore.userContextReady && unref(isSettingsServiceSupported)
    )
    const showLogout = computed(() => authStore.userContextReady && configStore.options.logoutUrl)

    const loadValuesListTask = useTask(function* () {
      if (!authStore.userContextReady || !unref(isSettingsServiceSupported)) {
        return
      }

      try {
        const {
          data: { values }
        } = yield clientService.httpAuthenticated.post('/api/v0/settings/values-list', {
          account_uuid: 'me'
        })
        valuesList.value = values || []
      } catch (e) {
        console.error(e)
        showErrorMessage({
          title: $gettext('Unable to load account data…'),
          errors: [e]
        })
        valuesList.value = []
      }
    }).restartable()

    const loadAccountBundleTask = useTask(function* () {
      if (!authStore.userContextReady || !unref(isSettingsServiceSupported)) {
        return
      }

      try {
        const {
          data: { bundles }
        } = yield clientService.httpAuthenticated.post('/api/v0/settings/bundles-list', {})
        accountBundle.value = bundles?.find((b) => b.extension === 'ocis-accounts')
      } catch (e) {
        console.error(e)
        showErrorMessage({
          title: $gettext('Unable to load account data…'),
          errors: [e]
        })
        accountBundle.value = undefined
      }
    }).restartable()

    const loadGraphUserTask = useTask(function* () {
      if (!authStore.userContextReady) {
        return
      }

      try {
        const { data } = yield clientService.graphAuthenticated.users.getMe()
        graphUser.value = data
      } catch (e) {
        console.error(e)
        showErrorMessage({
          title: $gettext('Unable to load account data…'),
          errors: [e]
        })
        graphUser.value = undefined
      }
    }).restartable()

    const isLoading = computed(() => {
      return (
        loadValuesListTask.isRunning ||
        !loadValuesListTask.last ||
        loadAccountBundleTask.isRunning ||
        !loadAccountBundleTask.last ||
        loadGraphUserTask.isRunning ||
        !loadGraphUserTask.last
      )
    })

    const languageOptions = Object.keys(supportedLanguages).map((langCode) => ({
      label: supportedLanguages[langCode],
      value: langCode
    }))

    const groupNames = computed(() => {
      return unref(user)
        .memberOf.map((group) => group.displayName)
        .join(', ')
    })

    const saveValue = async ({
      identifier,
      valueOptions
    }: {
      identifier: string
      valueOptions: Record<string, any>
    }) => {
      const valueId = unref(valuesList)?.find((cV) => cV.identifier.setting === identifier)?.value
        ?.id

      const value = {
        bundleId: unref(accountBundle)?.id,
        settingId: unref(accountBundle)?.settings?.find((s) => s.name === identifier)?.id,
        resource: { type: 'TYPE_USER' },
        accountUuid: 'me',
        ...valueOptions,
        ...(valueId && { id: valueId })
      }

      try {
        await clientService.httpAuthenticated.post('/api/v0/settings/values-save', {
          value: {
            accountUuid: 'me',
            ...value
          }
        })

        /**
         * Edge case: we need to reload the values list to retrieve the valueId if not set,
         * otherwise the backend saves multiple entries
         */
        if (!valueId) {
          loadValuesListTask.perform()
        }

        return value
      } catch (e) {
        throw e
      }
    }

    const updateSelectedLanguage = async (option: LanguageOption) => {
      try {
        selectedLanguageValue.value = option
        setCurrentLanguage({
          language,
          languageSetting: option.value
        })

        if (authStore.userContextReady) {
          await clientService.graphAuthenticated.users.editMe({
            preferredLanguage: option.value
          })

          if (capabilityStore.supportSSE) {
            ;(clientService.sseAuthenticated as SSEAdapter).updateLanguage(language.current)
          }

          if (spacesStore.personalSpace) {
            // update personal space name with new translation
            spacesStore.updateSpaceField({
              id: spacesStore.personalSpace.id,
              field: 'name',
              value: $gettext('Personal')
            })
          }
        }

        showMessage({ title: $gettext('Preference saved.') })
      } catch (e) {
        console.error(e)
        showErrorMessage({
          title: $gettext('Unable to save preference…'),
          errors: [e]
        })
      }
    }

    const updateDisableEmailNotifications = async (option: boolean) => {
      try {
        await saveValue({
          identifier: 'disable-email-notifications',
          valueOptions: { boolValue: !option }
        })
        disableEmailNotificationsValue.value = option
        showMessage({ title: $gettext('Preference saved.') })
      } catch (e) {
        console.error(e)
        showErrorMessage({
          title: $gettext('Unable to save preference…'),
          errors: [e]
        })
      }
    }

    const updateViewOptionsWebDavDetails = (option: boolean) => {
      try {
        resourcesStore.setAreWebDavDetailsShown(option)
        viewOptionWebDavDetailsValue.value = option
        showMessage({ title: $gettext('Preference saved.') })
      } catch (e) {
        console.error(e)
        showErrorMessage({
          title: $gettext('Unable to save preference…'),
          errors: [e]
        })
      }
    }

    onMounted(async () => {
      await loadAccountBundleTask.perform()
      await loadValuesListTask.perform()
      await loadGraphUserTask.perform()

      selectedLanguageValue.value = unref(languageOptions)?.find(
        (languageOption) =>
          languageOption.value === (unref(graphUser)?.preferredLanguage || language.current)
      )

      const disableEmailNotificationsConfiguration = unref(valuesList)?.find(
        (cV) => cV.identifier.setting === 'disable-email-notifications'
      )

      disableEmailNotificationsValue.value = disableEmailNotificationsConfiguration
        ? !disableEmailNotificationsConfiguration.value?.boolValue
        : true
    })

    const showEditPasswordModal = () => {
      dispatchModal({
        title: $gettext('Change password'),
        customComponent: EditPasswordModal
      })
    }

    return {
      clientService,
      languageOptions,
      selectedLanguageValue,
      updateSelectedLanguage,
      updateDisableEmailNotifications,
      updateViewOptionsWebDavDetails,
      accountEditLink: computed(() => configStore.options.accountEditLink),
      showLogout,
      showGdprExport,
      showNotifications,
      showAccountSection,
      showChangePassword,
      showWebDavDetails,
      groupNames,
      user,
      logoutUrl: computed(() => configStore.options.logoutUrl),
      isLoading,
      disableEmailNotificationsValue,
      viewOptionWebDavDetailsValue,
      loadAccountBundleTask,
      loadGraphUserTask,
      loadValuesListTask,
      showEditPasswordModal
    }
  },
  computed: {
    pageTitle() {
      return this.$gettext(this.$route.meta.title as string)
    }
  }
})
</script>
<style lang="scss" scoped>
dd {
  margin-left: 0;
}
main {
  overflow-y: auto;
}
</style>
