import Users from '../../../src/views/Users.vue'
import {
  OptionsConfig,
  UserAction,
  eventBus,
  useAppDefaults,
  useMessages,
  useSpacesStore
} from '@ownclouders/web-pkg'
import { mock, mockDeep } from 'vitest-mock-extended'
import { mockAxiosResolve, mockAxiosReject } from 'web-test-helpers/src/mocks'
import { defaultComponentMocks, defaultPlugins, mount, shallowMount } from 'web-test-helpers'
import { AxiosResponse } from 'axios'
import { ClientService, queryItemAsString } from '@ownclouders/web-pkg'
import { User } from '@ownclouders/web-client/src/generated'
import { useAppDefaultsMock } from 'web-test-helpers/src/mocks/useAppDefaultsMock'
import { useUserActionsCreateUser } from '../../../src/composables/actions/users/useUserActionsCreateUser'
import { ref } from 'vue'

vi.mock('@ownclouders/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  queryItemAsString: vi.fn(),
  useAppDefaults: vi.fn()
}))
vi.mock('../../../src/composables/actions/users/useUserActionsCreateUser')
vi.mocked(useAppDefaults).mockImplementation(() => useAppDefaultsMock())

const getDefaultUser = () => {
  return {
    id: '1',
    displayName: 'Admin',
    givenName: 'Admin',
    surname: 'Admin',
    memberOf: [],
    mail: 'admin@example.org',
    drive: {
      id: '1',
      name: 'admin',
      quota: { remaining: 5000000000, state: 'normal', total: 5000000000, used: 0 }
    },
    appRoleAssignments: [
      {
        appRoleId: '1',
        id: '1',
        principalId: '1',
        principalType: 'User',
        resourceDisplayName: 'ownCloud Infinite Scale',
        resourceId: 'some-graph-app-id'
      }
    ]
  }
}

const getDefaultApplications = () => {
  return [
    {
      appRoles: [
        {
          displayName: 'Admin',
          id: '1'
        },
        {
          displayName: 'Guest',
          id: '2'
        },
        {
          displayName: 'Space Admin',
          id: '3'
        },
        {
          displayName: 'User',
          id: '4'
        }
      ],
      displayName: 'ownCloud Infinite Scale',
      id: 'some-graph-app-id'
    }
  ]
}

const getClientService = () => {
  const clientService = mockDeep<ClientService>()
  clientService.graphAuthenticated.users.listUsers.mockResolvedValue(
    mock<AxiosResponse>({ data: { value: [getDefaultUser()] } })
  )
  clientService.graphAuthenticated.users.getUser.mockResolvedValue(
    mock<AxiosResponse>({ data: getDefaultUser() })
  )
  clientService.graphAuthenticated.users.editUser.mockResolvedValue(
    mock<AxiosResponse>({ data: getDefaultUser() })
  )
  clientService.graphAuthenticated.groups.listGroups.mockResolvedValue(
    mock<AxiosResponse>({ data: { value: [] } })
  )
  clientService.graphAuthenticated.applications.listApplications.mockResolvedValue(
    mock<AxiosResponse>({ data: { value: getDefaultApplications() } })
  )
  return clientService
}

const selectors = {
  itemFilterGroupsStub: 'item-filter-stub[filtername="groups"]',
  itemFilterRolesStub: 'item-filter-stub[filtername="roles"]',
  createUserButton: '#create-user-btn'
}

