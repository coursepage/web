import { computed, unref } from 'vue'
import { useFileActionsCreateLink } from '../../../../../src/composables/actions/files/useFileActionsCreateLink'
import { useMessages, useModals, CapabilityStore } from '../../../../../src/composables/piniaStores'
import { defaultComponentMocks, getComposableWrapper } from 'web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Resource } from '@ownclouders/web-client'
import { useCreateLink, useDefaultLinkPermissions } from '../../../../../src/composables/links'
import { SharePermissionBit } from '@ownclouders/web-client/src/helpers'

vi.mock('../../../../../src/composables/links', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useCreateLink: vi.fn(),
  useDefaultLinkPermissions: vi.fn()
}))

describe('useFileActionsCreateLink', () => {
  describe('isVisible property', () => {
    it('should return false if no resource selected', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ space: null, resources: [] })).toBeFalsy()
        }
      })
    })
    it('should return false if one resource can not be shared', () => {
      getWrapper({
        setup: ({ actions }) => {
          const resources = [mock<Resource>({ canShare: () => false })]
          expect(unref(actions)[0].isVisible({ space: null, resources })).toBeFalsy()
        }
      })
    })
    it('should return false if one resource is a disabled project space', () => {
      getWrapper({
        setup: ({ actions }) => {
          const resources = [
            mock<Resource>({ canShare: () => true, disabled: true, driveType: 'project' })
          ]
          expect(unref(actions)[0].isVisible({ space: null, resources })).toBeFalsy()
        }
      })
    })
    it('should return true if all files can be shared', () => {
      getWrapper({
        setup: ({ actions }) => {
          const resources = [
            mock<Resource>({ canShare: () => true }),
            mock<Resource>({ canShare: () => true })
          ]
          expect(unref(actions)[0].isVisible({ space: null, resources })).toBeTruthy()
        }
      })
    })
  })
  describe('handler', () => {
    it('calls the createLink method and shows messages', () => {
      getWrapper({
        setup: async ({ actions }, { mocks }) => {
          // link action
          await unref(actions)[0].handler({ resources: [mock<Resource>({ canShare: () => true })] })
          expect(mocks.createLinkMock).toHaveBeenCalledWith(
            expect.objectContaining({ quicklink: false })
          )
          const { showMessage } = useMessages()
          expect(showMessage).toHaveBeenCalledTimes(1)

          // quick link action
          await unref(actions)[1].handler({ resources: [mock<Resource>({ canShare: () => true })] })
          expect(mocks.createLinkMock).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ quicklink: true })
          )
        }
      })
    })
    it('shows a modal if enforced', () => {
      getWrapper({
        enforceModal: true,
        setup: ({ actions }, { mocks }) => {
          const { dispatchModal } = useModals()
          unref(actions)[0].handler({ resources: [mock<Resource>({ canShare: () => true })] })
          expect(mocks.createLinkMock).not.toHaveBeenCalled()
          expect(dispatchModal).toHaveBeenCalledTimes(1)
        }
      })
    })
    it('shows a modal if password is enforced and link is not internal', () => {
      getWrapper({
        passwordEnforced: true,
        defaultLinkPermissions: SharePermissionBit.Read,
        setup: ({ actions }, { mocks }) => {
          const { dispatchModal } = useModals()
          unref(actions)[0].handler({ resources: [mock<Resource>({ canShare: () => true })] })
          expect(mocks.createLinkMock).not.toHaveBeenCalled()
          expect(dispatchModal).toHaveBeenCalledTimes(1)
        }
      })
    })
    it('calls the onLinkCreatedCallback if given', () => {
      const onLinkCreatedCallback = vi.fn()
      getWrapper({
        onLinkCreatedCallback,
        setup: async ({ actions }) => {
          await unref(actions)[0].handler({ resources: [mock<Resource>({ canShare: () => true })] })
          expect(onLinkCreatedCallback).toHaveBeenCalledTimes(1)
        }
      })
    })
    it('does not show messages if disabled', () => {
      getWrapper({
        showMessages: false,
        setup: async ({ actions }) => {
          await unref(actions)[0].handler({ resources: [mock<Resource>({ canShare: () => true })] })
          const { showMessage } = useMessages()
          expect(showMessage).not.toHaveBeenCalled()
        }
      })
    })
  })
})

function getWrapper({
  setup,
  enforceModal = false,
  passwordEnforced = false,
  defaultLinkPermissions = SharePermissionBit.Read,
  onLinkCreatedCallback = undefined,
  showMessages = true
}) {
  const createLinkMock = vi.fn()
  vi.mocked(useCreateLink).mockReturnValue({ createLink: createLinkMock })
  vi.mocked(useDefaultLinkPermissions).mockReturnValue({
    defaultLinkPermissions: computed(() => defaultLinkPermissions)
  })

  const mocks = { ...defaultComponentMocks(), createLinkMock }
  const capabilities = {
    files_sharing: { public: { password: { enforced_for: { read_only: passwordEnforced } } } }
  } satisfies Partial<CapabilityStore['capabilities']>

  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsCreateLink({
          enforceModal,
          showMessages,
          onLinkCreatedCallback
        })
        setup(instance, { mocks })
      },
      {
        provide: mocks,
        pluginOptions: { piniaOptions: { capabilityState: { capabilities } } }
      }
    )
  }
}
