import { DateTime } from 'luxon'
import ResourceTable from '../../../../src/components/FilesList/ResourceTable.vue'
import {
  extractDomSelector,
  IncomingShareResource,
  Resource,
  ShareTypes,
  SpaceResource
} from '@ownclouders/web-client/src/helpers'
import { defaultPlugins, mount } from 'web-test-helpers'
import { CapabilityStore } from '../../../../src/composables/piniaStores'
import { displayPositionedDropdown } from '../../../../src/helpers/contextMenuDropdown'
import { eventBus } from '../../../../src/services/eventBus'
import { SideBarEventTopics } from '../../../../src/composables/sideBar'
import { mock } from 'vitest-mock-extended'
import { computed } from 'vue'
import { Identity } from '@ownclouders/web-client/src/generated'

const mockUseEmbedMode = vi.fn().mockReturnValue({ isLocationPicker: computed(() => false) })

vi.mock('../../../../src/helpers/contextMenuDropdown')
vi.mock('../../../../src/composables/embedMode', () => ({
  useEmbedMode: vi.fn().mockImplementation(() => mockUseEmbedMode())
}))

const router = {
  push: vi.fn(),
  afterEach: vi.fn(),
  currentRoute: {
    name: 'some-route-name',
    query: {},
    params: {
      driveAliasAndItem: ''
    }
  },
  resolve: (r) => {
    return { href: r.name }
  }
}

const getCurrentDate = () => {
  return DateTime.fromJSDate(new Date()).minus({ days: 1 }).toFormat('EEE, dd MMM yyyy HH:mm:ss')
}

const fields = ['name', 'size', 'mdate', 'sdate', 'ddate', 'actions', 'sharedBy', 'sharedWith']

const sharedWith = [
  {
    id: 'bob',
    displayName: 'Bob',
    shareType: ShareTypes.user.value
  },
  {
    id: 'marie',
    displayName: 'Marie',
    shareType: ShareTypes.user.value
  },
  {
    id: 'john',
    displayName: 'John Richards Emperor of long names',
    shareType: ShareTypes.user.value
  }
] as Array<{ shareType: number } & Identity>

const owner = {
  id: 'bob',
  displayName: 'Bob'
} as Resource['owner']

const sharedBy = [
  {
    id: 'bob',
    displayName: 'Bob'
  }
] as Identity[]

const indicators = [
  {
    id: 'files-sharing',
    label: 'Shared with other people',
    visible: true,
    icon: 'group',
    handler: (resource, indicatorId) =>
      alert(`Resource: ${resource.name}, indicator: ${indicatorId}`)
  },
  {
    id: 'file-link',
    label: 'Shared via link',
    visible: true,
    icon: 'link'
  }
]

const resourcesWithAllFields = [
  {
    id: 'forest',
    name: 'forest.jpg',
    path: 'images/nature/forest.jpg',
    extension: 'jpg',
    thumbnail: 'https://cdn.pixabay.com/photo/2015/09/09/16/05/forest-931706_960_720.jpg',
    indicators,
    isFolder: false,
    type: 'file',
    tags: ['space', 'tag', 'moon'],
    size: '111000234',
    mdate: getCurrentDate(),
    sdate: getCurrentDate(),
    ddate: getCurrentDate(),
    owner,
    sharedBy,
    sharedWith,
    hidden: false,
    syncEnabled: true,
    outgoing: false,
    shareRoles: [],
    sharePermissions: [],
    shareTypes: [],
    canRename: vi.fn(),
    getDomSelector: () => extractDomSelector('forest')
  },
  {
    id: 'notes',
    name: 'notes.txt',
    path: '/Documents/notes.txt',
    extension: 'txt',
    indicators,
    isFolder: false,
    type: 'file',
    size: 'big',
    tags: ['space', 'tag'],
    mdate: getCurrentDate(),
    sdate: getCurrentDate(),
    ddate: getCurrentDate(),
    owner,
    sharedBy,
    sharedWith,
    hidden: false,
    syncEnabled: true,
    outgoing: false,
    shareRoles: [],
    sharePermissions: [],
    shareTypes: [],
    canRename: vi.fn(),
    getDomSelector: () => extractDomSelector('notes')
  },
  {
    id: 'documents',
    name: 'Documents',
    path: '/Documents',
    indicators,
    isFolder: true,
    type: 'folder',
    size: '-1',
    tags: [],
    mdate: getCurrentDate(),
    sdate: getCurrentDate(),
    ddate: getCurrentDate(),
    owner,
    sharedBy,
    sharedWith,
    hidden: false,
    syncEnabled: true,
    outgoing: false,
    shareRoles: [],
    sharePermissions: [],
    shareTypes: [],
    canRename: vi.fn(),
    getDomSelector: () => extractDomSelector('documents')
  },
  {
    id: 'another-one==',
    name: 'Another one',
    path: '/Another one',
    indicators,
    isFolder: true,
    type: 'folder',
    size: '237895',
    mdate: getCurrentDate(),
    sdate: getCurrentDate(),
    ddate: getCurrentDate(),
    owner,
    sharedBy,
    sharedWith,
    hidden: false,
    syncEnabled: true,
    outgoing: false,
    shareRoles: [],
    sharePermissions: [],
    shareTypes: [],
    tags: [],
    canRename: vi.fn(),
    getDomSelector: () => extractDomSelector('another-one==')
  }
] as IncomingShareResource[]

