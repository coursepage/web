import { useGroupActionsDelete } from '../../../../../src/composables/actions/groups/useGroupActionsDelete'
import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { Group } from '@ownclouders/web-client/src/generated'
import { eventBus } from '@ownclouders/web-pkg'
import { defaultComponentMocks, getComposableWrapper } from 'web-test-helpers'

describe('useGroupActionsDelete', () => {
  describe('method "isVisible"', () => {
    it.each([
      { resources: [], isVisible: false },
      { resources: [mock<Group>({ groupTypes: [] })], isVisible: true },
      {
        resources: [mock<Group>({ groupTypes: [] }), mock<Group>({ groupTypes: [] })],
        isVisible: true
      }
    ])('should only return true if 1 or more groups are selected', ({ resources, isVisible }) => {
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources })).toEqual(isVisible)
        }
      })
    })
    it('should return false for read-only groups', () => {
      getWrapper({
        setup: ({ actions }) => {
          const resources = [mock<Group>({ groupTypes: ['ReadOnly'] })]
          expect(unref(actions)[0].isVisible({ resources })).toBeFalsy()
        }
      })
    })
  })
  describe('method "deleteGroups"', () => {
    it('should successfully delete all given gropups and reload the groups list', () => {
      const eventSpy = vi.spyOn(eventBus, 'publish')
      getWrapper({
        setup: async ({ deleteGroups }, { clientService }) => {
          const group = mock<Group>({ id: '1' })
          await deleteGroups([group])
          expect(clientService.graphAuthenticated.groups.deleteGroup).toHaveBeenCalledWith(group.id)
          expect(eventSpy).toHaveBeenCalledWith('app.admin-settings.list.load')
        }
      })
    })
    it('should handle errors', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const eventSpy = vi.spyOn(eventBus, 'publish')
      getWrapper({
        setup: async ({ deleteGroups }, { clientService }) => {
          clientService.graphAuthenticated.groups.deleteGroup.mockRejectedValue({})
          const group = mock<Group>({ id: '1' })
          await deleteGroups([group])
          expect(clientService.graphAuthenticated.groups.deleteGroup).toHaveBeenCalledWith(group.id)
          expect(eventSpy).toHaveBeenCalledWith('app.admin-settings.list.load')
        }
      })
    })
  })
})

function getWrapper({
  setup
}: {
  setup: (
    instance: ReturnType<typeof useGroupActionsDelete>,
    {
      clientService
    }: {
      clientService: ReturnType<typeof defaultComponentMocks>['$clientService']
    }
  ) => void
}) {
  const mocks = defaultComponentMocks()
  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useGroupActionsDelete()
        setup(instance, { clientService: mocks.$clientService })
      },
      { mocks, provide: mocks }
    )
  }
}
