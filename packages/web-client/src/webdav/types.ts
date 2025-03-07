import { OwnCloudSdk } from '../types'
import { CreateFolderFactory } from './createFolder'
import { GetFileContentsFactory } from './getFileContents'
import { GetFileInfoFactory } from './getFileInfo'
import { GetFileUrlFactory } from './getFileUrl'
import { GetPublicFileUrlFactory } from './getPublicFileUrl'
import { ListFilesFactory } from './listFiles'
import { PutFileContentsFactory } from './putFileContents'
import { CopyFilesFactory } from './copyFiles'
import { MoveFilesFactory } from './moveFiles'
import { DeleteFileFactory } from './deleteFile'
import { RestoreFileFactory } from './restoreFile'
import { ListFileVersionsFactory } from './listFileVersions'
import { RestoreFileVersionFactory } from './restoreFileVersion'
import { ClearTrashBinFactory } from './clearTrashBin'
import { SearchFactory } from './search'
import { GetPathForFileIdFactory } from './getPathForFileId'
import { Capabilities } from '../ocs'
import { Ref } from 'vue'
import { ListFilesByIdFactory } from './listFilesById'
import { User } from '../generated'

export interface WebDavOptions {
  sdk: OwnCloudSdk
  accessToken: Ref<string>
  baseUrl: string
  capabilities: Ref<Capabilities['capabilities']>
  clientService: any
  language: Ref<string>
  user: Ref<User>
}

export interface WebDAV {
  getFileInfo: ReturnType<typeof GetFileInfoFactory>['getFileInfo']
  getFileUrl: ReturnType<typeof GetFileUrlFactory>['getFileUrl']
  getPublicFileUrl: ReturnType<typeof GetPublicFileUrlFactory>['getPublicFileUrl']
  revokeUrl: ReturnType<typeof GetFileUrlFactory>['revokeUrl']
  listFiles: ReturnType<typeof ListFilesFactory>['listFiles']
  listFilesById: ReturnType<typeof ListFilesByIdFactory>['listFilesById']
  createFolder: ReturnType<typeof CreateFolderFactory>['createFolder']
  getFileContents: ReturnType<typeof GetFileContentsFactory>['getFileContents']
  putFileContents: ReturnType<typeof PutFileContentsFactory>['putFileContents']
  getPathForFileId: ReturnType<typeof GetPathForFileIdFactory>['getPathForFileId']
  copyFiles: ReturnType<typeof CopyFilesFactory>['copyFiles']
  moveFiles: ReturnType<typeof MoveFilesFactory>['moveFiles']
  deleteFile: ReturnType<typeof DeleteFileFactory>['deleteFile']
  restoreFile: ReturnType<typeof RestoreFileFactory>['restoreFile']
  listFileVersions: ReturnType<typeof ListFileVersionsFactory>['listFileVersions']
  restoreFileVersion: ReturnType<typeof RestoreFileVersionFactory>['restoreFileVersion']
  clearTrashBin: ReturnType<typeof ClearTrashBinFactory>['clearTrashBin']
  search: ReturnType<typeof SearchFactory>['search']
}