const processingResourcesWithAllFields = [
  {
    id: 'rainforest',
    name: 'rainforest.jpg',
    path: 'images/nature/rainforest.jpg',
    extension: 'jpg',
    thumbnail: 'https://cdn.pixabay.com/photo/2015/09/09/16/05/forest-931706_960_720.jpg',
    indicators,
    isFolder: false,
    type: 'file',
    tags: ['space', 'tag', 'moon'],
    size: '111000234',
    mdate: getCurrentDate(),
    sdate: getCurrentDate(),
    ddate: getCurrentDate(),
    owner,
    sharedBy,
    sharedWith,
    hidden: false,
    syncEnabled: true,
    outgoing: false,
    shareRoles: [],
    sharePermissions: [],
    shareTypes: [],
    canRename: vi.fn(),
    getDomSelector: () => extractDomSelector('forest'),
    processing: true
  },
  {
    id: 'personalnotes',
    name: 'personalnotes.txt',
    path: '/Documents/personalnotes.txt',
    extension: 'txt',
    indicators,
    isFolder: false,
    type: 'file',
    size: 'big',
    tags: ['space', 'tag'],
    mdate: getCurrentDate(),
    sdate: getCurrentDate(),
    ddate: getCurrentDate(),
    owner,
    sharedBy,
    sharedWith,
    hidden: false,
    syncEnabled: true,
    outgoing: false,
    shareRoles: [],
    sharePermissions: [],
    shareTypes: [],
    canRename: vi.fn(),
    getDomSelector: () => extractDomSelector('notes'),
    processing: true
  }
] as IncomingShareResource[]

