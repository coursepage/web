import { Page } from '@playwright/test'
import util from 'util'

import { sidebar, editor } from '../utils'
import Collaborator, { ICollaborator } from '../share/collaborator'
import { createLink } from '../link/actions'
import { File } from '../../../types'

const newSpaceMenuButton = '#new-space-menu-btn'
const spaceNameInputField = '.oc-modal input'
const actionConfirmButton = '.oc-modal-body-actions-confirm'
const spaceIdSelector = `[data-item-id="%s"] .oc-resource-basename`
const spacesRenameOptionSelector = '.oc-files-actions-rename-trigger:visible'
const editSpacesSubtitleOptionSelector = '.oc-files-actions-edit-description-trigger:visible'
const editQuotaOptionSelector = '.oc-files-actions-edit-quota-trigger:visible'
const editImageOptionSelector = '.oc-files-actions-upload-space-image-trigger:visible'
const downloadSpaceSelector = '.oc-files-actions-download-archive-trigger:visible'
const spacesQuotaSearchField = '.oc-modal .vs__search'
const selectedQuotaValueField = '.vs--open'
const quotaValueDropDown = `.vs__dropdown-option :text-is("%s")`
const editSpacesDescription = '.oc-files-actions-edit-readme-content-trigger:visible'
const spacesDescriptionInputArea = '.md-mode .ProseMirror'
const spacesDescriptionSaveTextFileInEditorButton = '#app-save-action:visible'
const sideBarActions =
  '//ul[@id="oc-files-actions-sidebar"]//span[@class="oc-files-context-action-label"]'

export const openActionsPanel = async (page: Page): Promise<void> => {
  await sidebar.open({ page })
  await sidebar.openPanel({ page, name: 'space-actions' })
}

export const openSharingPanel = async (page: Page): Promise<void> => {
  await sidebar.open({ page })
  await sidebar.openPanel({ page, name: 'space-share' })
}

/**/

export interface createSpaceArgs {
  name: string
  page: Page
}

export const createSpace = async (args: createSpaceArgs): Promise<string> => {
  const { page, name } = args

  await page.locator(newSpaceMenuButton).click()
  await page.locator(spaceNameInputField).fill(name)

  const postResponsePromise = page.waitForResponse(
    (postResp) =>
      postResp.status() === 201 &&
      postResp.request().method() === 'POST' &&
      postResp.url().endsWith('drives')
  )
  const mkcolResponsePromise = page.waitForResponse(
    (resp) =>
      resp.status() === 201 && resp.request().method() === 'MKCOL' && resp.url().includes('.space')
  )
  const putResponsePromise = page.waitForResponse(
    (resp) =>
      resp.status() === 201 &&
      resp.request().method() === 'PUT' &&
      resp.url().endsWith('/.space/readme.md')
  )
  const patchResponsePromise = page.waitForResponse(
    (resp) => resp.status() === 200 && resp.request().method() === 'PATCH'
  )

  const [responses] = await Promise.all([
    postResponsePromise,
    mkcolResponsePromise,
    putResponsePromise,
    patchResponsePromise,
    page.locator(actionConfirmButton).click()
  ])

  const { id } = await responses.json()
  return id
}

/**/

export interface openSpaceArgs {
  id: string
  page: Page
}

export const openSpace = async (args: openSpaceArgs): Promise<void> => {
  const { page, id } = args
  await page.locator(util.format(spaceIdSelector, id)).click()
}
/**/

export const changeSpaceName = async (args: {
  page: Page
  id: string
  value: string
}): Promise<void> => {
  const { page, value, id } = args
  await openActionsPanel(page)

  await page.locator(spacesRenameOptionSelector).click()
  await page.locator(spaceNameInputField).fill(value)
  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith(encodeURIComponent(id)) &&
        resp.status() === 200 &&
        resp.request().method() === 'PATCH'
    ),
    page.locator(actionConfirmButton).click()
  ])

  await sidebar.close({ page: page })
}

/**/

export const changeSpaceSubtitle = async (args: {
  page: Page
  id: string
  value: string
}): Promise<void> => {
  const { page, value, id } = args
  await openActionsPanel(page)

  await page.locator(editSpacesSubtitleOptionSelector).click()
  await page.locator(spaceNameInputField).fill(value)
  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith(encodeURIComponent(id)) &&
        resp.status() === 200 &&
        resp.request().method() === 'PATCH'
    ),
    page.locator(actionConfirmButton).click()
  ])

  await sidebar.close({ page: page })
}

/**/

export const changeSpaceDescription = async (args: {
  page: Page
  value: string
}): Promise<void> => {
  const { page, value } = args
  await openActionsPanel(page)
  const waitForUpdate = () =>
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith('readme.md') &&
        resp.status() === 200 &&
        resp.request().method() === 'GET'
    )
  await Promise.all([waitForUpdate(), page.locator(editSpacesDescription).click()])

  await page.locator(spacesDescriptionInputArea).fill(value)
  await Promise.all([
    page.waitForResponse((resp) => resp.status() === 204 && resp.request().method() === 'PUT'),
    page.waitForResponse((resp) => resp.status() === 207 && resp.request().method() === 'PROPFIND'),
    page.locator(spacesDescriptionSaveTextFileInEditorButton).click()
  ])
  await editor.close(page)
}

