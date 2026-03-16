import { useMutation, useQuery } from "@tanstack/react-query";
import * as attachmentsApi from "../api/attachments.api";

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

export function useAttachment(attachmentId: string) {
  return useQuery({
    queryKey: ["attachments", attachmentId],
    queryFn: () => attachmentsApi.getAttachment(attachmentId),
    staleTime: Infinity,
    enabled: !!attachmentId,
  });
}
