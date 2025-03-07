<template>
  <oc-recipient
    :data-testid="`recipient-container-${formattedRecipient.name}`"
    class="files-share-invite-recipient"
    :recipient="formattedRecipient"
  >
    <template #append>
      <oc-button
        class="files-share-invite-recipient-btn-remove"
        appearance="raw"
        :aria-label="btnDeselectRecipientLabel"
        @click.stop="deselect(recipient)"
      >
        <oc-icon name="close" size="small" />
      </oc-button>
    </template>
  </oc-recipient>
</template>

<script lang="ts">
import { avatarUrl } from '../../../../../helpers/user'
import { ShareTypes } from '@ownclouders/web-client/src/helpers/share'
import { defineComponent } from 'vue'
import { Recipient } from 'design-system/src/components/OcRecipient/types'
import { useCapabilityStore, useConfigStore } from '@ownclouders/web-pkg'
import { storeToRefs } from 'pinia'

export default defineComponent({
  props: {
    recipient: {
      type: Object,
      required: true
    },
    deselect: {
      type: Function,
      required: false,
      default: null
    }
  },
  setup() {
    const capabilityStore = useCapabilityStore()
    const capabilityRefs = storeToRefs(capabilityStore)

    const configStore = useConfigStore()
    const { serverUrl } = storeToRefs(configStore)

    return {
      serverUrl,
      userProfilePicture: capabilityRefs.sharingUserProfilePicture
    }
  },
  data(): { formattedRecipient: Recipient } {
    return {
      formattedRecipient: {
        name: this.recipient.label,
        icon: this.getRecipientIcon(),
        hasAvatar: [ShareTypes.user.value, ShareTypes.spaceUser.value].includes(
          this.recipient.value.shareType
        ),
        isLoadingAvatar: true
      }
    }
  },

  computed: {
    btnDeselectRecipientLabel() {
      return this.$gettext('Deselect %{name}', { name: this.recipient.label })
    }
  },

  async created() {
    if (this.userProfilePicture && this.formattedRecipient.hasAvatar) {
      try {
        this.formattedRecipient.avatar = await avatarUrl({
          clientService: this.$clientService,
          server: this.serverUrl,
          username: this.recipient.value.shareWith
        })
      } catch (error) {
        console.error(error)
      }
    }

    this.formattedRecipient.isLoadingAvatar = false
  },

  methods: {
    getRecipientIcon() {
      switch (this.recipient.value.shareType) {
        case ShareTypes.group.value:
          return {
            name: ShareTypes.group.icon,
            label: this.$gettext('Group')
          }

        case ShareTypes.guest.value:
          return {
            name: ShareTypes.guest.icon,
            label: this.$gettext('Guest user')
          }

        case ShareTypes.remote.value:
          return {
            name: ShareTypes.remote.icon,
            label: this.$gettext('Remote user')
          }

        default:
          return {
            name: ShareTypes.user.icon,
            label: this.$gettext('User')
          }
      }
    }
  }
})
</script>

<style lang="scss">
.files-share-invite-recipient {
  margin: 4px 2px 0;
  padding: 0 0.25em;
  overflow-wrap: anywhere;

  .oc-recipient-avatar {
    min-width: 16.8px;
  }
}
</style>
