import { config } from '../config/index.js';

const base = () => config.attachmentsServiceUrl;

export async function uploadAttachment(userId: string, body: Buffer, contentType: string, filename: string) {
  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(body)], { type: contentType }), filename);

  const res = await fetch(`${base()}/attachments/upload`, {
    method: 'POST',
    headers: {
      'X-Internal-Key': config.internalApiKey,
      'X-User-Id': userId,
    },
    body: formData,
  });

  const data: unknown = await res.json();
  return { status: res.status, data };
}

export async function getAttachment(userId: string, attachmentId: string) {
  const res = await fetch(`${base()}/attachments/${attachmentId}`, {
    headers: {
      'X-Internal-Key': config.internalApiKey,
      'X-User-Id': userId,
    },
  });

  const data: unknown = await res.json();
  return { status: res.status, data };
}

export async function deleteAttachment(userId: string, attachmentId: string) {
  const res = await fetch(`${base()}/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: {
      'X-Internal-Key': config.internalApiKey,
      'X-User-Id': userId,
    },
  });

  if (res.status === 204) {
    return { status: res.status, data: null };
  }

  const data: unknown = await res.json();
  return { status: res.status, data };
}

export async function getPublicAttachment(token: string) {
  const res = await fetch(`${base()}/attachments/public/${token}`);

  if (!res.ok) {
    return { status: res.status, body: null, contentType: null };
  }

  const arrayBuffer = await res.arrayBuffer();
  const body = Buffer.from(arrayBuffer);
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
  return { status: res.status, body, contentType };
}
