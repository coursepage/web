import { defaultPlugins, mount } from 'web-test-helpers'
import ResourceTiles from '../../../../src/components/FilesList/ResourceTiles.vue'
import { sortFields } from '../../../../src/helpers/ui/resourceTiles'
import { Resource } from '@ownclouders/web-client'
import { mock } from 'vitest-mock-extended'

vi.mock('../../../../src/composables/viewMode', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useTileSize: vi.fn().mockReturnValue({
    tileSizePixels: 100
  })
}))

const spacesResources = [
  {
    id: '1',
    name: 'Space 1',
    path: '',
    type: 'space',
    isFolder: true,
    getDriveAliasAndItem: () => '1'
  },
  {
    id: '2',
    name: 'Space 2',
    path: '',
    type: 'space',
    isFolder: true,
    getDriveAliasAndItem: () => '2'
  }
]

describe('ResourceTiles component', () => {
  const originalGetElementById = document.getElementById
  const originalGetComputedStyle = window.getComputedStyle
  beforeEach(() => {
    const mockElement = {
      clientWidth: 800
    }
    ;(document as any).getElementById = vi.fn((id) => {
      if (id === 'tiles-view') {
        return mockElement
      }
      return originalGetElementById.call(document, id)
    })
    window.getComputedStyle = vi.fn().mockImplementation(() => {
      return {
        getPropertyValue: (propName) => {
          switch (propName) {
            case '--oc-size-tiles-default':
              return '9rem'
            case '--oc-size-tiles-resize-step':
              return '9rem'
            default:
              return originalGetComputedStyle(document.documentElement).getPropertyValue(propName)
          }
        },
        fontSize: '14px'
      }
    })
  })
  it('renders an array of spaces correctly', async () => {
    const { wrapper } = getWrapper({ resources: spacesResources })
    await wrapper.vm.$nextTick()
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders a footer slot', () => {
    const { wrapper } = getWrapper({}, { footer: 'Hello, ResourceTiles footer!' })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('emits fileClick event upon click on tile', async () => {
    const { wrapper } = getWrapper({ resources: spacesResources })
    await wrapper.find('resource-tile-stub').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('emits update:selectedIds event on resource selection and sets the selection', () => {
    const { wrapper } = getWrapper({
      resources: spacesResources,
      selectedIds: [spacesResources[0].id]
    })
    wrapper.vm.toggleSelection(spacesResources[0])
    expect(wrapper.find('resource-tile-stub').attributes('isresourceselected')).toEqual('true')
    expect(wrapper.emitted('update:selectedIds')).toBeTruthy()
  })

  describe('sorting', () => {
    it('renders the label of the first sort field as default', () => {
      const { wrapper } = getWrapper({ sortFields })
      expect(wrapper.find('#oc-tiles-sort-btn').text()).toEqual(sortFields[0].label)
    })
    it('renders the label of the current sort field as default', () => {
      const sortField = sortFields[2]
      const { wrapper } = getWrapper({
        sortFields,
        sortBy: sortField.name,
        sortDir: sortField.sortDir
      })
      expect(wrapper.find('#oc-tiles-sort-btn').text()).toEqual(sortField.label)
    })
    it('emits the "sort"-event', async () => {
      const index = 2
      const { wrapper } = getWrapper({ sortFields })
      await wrapper.findAll('.oc-tiles-sort-list-item').at(index).trigger('click')
      expect(wrapper.emitted('sort')).toBeTruthy()
      expect(wrapper.emitted('sort')[0][0]).toEqual({
        sortBy: sortFields[index].name,
        sortDir: sortFields[index].sortDir
      })
    })
    describe('drag and drop', () => {
      it('emits the "update:selectedIds"-event on drag start', async () => {
        const { wrapper } = getWrapper()
        wrapper.vm.dragItem = mock<Resource>()
        await wrapper.vm.$nextTick()
        ;(wrapper.vm.$refs.ghostElementRef as any).$el = { style: {} }
        wrapper.vm.dragStart(mock<Resource>(), { dataTransfer: { setDragImage: vi.fn() } })
        expect(wrapper.emitted('update:selectedIds')).toBeDefined()
      })
      it('emits the "fileDropped"-event on resource drop', () => {
        const { wrapper } = getWrapper()
        wrapper.vm.fileDropped(mock<Resource>(), { dataTransfer: {} })
        expect(wrapper.emitted('fileDropped')).toBeDefined()
      })
    })
  })

  it.each([
    { viewSize: 1, expected: 'xlarge' },
    { viewSize: 2, expected: 'xlarge' },
    { viewSize: 3, expected: 'xxlarge' },
    { viewSize: 4, expected: 'xxlarge' },
    { viewSize: 5, expected: 'xxxlarge' },
    { viewSize: 6, expected: 'xxxlarge' }
  ])('passes the "viewSize" to the OcTile component', (data) => {
    const { wrapper } = getWrapper({ resources: spacesResources, viewSize: data.viewSize })
    expect(wrapper.find('resource-tile-stub').attributes('resourceiconsize')).toEqual(data.expected)
  })

  function getWrapper(props = {}, slots = {}) {
    return {
      wrapper: mount(ResourceTiles, {
        props: {
          ...props
        },
        slots: {
          ...slots
        },
        global: {
          plugins: [...defaultPlugins({ designSystem: false })],
          stubs: { ResourceTile: true }
        }
      })
    }
  }
})