describe('Users view', () => {
  describe('list view', () => {
    it('renders list initially', async () => {
      const { wrapper } = getMountedWrapper({ mountType: mount })
      await wrapper.vm.loadResourcesTask.last
      expect(wrapper.html()).toMatchSnapshot()
    })
    it('renders initially warning if filters are mandatory', async () => {
      const { wrapper } = getMountedWrapper({
        mountType: mount,
        options: { userListRequiresFilter: true }
      })
      await wrapper.vm.loadResourcesTask.last
      expect(wrapper.html()).toMatchSnapshot()
    })
  })
  describe('create user button', () => {
    it('should be displayed if action enabled', () => {
      const { wrapper } = getMountedWrapper({
        mountType: mount,
        createUserActionEnabled: true
      })
      const createUserButton = wrapper.find(selectors.createUserButton)
      expect(createUserButton.exists()).toBeTruthy()
    })
    it('should not be displayed if action disabled', () => {
      const { wrapper } = getMountedWrapper({
        mountType: mount,
        createUserActionEnabled: false
      })
      const createUserButton = wrapper.find(selectors.createUserButton)
      expect(createUserButton.exists()).toBeFalsy()
    })
  })

  describe('method "onEditUser"', () => {
    it('should emit event on success', async () => {
      const editUser = {
        appRoleAssignments: [
          {
            appRoleId: '2',
            resourceId: 'some-graph-app-id',
            principalId: '1'
          }
        ],
        displayName: 'administrator',
        id: '1',
        mail: 'administrator@example.org',
        memberOf: [
          {
            displayName: 'admins',
            id: '1'
          }
        ],
        drive: {
          id: '1',
          name: 'admin',
          quota: {
            total: 1000000000
          }
        },
        passwordProfile: {
          password: 'administrator'
        }
      }

      const clientService = getClientService()
      clientService.graphAuthenticated.users.editUser.mockResolvedValue(mockAxiosResolve())
      clientService.graphAuthenticated.users.createUserAppRoleAssignment.mockResolvedValue(
        mockAxiosResolve()
      )
      clientService.graphAuthenticated.groups.addMember.mockResolvedValue(mockAxiosResolve())
      clientService.graphAuthenticated.drives.updateDrive.mockResolvedValue(
        mockAxiosResolve({
          id: '1',
          name: 'admin',
          quota: { remaining: 1000000000, state: 'normal', total: 1000000000, used: 0 }
        })
      )
      clientService.graphAuthenticated.users.getUser.mockResolvedValue(
        mockAxiosResolve({
          appRoleAssignments: [
            {
              appRoleId: '2',
              id: '1',
              principalId: '1',
              principalType: 'User',
              resourceDisplayName: 'ownCloud Infinite Scale',
              resourceId: 'some-graph-app-id'
            }
          ],
          displayName: 'administrator',
          drive: {
            id: '1',
            name: 'admin',
            quota: { remaining: 1000000000, state: 'normal', total: 1000000000, used: 0 }
          },
          id: '1',
          mail: 'administrator@example.org',
          memberOf: [
            {
              displayName: 'admins',
              id: '1'
            }
          ],
          onPremisesSamAccountName: 'admin',
          surname: 'Admin'
        })
      )

      const { wrapper } = getMountedWrapper({ clientService })

      const busStub = vi.spyOn(eventBus, 'publish')

      await wrapper.vm.loadResourcesTask.last

      const userToUpDate = wrapper.vm.users.find((user) => user.id === '1')
      const updatedUser = await wrapper.vm.onEditUser({ user: userToUpDate, editUser })

      expect(updatedUser.id).toEqual('1')
      expect(updatedUser.displayName).toEqual('administrator')
      expect(updatedUser.mail).toEqual('administrator@example.org')
      expect(updatedUser.appRoleAssignments[0].appRoleId).toEqual('2')
      expect(updatedUser.drive.quota.total).toEqual(1000000000)
      expect(updatedUser.memberOf[0].id).toEqual('1')

      expect(busStub).toHaveBeenCalled()
      const spacesStore = useSpacesStore()
      expect(spacesStore.updateSpaceField).toHaveBeenCalled()
    })

    it('should show message on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const clientService = getClientService()
      clientService.graphAuthenticated.users.editUser.mockImplementation(() => mockAxiosReject())
      const { wrapper } = getMountedWrapper({ clientService })

      await wrapper.vm.loadResourcesTask.last
      await wrapper.vm.onEditUser({
        user: {},
        editUser: {}
      })

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalled()
    })
  })

  describe('computed method "sideBarAvailablePanels"', () => {
    it('should contain EditPanel when one user is selected', () => {
      const { wrapper } = getMountedWrapper()
      expect(
        wrapper.vm.sideBarAvailablePanels
          .find(({ name }) => name === 'EditPanel')
          .isVisible({ items: [{ id: '1' }] })
      ).toBeTruthy()
    })
    it('should contain DetailsPanel no user is selected', () => {
      const { wrapper } = getMountedWrapper()
      expect(
        wrapper.vm.sideBarAvailablePanels
          .find(({ name }) => name === 'DetailsPanel')
          .isVisible({ items: [] })
      ).toBeTruthy()
    })
    it('should not contain EditPanel when multiple users are selected', () => {
      const { wrapper } = getMountedWrapper()
      expect(
        wrapper.vm.sideBarAvailablePanels
          .find(({ name }) => name === 'EditPanel')
          .isVisible({ items: [{ id: '1' }, { id: '2' }] })
      ).toBeFalsy()
    })
  })

  describe('batch actions', () => {
    it('do not display when no user selected', async () => {
      const { wrapper } = getMountedWrapper({ mountType: mount })
      await wrapper.vm.loadResourcesTask.last
      expect(wrapper.find('batch-actions-stub').exists()).toBeFalsy()
    })
    it('display when one user selected', async () => {
      const { wrapper } = getMountedWrapper({ mountType: mount })
      await wrapper.vm.loadResourcesTask.last
      wrapper.vm.toggleSelectUser(getDefaultUser())
      await wrapper.vm.$nextTick()
      expect(wrapper.find('batch-actions-stub').exists()).toBeTruthy()
    })
    it('display when more than one users selected', async () => {
      const { wrapper } = getMountedWrapper({ mountType: mount })
      await wrapper.vm.loadResourcesTask.last
      wrapper.vm.selectUsers([mock<User>(), mock<User>()])
      await wrapper.vm.$nextTick()
      expect(wrapper.find('batch-actions-stub').exists()).toBeTruthy()
    })
  })

  describe('filter', () => {
    describe('groups', () => {
      it('does filter users by groups when the "selectionChange"-event is triggered', async () => {
        const clientService = getClientService()
        const { wrapper } = getMountedWrapper({ mountType: mount, clientService })
        await wrapper.vm.loadResourcesTask.last
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledTimes(1)
        ;(wrapper.findComponent<any>(selectors.itemFilterGroupsStub).vm as any).$emit(
          'selectionChange',
          [{ id: '1' }]
        )
        await wrapper.vm.$nextTick()
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledTimes(2)
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenNthCalledWith(
          2,
          'displayName',
          "(memberOf/any(m:m/id eq '1'))"
        )
      })
      it('does filter initially if group ids are given via query param', async () => {
        const groupIdsQueryParam = '1+2'
        const clientService = getClientService()
        const { wrapper } = getMountedWrapper({
          mountType: mount,
          clientService,
          groupFilterQuery: groupIdsQueryParam
        })
        await wrapper.vm.loadResourcesTask.last
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledWith(
          'displayName',
          "(memberOf/any(m:m/id eq '1') or memberOf/any(m:m/id eq '2'))"
        )
      })
    })
    describe('roles', () => {
      it('does filter users by roles when the "selectionChange"-event is triggered', async () => {
        const clientService = getClientService()
        const { wrapper } = getMountedWrapper({ mountType: mount, clientService })
        await wrapper.vm.loadResourcesTask.last
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledTimes(1)
        ;(wrapper.findComponent<any>(selectors.itemFilterRolesStub).vm as any).$emit(
          'selectionChange',
          [{ id: '1' }]
        )
        await wrapper.vm.$nextTick()
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledTimes(2)
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenNthCalledWith(
          2,
          'displayName',
          "(appRoleAssignments/any(m:m/appRoleId eq '1'))"
        )
      })
      it('does filter initially if role ids are given via query param', async () => {
        const roleIdsQueryParam = '1+2'
        const clientService = getClientService()
        const { wrapper } = getMountedWrapper({
          mountType: mount,
          clientService,
          roleFilterQuery: roleIdsQueryParam
        })
        await wrapper.vm.loadResourcesTask.last
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledWith(
          'displayName',
          "(appRoleAssignments/any(m:m/appRoleId eq '1') or appRoleAssignments/any(m:m/appRoleId eq '2'))"
        )
      })
    })
    describe('displayName', () => {
      it('does filter initially if displayName is given via query param', async () => {
        const displayNameFilterQueryParam = 'Albert'
        const clientService = getClientService()
        const { wrapper } = getMountedWrapper({
          mountType: mount,
          clientService,
          displayNameFilterQuery: displayNameFilterQueryParam
        })
        await wrapper.vm.loadResourcesTask.last
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledWith(
          'displayName',
          "contains(displayName,'Albert')"
        )
      })
    })
  })
})

