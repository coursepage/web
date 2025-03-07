<template>
  <div id="oc-files-file-link" class="oc-position-relative">
    <div class="oc-flex">
      <h3 class="oc-text-bold oc-text-medium oc-m-rm" v-text="linksHeading" />
      <oc-contextual-helper v-if="helpersEnabled" class="oc-pl-xs" v-bind="viaLinkHelp" />
    </div>
    <p
      v-if="!canCreateLinks"
      data-testid="files-links-no-reshare-permissions-message"
      class="oc-mt-m"
      v-text="noResharePermsMessage"
    />
    <div v-if="quicklink || canCreateLinks" class="oc-mt-m">
      <name-and-copy v-if="quicklink" :link="quicklink" />
      <create-quick-link
        v-else-if="canCreateLinks"
        :expiration-rules="expirationRules"
        @create-public-link="addNewLink"
      />
      <details-and-edit
        v-if="quicklink"
        :available-role-options="getAvailableRoleOptions(quicklink)"
        :can-rename="false"
        :expiration-rules="expirationRules"
        :is-folder-share="resource.isFolder"
        :is-modifiable="canEditLink(quicklink)"
        :is-password-enforced="isPasswordEnforcedFor(quicklink)"
        :is-password-removable="canDeletePublicLinkPassword(quicklink)"
        :link="quicklink"
        @update-link="checkLinkToUpdate"
        @remove-public-link="deleteLinkConfirmation"
      />
      <hr class="oc-my-m" />
      <oc-button
        v-if="canCreateLinks"
        id="files-file-link-add"
        variation="primary"
        appearance="raw"
        data-testid="files-link-add-btn"
        @click="addNewLink"
      >
        <span v-text="$gettext('Add link')"
      /></oc-button>
    </div>

    <oc-list v-if="directLinks.length" class="oc-overflow-hidden oc-my-m">
      <li
        v-for="link in displayLinks"
        :key="link.key"
        class="oc-py-s"
        :data-testid="`files-link-id-${link.id}`"
      >
        <name-and-copy :link="link" />
        <details-and-edit
          :available-role-options="getAvailableRoleOptions(link)"
          :can-rename="true"
          :expiration-rules="expirationRules"
          :is-folder-share="resource.isFolder"
          :is-modifiable="canEditLink(link)"
          :is-password-enforced="isPasswordEnforcedFor(link)"
          :is-password-removable="canDeletePublicLinkPassword(link)"
          :link="link"
          @update-link="checkLinkToUpdate"
          @remove-public-link="deleteLinkConfirmation"
        />
      </li>
    </oc-list>
    <div v-if="directLinks.length > 3" class="oc-flex oc-flex-center">
      <oc-button appearance="raw" @click="toggleLinkListCollapsed">
        <span v-text="collapseButtonTitle" />
        <oc-icon :name="collapseButtonIcon" fill-type="line" />
      </oc-button>
    </div>
    <div v-if="indirectLinks.length" id="indirect-link-list">
      <hr class="oc-my-m" />
      <div class="oc-flex">
        <h3 class="oc-text-bold oc-m-rm oc-text-medium">
          <span v-text="indirectLinksHeading" />
        </h3>
        <oc-contextual-helper v-if="helpersEnabled" class="oc-pl-xs" v-bind="indirectLinkHelp" />
      </div>
      <oc-list v-if="!indirectLinkListCollapsed" class="oc-overflow-hidden oc-my-m">
        <li
          v-for="link in displayIndirectLinks"
          :key="link.key"
          class="oc-py-s"
          :data-testid="`files-link-id-${link.id}`"
        >
          <name-and-copy :link="link" />
          <details-and-edit
            :available-role-options="getAvailableRoleOptions(link)"
            :expiration-rules="expirationRules"
            :is-folder-share="true"
            :is-modifiable="false"
            :link="link"
          />
        </li>
      </oc-list>
      <div class="oc-flex oc-flex-center">
        <oc-button
          id="indirect-link-list-toggle"
          appearance="raw"
          @click="toggleIndirectLinkListCollapsed"
        >
          <span v-text="indirectCollapseButtonTitle" />
          <oc-icon :name="indirectCollapseButtonIcon" fill-type="line" />
        </oc-button>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { computed, defineComponent, inject, ref, Ref, unref } from 'vue'
