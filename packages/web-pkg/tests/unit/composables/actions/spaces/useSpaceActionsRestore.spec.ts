import { useSpaceActionsRestore } from '../../../../../src/composables/actions/spaces'
import { buildSpace, SpaceResource } from '@ownclouders/web-client/src/helpers'
import { mock } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  mockAxiosResolve,
  RouteLocation,
  getComposableWrapper
} from 'web-test-helpers'
import { unref } from 'vue'
import { Drive } from '@ownclouders/web-client/src/generated'
import { useMessages, useModals } from '../../../../../src/composables/piniaStores'

describe('restore', () => {
  describe('isVisible property', () => {
    it('should be false when no resource given', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [] })).toBe(false)
        }
      })
    })
    it('should be false when the space is not disabled', () => {
      const spaceMock = mock<Drive>({
        id: '1',
        root: {
          permissions: [{ roles: ['manager'], grantedToIdentities: [{ user: { id: '1' } }] }]
        },
        driveType: 'project',
        special: null
      })
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [buildSpace(spaceMock)] })).toBe(false)
        }
      })
    })
    it('should be true when the space is disabled', () => {
      const spaceMock = mock<Drive>({
        id: '1',
        root: {
          permissions: [{ roles: ['manager'], grantedToIdentities: [{ user: { id: '1' } }] }],
          deleted: { state: 'trashed' }
        },
        driveType: 'project',
        special: null
      })
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [buildSpace(spaceMock)] })).toBe(true)
        }
      })
    })
    it('should be false when the current user is a viewer', () => {
      const spaceMock = mock<Drive>({
        id: '1',
        root: {
          permissions: [{ roles: ['viewer'], grantedToIdentities: [{ user: { id: '1' } }] }],
          deleted: { state: 'trashed' }
        },
        driveType: 'project',
        special: null
      })
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [buildSpace(spaceMock)] })).toBe(false)
        }
      })
    })
  })

  describe('handler', () => {
    it('should trigger the restore modal window', () => {
      getWrapper({
        setup: async ({ actions }) => {
          const { dispatchModal } = useModals()
          await unref(actions)[0].handler({
            resources: [
              mock<SpaceResource>({ id: '1', canRestore: () => true, driveType: 'project' })
            ]
          })

          expect(dispatchModal).toHaveBeenCalledTimes(1)
        }
      })
    })
    it('should not trigger the restore modal window without any resource', () => {
      getWrapper({
        setup: async ({ actions }) => {
          const { dispatchModal } = useModals()
          await unref(actions)[0].handler({
            resources: [mock<SpaceResource>({ id: '1', canRestore: () => false })]
          })

          expect(dispatchModal).toHaveBeenCalledTimes(0)
        }
      })
    })
  })

  describe('method "restoreSpace"', () => {
    it('should show message on success', () => {
      getWrapper({
        setup: async ({ restoreSpaces }, { clientService }) => {
          clientService.graphAuthenticated.drives.updateDrive.mockResolvedValue(mockAxiosResolve())
          await restoreSpaces([mock<SpaceResource>({ id: '1', canRestore: () => true })])

          const { showMessage } = useMessages()
          expect(showMessage).toHaveBeenCalledTimes(1)
        }
      })
    })

    it('should show message on error', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      getWrapper({
        setup: async ({ restoreSpaces }, { clientService }) => {
          clientService.graphAuthenticated.drives.updateDrive.mockRejectedValue(new Error())
          await restoreSpaces([mock<SpaceResource>({ id: '1', canRestore: () => true })])

          const { showErrorMessage } = useMessages()
          expect(showErrorMessage).toHaveBeenCalledTimes(1)
        }
      })
    })
  })
})

function getWrapper({
  setup
}: {
  setup: (
    instance: ReturnType<typeof useSpaceActionsRestore>,
    {
      clientService
    }: {
      clientService: ReturnType<typeof defaultComponentMocks>['$clientService']
    }
  ) => void
}) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-spaces-projects' })
  })
  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        const instance = useSpaceActionsRestore()
        setup(instance, { clientService: mocks.$clientService })
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: {
          piniaOptions: { userState: { user: { id: '1', onPremisesSamAccountName: 'alice' } } }
        }
      }
    )
  }
}
