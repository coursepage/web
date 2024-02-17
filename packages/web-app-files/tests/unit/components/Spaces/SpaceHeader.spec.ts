import { ref } from 'vue'
import SpaceHeader from 'web-app-files/src/components/Spaces/SpaceHeader.vue'
import { Drive } from '@ownclouders/web-client/src/generated'
import { SpaceResource, buildSpace } from '@ownclouders/web-client/src/helpers'
import { defaultPlugins, mount, defaultComponentMocks } from 'web-test-helpers'

describe('SpaceHeader', () => {
  it('should add the "squashed"-class when the sidebar is opened', () => {
    const wrapper = getWrapper({
      space: buildSpace({ id: '1' } as unknown as Drive),
      isSideBarOpen: true
    })
    expect(wrapper.find('.space-header-squashed').exists()).toBeTruthy()
    expect(wrapper.html()).toMatchSnapshot()
  })
  describe('space image', () => {
    it('should show the default image if no other image is set', () => {
      const wrapper = getWrapper({ space: buildSpace({ id: '1' } as unknown as Drive) })
      expect(wrapper.find('.space-header-image-default').exists()).toBeTruthy()
      expect(wrapper.html()).toMatchSnapshot()
    })
    it('should show the set image', async () => {
      const spaceMock = { spaceImageData: { webDavUrl: '/' } }
      const wrapper = getWrapper({
        space: { ...buildSpace({ id: '1' } as unknown as Drive), ...spaceMock }
      })
      await wrapper.vm.loadPreviewTask.last
      expect(wrapper.find('.space-header-image-default').exists()).toBeFalsy()
      expect(wrapper.find('.space-header-image img').exists()).toBeTruthy()
      expect(wrapper.html()).toMatchSnapshot()
    })
    it('should take full width in mobile view', () => {
      const spaceMock = { spaceImageData: { webDavUrl: '/' } }
      const wrapper = getWrapper({
        space: { ...buildSpace({ id: '1' } as unknown as Drive), ...spaceMock },
        isMobileWidth: true
      })
      expect(wrapper.find('.space-header').classes()).not.toContain('oc-flex')
      expect(wrapper.find('.space-header-image').classes()).toContain('space-header-image-expanded')
    })
  })
})

function getWrapper({ space = {} as SpaceResource, isSideBarOpen = false, isMobileWidth = false }) {
  const mocks = defaultComponentMocks()
  mocks.$previewService.loadPreview.mockResolvedValue('blob:image')
  return mount(SpaceHeader, {
    props: {
      space,
      isSideBarOpen
    },
    global: {
      mocks,
      plugins: [...defaultPlugins()],
      provide: { ...mocks, isMobileWidth: ref(isMobileWidth) },
      stubs: {
        'quota-modal': true,
        'space-context-actions': true
      }
    }
  })
}
