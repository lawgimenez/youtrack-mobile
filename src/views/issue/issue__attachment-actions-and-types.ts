import {
  attachmentActionMap,
  createAttachmentTypes,
} from 'components/attachments-row/attachment-helper';
import {getAttachmentActions} from 'components/attachments-row/attachment-actions';
import type {AttachmentActions} from 'components/attachments-row/attachment-actions';
const PREFIX: string = 'issueState';
export const attachmentTypes: any = createAttachmentTypes(PREFIX);
export const attachmentActions: AttachmentActions = getAttachmentActions(
  PREFIX,
);