export type AttachmentKind =
  | 'pdf'
  | 'zip'
  | 'image'
  | 'code'
  | 'video'
  | 'slides'
  | 'document'
  | (string & {});

export interface Attachment {
  id: string;
  name: string;
  kind?: AttachmentKind;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
  createdAt?: string;
}

export interface AttachmentUploadPayload {
  name: string;
  kind?: AttachmentKind;
  sizeBytes?: number;
}

export type AttachmentDownloadInfo = Pick<Attachment, 'id' | 'name' | 'url'>;