describe('ResourceTable', () => {
  it('displays all known fields of the resources', () => {
    const { wrapper } = getMountedWrapper()
    for (const field of fields) {
      expect(wrapper.findAll('.oc-table-header-cell-' + field).length).toEqual(1)
      expect(wrapper.findAll('.oc-table-data-cell-' + field).length).toEqual(
        resourcesWithAllFields.length
      )
    }
  })

  it('accepts resourceDomId closure', () => {
    const { wrapper } = getMountedWrapper({
      props: {
        resourceDomSelector: (resource) => ['custom', resource.getDomSelector()].join('-')
      }
    })
    resourcesWithAllFields.forEach((resource) => {
      ;['.oc-tbody-tr', '#resource-table-select', '#context-menu-drop'].forEach((baseSelector) => {
        expect(
          wrapper.find([baseSelector, 'custom', resource.getDomSelector()].join('-')).exists()
        ).toBeTruthy()
      })
    })
  })

  it('formats the resource size to a human readable format', () => {
    const { wrapper } = getMountedWrapper()
    expect(wrapper.find('.oc-tbody-tr-forest .oc-table-data-cell-size').text()).toEqual('111 MB')
    expect(wrapper.find('.oc-tbody-tr-documents .oc-table-data-cell-size').text()).toEqual('--')
    expect(wrapper.find('.oc-tbody-tr-notes .oc-table-data-cell-size').text()).toEqual('?')
  })

  describe('resource selection', () => {
    it('adds resources to selection model via checkboxes', () => {
      const { wrapper } = getMountedWrapper()
      wrapper.find('.resource-table-select-all .oc-checkbox').setValue(true)
      wrapper.find('.oc-tbody-tr-documents .oc-checkbox').setValue(true)
      expect(wrapper.emitted('update:selectedIds').length).toBe(2)
    })
    it('does not add resources that are disabled to selection model via checkboxes', () => {
      const { wrapper } = getMountedWrapper({ addProcessingResources: true })
      wrapper.find('.resource-table-select-all .oc-checkbox').setValue(true)
      expect(wrapper.emitted('update:selectedIds')[0][0]).not.toContain(
        processingResourcesWithAllFields[0].id
      )
      expect(wrapper.emitted('update:selectedIds')[0][0]).not.toContain(
        processingResourcesWithAllFields[1].id
      )
    })

    describe('all rows already selected', () => {
      it('de-selects all resources via the select-all checkbox', async () => {
        const { wrapper } = getMountedWrapper({
          props: {
            selectedIds: resourcesWithAllFields.map((resource) => resource.id)
          }
        })

        await wrapper.find('.resource-table-select-all .oc-checkbox').setValue(false)
        expect((wrapper.emitted('update:selectedIds')[0][0] as any).length).toBe(0)
      })
    })

    describe('embed mode location target', () => {
      it('should not hide checkboxes when embed mode does not have location as target', () => {
        mockUseEmbedMode.mockReturnValue({
          isLocationPicker: computed(() => false)
        })

        const { wrapper } = getMountedWrapper()

        expect(wrapper.find('.resource-table-select-all').exists()).toBe(true)
        expect(wrapper.find('.resource-table-select-all .oc-checkbox').exists()).toBe(true)
      })

      it('should hide checkboxes when embed mode has location as target', () => {
        mockUseEmbedMode.mockReturnValue({
          isLocationPicker: computed(() => true)
        })

        const { wrapper } = getMountedWrapper()

        expect(wrapper.find('.resource-table-select-all').exists()).toBe(false)
        expect(wrapper.find('.resource-table-select-all .oc-checkbox').exists()).toBe(false)
      })
    })
  })

  describe('resource activation', () => {
    it('emits fileClick upon clicking on a resource name', async () => {
      const { wrapper } = getMountedWrapper()
      const tr = await wrapper.find('.oc-tbody-tr-forest .oc-resource-name')
      await tr.trigger('click')

      expect(wrapper.emitted().fileClick[0][0].resources[0].name).toMatch('forest.jpg')
    })

    it('does not emit fileClick upon clicking on a disabled resource name', async () => {
      const { wrapper } = getMountedWrapper({ addProcessingResources: true })
      const tr = await wrapper.find('.oc-tbody-tr-rainforest .oc-resource-name')
      await tr.trigger('click')

      expect(wrapper.emitted().fileClick).toBeUndefined()
    })
  })

  describe('resource details', () => {
    it('emits select event when clicking on the row', async () => {
      const { wrapper } = getMountedWrapper()
      const tableRow = await wrapper.find('.oc-tbody-tr-forest .oc-table-data-cell-size')
      await tableRow.trigger('click')
      expect(wrapper.emitted('update:selectedIds')).toBeTruthy()
    })

    it('does not emit select event when clicking on the row of a disabled resource', async () => {
      const { wrapper } = getMountedWrapper({ addProcessingResources: true })
      const tableRow = await wrapper.find('.oc-tbody-tr-rainforest .oc-table-data-cell-size')
      await tableRow.trigger('click')

      expect(wrapper.emitted('update:selectedIds')).toBeUndefined()
    })
  })

  describe('context menu', () => {
    it('emits select event on contextmenu click', async () => {
      const spyDisplayPositionedDropdown = vi.mocked(displayPositionedDropdown)
      const { wrapper } = getMountedWrapper()
      await wrapper.find('.oc-tbody-tr').trigger('contextmenu')
      expect(wrapper.emitted('update:selectedIds').length).toBe(1)
      expect(spyDisplayPositionedDropdown).toHaveBeenCalledTimes(1)
    })

    it('does not emit select event on contextmenu click of disabled resource', async () => {
      const spyDisplayPositionedDropdown = vi.mocked(displayPositionedDropdown)
      const { wrapper } = getMountedWrapper({ addProcessingResources: true })
      await wrapper.find('.oc-tbody-tr-rainforest').trigger('contextmenu')
      expect(wrapper.emitted('update:selectedIds')).toBeUndefined()
      expect(spyDisplayPositionedDropdown).not.toHaveBeenCalled()
    })

    it('emits select event on clicking the three-dot icon in table row', async () => {
      const spyDisplayPositionedDropdown = vi.mocked(displayPositionedDropdown)
      const { wrapper } = getMountedWrapper()
      await wrapper
        .find('.oc-table-data-cell-actions .resource-table-btn-action-dropdown')
        .trigger('click')
      expect(wrapper.emitted('update:selectedIds').length).toBe(1)
      expect(spyDisplayPositionedDropdown).toHaveBeenCalledTimes(1)
    })

    it('does not emit select event on clicking the three-dot icon in table row of a disabled resource', async () => {
      const spyDisplayPositionedDropdown = vi.mocked(displayPositionedDropdown)
      const { wrapper } = getMountedWrapper({ addProcessingResources: true })
      await wrapper
        .find(
          '.oc-tbody-tr-rainforest .oc-table-data-cell-actions .resource-table-btn-action-dropdown'
        )
        .trigger('click')
      expect(wrapper.emitted('update:selectedIds')).toBeUndefined()
      expect(spyDisplayPositionedDropdown).toHaveBeenCalledTimes(0)
    })

    it('removes invalid chars from item ids for usage in html template', async () => {
      const { wrapper } = getMountedWrapper()
      const contextMenuTriggers = await wrapper.findAll('.resource-table-btn-action-dropdown')
      for (let i = 0; i < contextMenuTriggers.length; i++) {
        const id = contextMenuTriggers.at(i).attributes().id
        expect(id).not.toBeUndefined()
        expect(id).toEqual(expect.not.stringContaining('='))
      }
    })
  })

  describe('hover effect', () => {
    it('is disabled by default', () => {
      const { wrapper } = getMountedWrapper({ props: { hover: false } })
      expect(wrapper.find('table').classes()).not.toContain('oc-table-hover')
    })

    it('can be enabled', () => {
      const { wrapper } = getMountedWrapper({ props: { hover: true } })
      expect(wrapper.find('table').classes()).toContain('oc-table-hover')
    })
  })

  describe('tags', () => {
    describe('inline', () => {
      it.each([
        { tags: [], tagCount: 0 },
        { tags: ['1'], tagCount: 1 },
        { tags: ['1', '2'], tagCount: 2 },
        { tags: ['1', '2', '3'], tagCount: 2 },
        { tags: ['1', '2', '3', '4'], tagCount: 2 }
      ])('render 2 tags max', (data) => {
        const { tags, tagCount } = data
        const resource = mock<Resource>({ id: '1', tags })
        const { wrapper } = getMountedWrapper({ props: { resources: [resource] } })
        const resourceRow = wrapper.find(`[data-item-id="${resource.id}"]`)
        expect(resourceRow.findAll('.resource-table-tag').length).toBe(tagCount)
      })
      it('render router link if user is authenticated', () => {
        const resource = mock<Resource>({ id: '1', tags: ['1'] })
        const { wrapper } = getMountedWrapper({ props: { resources: [resource] } })
        const resourceRow = wrapper.find(`[data-item-id="${resource.id}"]`)
        expect(resourceRow.find('.resource-table-tag-wrapper').element.tagName).toEqual(
          'ROUTER-LINK-STUB'
        )
      })
      it('do not render router link if user is not authenticated', () => {
        const resource = mock<Resource>({ id: '1', tags: ['1'] })
        const { wrapper } = getMountedWrapper({
          props: { resources: [resource] },
          userContextReady: false
        })
        const resourceRow = wrapper.find(`[data-item-id="${resource.id}"]`)
        expect(resourceRow.find('.resource-table-tag-wrapper').element.tagName).toEqual('SPAN')
      })
    })
    describe('"more"-button', () => {
      it.each([
        { tags: [], renderButton: false },
        { tags: ['1'], renderButton: false },
        { tags: ['1', '2'], renderButton: false },
        { tags: ['1', '2', '3'], renderButton: true },
        { tags: ['1', '2', '3', '4'], renderButton: true }
      ])('does only render when the resource has 3 tags or more', (data) => {
        const { tags, renderButton } = data
        const resource = mock<Resource>({ id: '1', tags })
        const { wrapper } = getMountedWrapper({ props: { resources: [resource] } })
        const resourceRow = wrapper.find(`[data-item-id="${resource.id}"]`)
        expect(resourceRow.find('.resource-table-tag-more').exists()).toBe(renderButton)
      })
      it('opens sidebar on click', async () => {
        const spyBus = vi.spyOn(eventBus, 'publish')
        const resource = mock<Resource>({ id: '1', tags: ['1', '2', '3'] })
        const { wrapper } = getMountedWrapper({ props: { resources: [resource] } })
        const resourceRow = wrapper.find(`[data-item-id="${resource.id}"]`)
        await resourceRow.find('.resource-table-tag-more').trigger('click')
        expect(spyBus).toHaveBeenCalledWith(SideBarEventTopics.open)
      })
    })
  })
})

function getMountedWrapper({
  props = {},
  userContextReady = true,
  addProcessingResources = false
} = {}) {
  const capabilities = {
    files: { tags: true }
  } satisfies Partial<CapabilityStore['capabilities']>

  return {
    wrapper: mount(ResourceTable, {
      props: {
        resources: [
          ...resourcesWithAllFields,
          ...(addProcessingResources ? processingResourcesWithAllFields : [])
        ],
        selection: [],
        hover: false,
        space: mock<SpaceResource>({
          getDriveAliasAndItem: vi.fn()
        }),
        ...props
      },
      global: {
        renderStubDefaultSlot: true,
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              authState: { userContextReady },
              capabilityState: { capabilities },
              configState: { options: { displayResourcesLazy: false } }
            }
          })
        ],
        stubs: {
          OcButton: false,
          'router-link': true
        },
        mocks: {
          $route: router.currentRoute,
          $router: router
        },
        provide: {
          $router: router,
          $route: router.currentRoute
        }
      }
    })
  }
}