function getMountedWrapper({
  mountType = shallowMount,
  clientService = getClientService(),
  displayNameFilterQuery = null,
  groupFilterQuery = null,
  roleFilterQuery = null,
  options = {},
  createUserActionEnabled = true
}: {
  mountType?: typeof shallowMount | typeof mount
  clientService?: ReturnType<typeof mockDeep<ClientService>>
  displayNameFilterQuery?: string
  groupFilterQuery?: string
  roleFilterQuery?: string
  options?: OptionsConfig
  createUserActionEnabled?: boolean
} = {}) {
  vi.mocked(queryItemAsString).mockImplementationOnce(() => displayNameFilterQuery)
  vi.mocked(queryItemAsString).mockImplementationOnce(() => groupFilterQuery)
  vi.mocked(queryItemAsString).mockImplementationOnce(() => roleFilterQuery)
  vi.mocked(queryItemAsString).mockImplementationOnce(() => displayNameFilterQuery)
  vi.mocked(useUserActionsCreateUser).mockReturnValue(
    mock<ReturnType<typeof useUserActionsCreateUser>>({
      actions: ref([mock<UserAction>({ isVisible: () => createUserActionEnabled })])
    })
  )

  const mocks = {
    ...defaultComponentMocks()
  }

  mocks.$clientService = clientService

  const user = { id: '1', uuid: '1' }

  return {
    mocks,
    wrapper: mountType(Users, {
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: { userState: { user }, configState: { options } }
          })
        ],
        mocks,
        provide: mocks,
        stubs: {
          AppLoadingSpinner: true,
          ViewOptions: true,
          OcBreadcrumb: true,
          NoContentMessage: true,
          ItemFilter: true,
          BatchActions: true,
          OcButton: true
        }
      }
    })
  }
}
