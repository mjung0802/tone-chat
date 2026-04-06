import { config } from '../config/index.js';

const base = () => config.attachmentsServiceUrl;

export async function uploadAttachment(userToken: string, body: Buffer, contentType: string, filename: string) {
  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(body)], { type: contentType }), filename);

  const res = await fetch(`${base()}/attachments/upload`, {
    method: 'POST',
    headers: {
      'X-Internal-Key': config.internalApiKey,
      'X-User-Token': userToken,
    },
    body: formData,
  });

  const data: unknown = await res.json();
  return { status: res.status, data };
}

export async function getAttachment(userToken: string, attachmentId: string) {
  const res = await fetch(`${base()}/attachments/${attachmentId}`, {
    headers: {
      'X-Internal-Key': config.internalApiKey,
      'X-User-Token': userToken,
    },
  });

  const data: unknown = await res.json();
  return { status: res.status, data };
}
