/* @flow */

import type {PermissionCacheItem} from '../../flow/Permission';
import type {IssueProject} from '../../flow/CustomFields';

class PermissionsStore {
  permissionsMap: Object;

  constructor(permissions: Array<PermissionCacheItem>) {
    const permissionsWithProjects = (Array.isArray(permissions) ? permissions : []).map((permission: PermissionCacheItem) => {
      permission.projectIds = (permission.projects || []).map((project: IssueProject) => project.id);
      return permission;
    });

    this.permissionsMap = new Map(permissionsWithProjects.map(it => [it.permission.key, it]));
  }

  has(permissionId: string, projectId: string) {
    const permission: PermissionCacheItem = this.permissionsMap.get(permissionId);
    if (!permission) {
      return false;
    }

    if (permission.global) {
      return true;
    }

    return permission.projectIds.indexOf(projectId) !== -1;
  }

  hasEvery(permissionIds: Array<string>, projectId: string) {
    return (permissionIds || []).every(permissionId => this.has(permissionId, projectId));
  }

  hasSome(permissionIds: Array<string>, projectId: string) {
    return (permissionIds || []).some(permissionId => this.has(permissionId, projectId));
  }
}

export type { PermissionsStore };

export default PermissionsStore;
