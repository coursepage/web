<template>
  <div class="sciencemesh-app">
    <div>
      <div class="oc-flex oc-flex-between">
        <div class="oc-flex oc-flex-middle oc-px-m oc-py-s">
          <oc-icon name="contacts-book" />
          <h2 class="oc-px-s" v-text="$gettext('Federated connections')" />
          <oc-contextual-helper class="oc-pl-xs" v-bind="helperContent" />
        </div>
        <div id="shares-links" class="oc-flex oc-flex-middle oc-mr-m">
          <label class="oc-mr-s" v-text="$gettext('Federated shares:')" />
          <oc-button
            :aria-current="$gettext('Federated shares with me')"
            appearance="raw"
            class="oc-p-s oc-mr-s"
            @click="toSharedWithMe"
          >
            <oc-icon name="share-forward" />
            <span v-text="$gettext('with me')" />
          </oc-button>
          <oc-button
            :aria-current="$gettext('Federated shares with me')"
            appearance="raw"
            class="oc-p-s"
            @click="toSharedWithOthers"
          >
            <oc-icon name="reply" />
            <span v-text="$gettext('with others')" />
          </oc-button>
        </div>
      </div>
      <app-loading-spinner v-if="loading" />
      <template v-else>
        <no-content-message
          v-if="!connections?.length"
          id="accepted-invitations-empty"
          class="files-empty"
          icon="contacts-book"
        >
          <template #message>
            <span v-text="$gettext('You have no sharing connections')" />
          </template>
        </no-content-message>
        <oc-table v-else :fields="fields" :data="connections" :highlighted="highlightedConnections">
          <template #actions="{ item }">
            <oc-button
              appearance="raw"
              class="oc-p-s action-menu-item"
              @click="deleteConnection(item)"
            >
              <oc-icon name="delete-bin-5" fill-type="line" size="medium" />
              <span v-text="$gettext('Delete')" /></oc-button
          ></template>
        </oc-table>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from 'vue'
import {
  NoContentMessage,
  AppLoadingSpinner,
  useRouter,
  useClientService,
  FederatedConnection
} from '@ownclouders/web-pkg'
import { useGettext } from 'vue3-gettext'
import { ShareTypes } from '@ownclouders/web-client/src/helpers'
import { buildConnection } from '../functions'

export default defineComponent({
  components: {
    NoContentMessage,
    AppLoadingSpinner
  },
  props: {
    /**
     * Accepted connections
     */
    connections: {
      type: Array as PropType<FederatedConnection[]>,
      required: true
    },
    /**
     * Highlighted connections
     */
    highlightedConnections: {
      type: Array,
      required: false,
      default: () => []
    },
    /**
     * Loading
     */
    loading: {
      type: Boolean,
      required: false,
      default: () => true
    }
  },
  emits: ['update:connections'],
  setup(props, { emit }) {
    const router = useRouter()
    const { $gettext } = useGettext()
    const clientService = useClientService()

    const fields = computed(() => {
      return [
        {
          name: 'display_name',
          title: $gettext('User'),
          alignH: 'left'
        },
        {
          name: 'mail',
          title: $gettext('Email'),
          alignH: 'right'
        },
        {
          name: 'idp',
          title: $gettext('Institution'),
          alignH: 'right'
        },
        {
          name: 'actions',
          title: $gettext('Actions'),
          type: 'slot',
          alignH: 'right',
          wrap: 'nowrap',
          width: 'shrink'
        }
      ]
    })

    const helperContent = computed(() => {
      return {
        text: $gettext(
          'Federated conections for mutual sharing. To share, go to "Files" app, select the resource click "Share" in the context menu and select account type "federated".'
        )
      }
    })

    const toSharedWithMe = () => {
      router.push({ name: 'files-shares-with-me', query: { q_shareType: ShareTypes.remote.key } })
    }
    const toSharedWithOthers = () => {
      router.push({
        name: 'files-shares-with-others',
        query: { q_shareType: ShareTypes.remote.key }
      })
    }

    const deleteConnection = async (user) => {
      try {
        await clientService.httpAuthenticated.delete('/sciencemesh/delete-accepted-user', {
          params: {
            user_id: user.user_id,
            idp: user.idp
          }
        })

        const updatedConnections = props.connections.filter(
          ({ id }) => id !== buildConnection(user).id
        )

        emit('update:connections', updatedConnections)
      } catch (e) {
        console.error(e)
      }
    }

    return { helperContent, toSharedWithOthers, toSharedWithMe, fields, deleteConnection }
  }
})
</script>

<style lang="scss" scoped>
#accepted-invitations-empty {
  height: 10vh;
}

#shares-links {
  button:hover {
    background-color: var(--oc-color-background-hover);
    border-color: var(--oc-color-background-hover);
  }

  @media (max-width: 850px) {
    visibility: none;
  }
}
</style>
