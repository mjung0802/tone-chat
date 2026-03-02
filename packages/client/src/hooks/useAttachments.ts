import { useMutation } from '@tanstack/react-query';
import * as attachmentsApi from '../api/attachments.api';

export function useUpload() {
  return useMutation({
    mutationFn: ({
      data,
      filename,
      contentType,
    }: {
      data: ArrayBuffer | Blob;
      filename: string;
      contentType: string;
    }) => attachmentsApi.uploadAttachment(data, filename, contentType),
    onSuccess: (response) => response.attachment,
  });
}
