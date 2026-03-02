import { get, uploadRaw } from './client';
import type { AttachmentResponse } from '../types/api.types';

export function uploadAttachment(
  data: ArrayBuffer | Blob,
  filename: string,
  contentType: string,
) {
  const encodedName = encodeURIComponent(filename);
  return uploadRaw<AttachmentResponse>(
    `/attachments/upload?filename=${encodedName}`,
    data,
    contentType,
  );
}

export function getAttachment(attachmentId: string) {
  return get<AttachmentResponse>(`/attachments/${attachmentId}`);
}