/**/

export const changeQuota = async (args: {
  id: string
  page: Page
  value: string
}): Promise<void> => {
  const { id, page, value } = args
  await openActionsPanel(page)

  await page.locator(editQuotaOptionSelector).click()
  const searchLocator = page.locator(spacesQuotaSearchField)
  await searchLocator.pressSequentially(value)
  await page.locator(selectedQuotaValueField).waitFor()
  await page.locator(util.format(quotaValueDropDown, `${value} GB`)).click()

  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith(encodeURIComponent(id)) &&
        resp.status() === 200 &&
        resp.request().method() === 'PATCH'
    ),
    page.locator(actionConfirmButton).click()
  ])

  await sidebar.close({ page: page })
}

export interface SpaceMembersArgs {
  page: Page
  users: ICollaborator[]
}

export const addSpaceMembers = async (args: SpaceMembersArgs): Promise<void> => {
  const { page, users } = args
  await openSharingPanel(page)

  await Collaborator.inviteCollaborators({ page, collaborators: users })
  await sidebar.close({ page: page })
}

export interface canUserEditSpaceResourceArgs {
  resource: string
  page: Page
}

export const canUserEditSpaceResource = async (
  args: canUserEditSpaceResourceArgs
): Promise<boolean> => {
  const { resource, page } = args
  const notExpectedActions = ['move', 'rename', 'delete']
  await sidebar.open({ page: page, resource })
  await sidebar.openPanel({ page: page, name: 'actions' })
  const presentActions = await page.locator(sideBarActions).allTextContents()
  const presentActionsToLower = presentActions.map((actions) => actions.toLowerCase())
  for (const actions of notExpectedActions) {
    if (presentActionsToLower.includes(actions)) {
      return true
    }
  }
  return false
}

export const reloadSpacePage = async (page): Promise<void> => {
  await page.reload()
}

export const changeSpaceImage = async (args: {
  id: string
  page: Page
  resource: File
}): Promise<void> => {
  const { id, page, resource } = args
  await openActionsPanel(page)

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator(editImageOptionSelector).click()
  ])

  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith(encodeURIComponent(id)) &&
        resp.status() === 200 &&
        resp.request().method() === 'PATCH'
    ),
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith(resource.name) &&
        resp.status() === 207 &&
        resp.request().method() === 'PROPFIND'
    ),
    page.waitForResponse(
      (resp) =>
        resp.url().includes(resource.name) &&
        resp.status() === 200 &&
        resp.request().method() === 'GET'
    ),
    fileChooser.setFiles(resource.path)
  ])

  await sidebar.close({ page: page })
}

export interface removeAccessMembersArgs extends Omit<SpaceMembersArgs, 'users'> {
  users: Omit<ICollaborator, 'role'>[]
  removeOwnSpaceAccess?: boolean
}

export const removeAccessSpaceMembers = async (args: removeAccessMembersArgs): Promise<void> => {
  const { page, users, removeOwnSpaceAccess } = args
  await openSharingPanel(page)

  for (const collaborator of users) {
    await Collaborator.removeCollaborator({ page, collaborator, removeOwnSpaceAccess })
  }
}

export const changeSpaceRole = async (args: SpaceMembersArgs): Promise<void> => {
  const { page, users } = args
  await openSharingPanel(page)

  for (const collaborator of users) {
    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes('shares') &&
          resp.status() === 200 &&
          resp.request().method() === 'POST'
      ),
      Collaborator.changeCollaboratorRole({ page, collaborator })
    ])
  }
}

export const createPublicLinkForSpace = async (args: {
  page: Page
  password: string
}): Promise<string> => {
  const { page, password } = args
  await openSharingPanel(page)
  return createLink({ page: page, space: true, password: password })
}

export const addExpirationDateToMember = async (args: {
  page: Page
  member: Omit<ICollaborator, 'role'>
  expirationDate: string
}): Promise<void> => {
  const { page, member: collaborator, expirationDate } = args
  await openSharingPanel(page)
  await Collaborator.setExpirationDateForCollaborator({ page, collaborator, expirationDate })
}

export const removeExpirationDateFromMember = async (args: {
  page: Page
  member: Omit<ICollaborator, 'role'>
}): Promise<void> => {
  const { page, member: collaborator } = args
  await openSharingPanel(page)
  await Collaborator.removeExpirationDateFromCollaborator({ page, collaborator })
}

export const downloadSpace = async (page: Page): Promise<string> => {
  await openActionsPanel(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(downloadSpaceSelector).click()
  ])
  await sidebar.close({ page })

  return download.suggestedFilename()
}
