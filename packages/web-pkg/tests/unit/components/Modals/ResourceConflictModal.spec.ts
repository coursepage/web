import ResourceConflictModal from '../../../../src/components/Modals/ResourceConflictModal.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from 'web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Resource } from '@ownclouders/web-client'
import { ResolveStrategy } from '../../../../src/helpers/resource'
import { Modal } from '../../../../src/composables/piniaStores'

describe('ResourceConflictModal', () => {
  describe('checkbox', () => {
    it('renders if more than one conflict given', () => {
      const { wrapper } = getWrapper({ props: { conflictCount: 2 } })
      expect(wrapper.find('oc-checkbox-stub').exists()).toBeTruthy()
    })
    it('does not render if one conflict given', () => {
      const { wrapper } = getWrapper({ props: { conflictCount: 1 } })
      expect(wrapper.find('oc-checkbox-stub').exists()).toBeFalsy()
    })
  })
  describe('onConfirm', () => {
    it('should call the callback', async () => {
      const callbackFn = vi.fn()
      const { wrapper } = getWrapper({ props: { callbackFn } })
      await wrapper.vm.onConfirm()
      expect(callbackFn).toHaveBeenCalledWith({
        strategy: ResolveStrategy.KEEP_BOTH,
        doForAllConflicts: false
      })
    })
  })
  describe('onConfirmSecondary', () => {
    it('should call the callback with merge strategy if merge suggested', async () => {
      const callbackFn = vi.fn()
      const { wrapper } = getWrapper({ props: { callbackFn, suggestMerge: true } })
      await wrapper.vm.onConfirmSecondary()
      expect(callbackFn).toHaveBeenCalledWith({
        strategy: ResolveStrategy.MERGE,
        doForAllConflicts: false
      })
    })
    it('should call the callback with replace strategy if merge not suggested', async () => {
      const callbackFn = vi.fn()
      const { wrapper } = getWrapper({ props: { callbackFn, suggestMerge: false } })
      await wrapper.vm.onConfirmSecondary()
      expect(callbackFn).toHaveBeenCalledWith({
        strategy: ResolveStrategy.REPLACE,
        doForAllConflicts: false
      })
    })
  })
  describe('onCancel', () => {
    it('should call the callback', async () => {
      const callbackFn = vi.fn()
      const { wrapper } = getWrapper({ props: { callbackFn } })
      await wrapper.vm.onCancel()
      expect(callbackFn).toHaveBeenCalledWith({
        strategy: ResolveStrategy.SKIP,
        doForAllConflicts: false
      })
    })
  })
})

function getWrapper({ props = {} } = {}) {
  const mocks = defaultComponentMocks()

  return {
    mocks,
    wrapper: shallowMount(ResourceConflictModal, {
      props: {
        modal: mock<Modal>(),
        resource: mock<Resource>(),
        conflictCount: 1,
        callbackFn: () => ({}),
        ...props
      },
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks
      }
    })
  }
}