import { DateTime } from 'luxon'
import {
  useAbility,
  useExpirationRules,
  useDefaultLinkPermissions,
  useFileActionsCreateLink,
  FileAction,
  useClientService,
  useModals,
  useUserStore,
  useMessages,
  useCapabilityStore,
  useConfigStore,
  useResourcesStore
} from '@ownclouders/web-pkg'
import { shareViaLinkHelp, shareViaIndirectLinkHelp } from '../../../helpers/contextualHelpers'
import {
  linkRoleContributorFolder,
  linkRoleEditorFolder,
  linkRoleUploaderFolder,
  linkRoleViewerFolder,
  LinkShareRoles,
  Share,
  SharePermissions
} from '@ownclouders/web-client/src/helpers/share'
import DetailsAndEdit from './Links/DetailsAndEdit.vue'
import NameAndCopy from './Links/NameAndCopy.vue'
import CreateQuickLink from './Links/CreateQuickLink.vue'
import SetLinkPasswordModal from '../../Modals/SetLinkPasswordModal.vue'
import { getLocaleFromLanguage } from '@ownclouders/web-pkg'
import {
  Resource,
  SpaceResource,
  isProjectSpaceResource,
  isShareSpaceResource
} from '@ownclouders/web-client/src/helpers'
import { isLocationSharesActive, useSharesStore } from '@ownclouders/web-pkg'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'

