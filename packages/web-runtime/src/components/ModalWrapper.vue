<template>
  <oc-modal
    v-if="modal"
    :title="modal.title"
    :variation="modal.variation"
    :icon="modal.icon"
    :message="modal.message"
    :has-input="modal.hasInput"
    :input-description="modal.inputDescription"
    :input-error="modal.inputError"
    :input-label="modal.inputLabel"
    :input-selection-range="modal.inputSelectionRange"
    :input-type="modal.inputType"
    :input-value="modal.inputValue"
    :hide-actions="modal.hideActions"
    :hide-confirm-button="modal.hideConfirmButton"
    :button-cancel-text="modal.cancelText"
    :button-confirm-text="modal.confirmText"
    :button-confirm-disabled="modal.confirmDisabled"
    :contextual-helper-label="modal.contextualHelperLabel"
    :contextual-helper-data="modal.contextualHelperData"
    :focus-trap-initial="modal.focusTrapInitial"
    @cancel="onModalCancel"
    @confirm="onModalConfirm"
    @input="onModalInput"
  >
    <template v-if="modal.customComponent" #content>
      <component
        :is="modal.customComponent"
        ref="customComponentRef"
        :modal="modal"
        v-bind="modal.customComponentAttrs?.() || {}"
        @confirm="onModalConfirm"
        @cancel="onModalCancel"
        @update:confirm-disabled="onModalConfirmDisabled"
      />
    </template>
  </oc-modal>
</template>

<script lang="ts">
import { defineComponent, ref, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { useLoadingService, useModals, CustomModalComponentInstance } from '@ownclouders/web-pkg'

export default defineComponent({
  setup() {
    const loadingService = useLoadingService()

    const modalStore = useModals()
    const { activeModal: modal } = storeToRefs(modalStore)
    const { updateModal, removeModal } = modalStore

    const customComponentRef = ref<CustomModalComponentInstance>()

    const onModalConfirm = async (value?: string) => {
      try {
        updateModal(unref(modal)?.id, 'confirmDisabled', true)

        if (unref(modal)?.onConfirm) {
          await loadingService.addTask(() => unref(modal).onConfirm(value))
        } else if (unref(customComponentRef)?.onConfirm) {
          await loadingService.addTask(() => unref(customComponentRef).onConfirm())
        }
      } catch (error) {
        updateModal(unref(modal)?.id, 'confirmDisabled', false)
        return
      }

      removeModal(unref(modal)?.id)
    }

    const onModalCancel = () => {
      if (unref(modal)?.onCancel) {
        unref(modal).onCancel()
      } else if (unref(customComponentRef)?.onCancel) {
        unref(customComponentRef).onCancel()
      }

      removeModal(unref(modal)?.id)
    }

    const onModalInput = (value: string) => {
      if (!unref(modal).onInput) {
        return
      }

      // provide onError callback
      const setError = (error: string) => updateModal(unref(modal).id, 'inputError', error)
      unref(modal).onInput(value, setError)
    }

    const onModalConfirmDisabled = (value: boolean) => {
      updateModal(unref(modal).id, 'confirmDisabled', value)
    }

    return {
      customComponentRef,
      modal,
      onModalConfirm,
      onModalCancel,
      onModalInput,
      onModalConfirmDisabled
    }
  }
})
</script>