export default defineComponent({
  name: 'FileLinks',
  components: {
    CreateQuickLink,
    DetailsAndEdit,
    NameAndCopy
  },
  setup() {
    const { showMessage, showErrorMessage } = useMessages()
    const userStore = useUserStore()
    const { $gettext } = useGettext()
    const ability = useAbility()
    const clientService = useClientService()
    const { can } = ability
    const { expirationRules } = useExpirationRules()
    const capabilityStore = useCapabilityStore()
    const capabilityRefs = storeToRefs(capabilityStore)
    const { defaultLinkPermissions } = useDefaultLinkPermissions()
    const { dispatchModal } = useModals()
    const { removeResources } = useResourcesStore()

    const sharesStore = useSharesStore()
    const { updateLink, deleteLink } = sharesStore
    const { outgoingLinks } = storeToRefs(sharesStore)

    const configStore = useConfigStore()
    const { options: configOptions } = storeToRefs(configStore)

    const { actions: createLinkActions } = useFileActionsCreateLink()
    const createLinkAction = computed<FileAction>(() =>
      unref(createLinkActions).find(({ name }) => name === 'create-links')
    )
    const createQuicklinkAction = computed<FileAction>(() =>
      unref(createLinkActions).find(({ name }) => name === 'create-quick-links')
    )

    const space = inject<Ref<SpaceResource>>('space')
    const resource = inject<Ref<Resource>>('resource')

    const initialLinkListCollapsed = !configStore.options.sidebar.shares.showAllOnLoad
    const linkListCollapsed = ref(initialLinkListCollapsed)
    const indirectLinkListCollapsed = ref(initialLinkListCollapsed)
    const directLinks = computed(() =>
      unref(outgoingLinks)
        .filter((l) => !l.indirect && !l.quicklink)
        .sort((a: any, b: any) => b.stime - a.stime)
        .map((share) => {
          return { ...share, key: 'direct-link-' + share.id }
        })
    )
    const indirectLinks = computed(() =>
      unref(outgoingLinks)
        .filter((l) => l.indirect)
        .sort((a: any, b: any) => b.stime - a.stime)
        .map((share) => {
          return { ...share, key: 'indirect-link-' + share.id }
        })
    )
    const canCreatePublicLinks = computed(() => can('create-all', 'PublicLink'))

    const canDeleteReadOnlyPublicLinkPassword = computed(() =>
      can('delete-all', 'ReadOnlyPublicLinkPassword')
    )

    const canCreateLinks = computed(() => {
      if (unref(resource).isReceivedShare() && !capabilityStore.sharingResharing) {
        return false
      }

      const isSharedResource = isShareSpaceResource(unref(space))
      if (isSharedResource && !capabilityStore.sharingResharing) {
        return false
      }

      if (isProjectSpaceResource(unref(resource)) && unref(resource).disabled) {
        return false
      }

      return unref(resource).canShare({ user: userStore.user, ability })
    })

    const canEditLink = ({ permissions }: Share) => {
      return (
        unref(canCreateLinks) &&
        (can('create-all', 'PublicLink') || permissions === SharePermissions.internal.bit)
      )
    }

    const addNewLink = ({ link }) => {
      const handlerArgs = { space: unref(space), resources: [unref(resource)] }
      if (link?.quicklink) {
        return unref(createQuicklinkAction)?.handler(handlerArgs)
      }

      return unref(createLinkAction)?.handler(handlerArgs)
    }

    const updatePublicLink = async ({ params }) => {
      try {
        await updateLink({ id: params.id, clientService, params })
        showMessage({ title: $gettext('Link was updated successfully') })
      } catch (e) {
        showErrorMessage({
          title: $gettext('Failed to update link'),
          errors: [e]
        })
      }
    }

    const showPasswordModal = (params) => {
      dispatchModal({
        title: $gettext('Set password'),
        customComponent: SetLinkPasswordModal,
        customComponentAttrs: () => ({ link: params })
      })
    }

    return {
      ability,
      space,
      resource,
      incomingParentShare: inject<Share>('incomingParentShare'),
      hasPublicLinkEditing: capabilityRefs.sharingPublicCanEdit,
      hasPublicLinkContribute: capabilityRefs.sharingPublicCanContribute,
      hasPublicLinkAliasSupport: capabilityRefs.sharingPublicAlias,
      passwordEnforced: capabilityRefs.sharingPublicPasswordEnforcedFor,
      indirectLinkListCollapsed,
      linkListCollapsed,
      outgoingLinks,
      directLinks,
      indirectLinks,
      deleteLink,
      canCreatePublicLinks,
      canDeleteReadOnlyPublicLinkPassword,
      configStore,
      configOptions,
      canCreateLinks,
      canEditLink,
      expirationRules,
      updatePublicLink,
      showPasswordModal,
      defaultLinkPermissions,
      addNewLink,
      dispatchModal,
      showMessage,
      showErrorMessage,
      removeResources
    }
  },
  computed: {
    collapseButtonTitle() {
      return this.linkListCollapsed ? this.$gettext('Show all') : this.$gettext('Show less')
    },
    collapseButtonIcon() {
      return this.linkListCollapsed ? 'arrow-down-s' : 'arrow-up-s'
    },
    indirectCollapseButtonTitle() {
      return this.indirectLinkListCollapsed ? this.$gettext('Show') : this.$gettext('Hide')
    },
    indirectCollapseButtonIcon() {
      return this.indirectLinkListCollapsed ? 'arrow-down-s' : 'arrow-up-s'
    },

    quicklink() {
      return this.outgoingLinks.find((link) => link.quicklink === true && !link.indirect)
    },

    helpersEnabled() {
      return this.configOptions.contextHelpers
    },

    viaLinkHelp() {
      return shareViaLinkHelp({ configStore: this.configStore })
    },
    indirectLinkHelp() {
      return shareViaIndirectLinkHelp({ configStore: this.configStore })
    },
    noResharePermsMessage() {
      return this.$gettext('You do not have permission to create links')
    },

    linksHeading() {
      return this.$gettext('Share via link')
    },

    indirectLinksHeading() {
      return this.$gettext('Indirect links (%{ count })', {
        count: this.indirectLinks.length.toString()
      })
    },

    displayLinks() {
      if (this.directLinks.length > 3 && this.linkListCollapsed) {
        return this.directLinks.slice(0, 3)
      }
      return this.directLinks
    },

    displayIndirectLinks() {
      if (this.indirectLinkListCollapsed) {
        return []
      }
      return this.indirectLinks
    },

    resourceIsSpace() {
      return this.resource.type === 'space'
    },

    currentStorageId() {
      if (this.resourceIsSpace) {
        return this.resource.id
      }

      if (this.space) {
        return this.space.id
      }

      return null
    }
  },
  methods: {
    toggleLinkListCollapsed() {
      this.linkListCollapsed = !this.linkListCollapsed
    },

    toggleIndirectLinkListCollapsed() {
      this.indirectLinkListCollapsed = !this.indirectLinkListCollapsed
    },

    isPasswordEnforcedFor(link) {
      const isFolder = link.indirect || this.resource.isFolder
      const currentRole = LinkShareRoles.getByBitmask(parseInt(link.permissions), isFolder)

      /**
       * `passwordEnforced` members are oddly designed. they look like they map to permissions,
       * but in reality they map to role names. hence the comparison with specific link roles.
       *
       * comparisons are happening based on role names because file-roles and folder-roles share the same name.
       */
      return (
        (this.passwordEnforced.read_only === true &&
          currentRole.name === linkRoleViewerFolder.name) ||
        (this.passwordEnforced.upload_only === true &&
          currentRole.name === linkRoleUploaderFolder.name) ||
        (this.passwordEnforced.read_write === true &&
          currentRole.name === linkRoleContributorFolder.name) ||
        (this.passwordEnforced.read_write_delete === true &&
          currentRole.name === linkRoleEditorFolder.name)
      )
    },

    canDeletePublicLinkPassword(link) {
      const isFolder = link.indirect || this.resource.isFolder
      const isPasswordEnforced = this.isPasswordEnforcedFor(link)

      if (!isPasswordEnforced) {
        return true
      }

      const currentRole = LinkShareRoles.getByBitmask(parseInt(link.permissions), isFolder)

      return (
        currentRole.name === linkRoleViewerFolder.name && this.canDeleteReadOnlyPublicLinkPassword
      )
    },

    checkLinkToUpdate({ link }) {
      let params = this.getParamsForLink(link)
      if (link.permissions === 0) {
        params = {
          ...params,
          password: '',
          expireDate: ''
        }
      }

      if (!link.password && !this.canDeletePublicLinkPassword(link)) {
        this.showPasswordModal(params)
      } else {
        this.updatePublicLink({ params })
      }
    },

    getParamsForLink(link) {
      let expireDate = ''

      if (link.expiration) {
        expireDate = (
          typeof link.expiration === 'string'
            ? DateTime.fromISO(link.expiration)
            : DateTime.fromJSDate(link.expiration)
        )
          .setLocale(getLocaleFromLanguage(this.$language.current))
          .endOf('day')
          .toFormat("yyyy-MM-dd'T'HH:mm:ssZZZ")
      }

      let password

      switch (link.password) {
        // no password
        case false:
          password = undefined
          break
        // delete password
        case '':
          password = ''
          break
        // existing password
        case true:
          password = undefined
          break
        // adding/editing password
        default:
          password = link.password
          break
      }

      return {
        expireDate,
        password,
        id: link.id,
        permissions: link.permissions.toString(),
        quicklink: link.quicklink,
        name: link.name,
        spaceRef: this.resource.fileId,
        notifyUploads: link.notifyUploads,
        notifyUploadsExtraRecipients: link.notifyUploadsExtraRecipients,
        ...(this.currentStorageId && {
          storageId: this.currentStorageId
        })
      }
    },

    deleteLinkConfirmation({ link }) {
      this.dispatchModal({
        variation: 'danger',
        title: this.$gettext('Delete link'),
        message: this.$gettext(
          'Are you sure you want to delete this link? Recreating the same link again is not possible.'
        ),
        confirmText: this.$gettext('Delete'),
        onConfirm: () =>
          this.removeLink({
            clientService: this.$clientService,
            share: link,
            resource: this.resource
          })
      })
    },

    async removeLink({ clientService, share, resource }) {
      let path = resource.path
      // sharing a share root from the share jail -> use resource name as path
      if (path === '/') {
        path = `/${resource.name}`
      }

      let lastLinkId = this.outgoingLinks.length === 1 ? this.outgoingLinks[0].id : undefined
      const loadIndicators = this.outgoingLinks.filter((l) => !l.indirect).length === 1

      try {
        await this.deleteLink({
          clientService,
          share,
          path,
          loadIndicators
        })
        this.showMessage({
          title: this.$gettext('Link was deleted successfully')
        })

        if (lastLinkId && isLocationSharesActive(this.$router, 'files-shares-via-link')) {
          if (this.resourceIsSpace) {
            // spaces need their actual id instead of their share id to be removed from the file list
            lastLinkId = this.resource.id.toString()
          }
          this.removeResources([{ id: lastLinkId }] as Resource[])
        }
      } catch (e) {
        console.error(e)
        this.showErrorMessage({
          title: this.$gettext('Failed to delete link'),
          errors: [e]
        })
      }
    },

    getAvailableRoleOptions(link) {
      if (this.incomingParentShare && this.canCreateLinks) {
        return LinkShareRoles.filterByBitmask(
          this.incomingParentShare.permissions,
          this.resource.isFolder,
          this.hasPublicLinkEditing,
          this.hasPublicLinkContribute,
          this.hasPublicLinkAliasSupport,
          this.canCreatePublicLinks
        )
      }

      return LinkShareRoles.list(
        this.resource.isFolder,
        this.hasPublicLinkEditing,
        this.hasPublicLinkContribute,
        this.hasPublicLinkAliasSupport,
        this.canCreatePublicLinks
      )
    }
  }
})
</script>
<style lang="scss">
#oc-files-file-link,
#oc-files-sharing-sidebar {
  border-radius: 5px;
}

.link-name-container {
  background-color: var(--oc-color-input-bg);
  border: 1px solid var(--oc-color-input-border);
  border-radius: 5px;
}
</style>
