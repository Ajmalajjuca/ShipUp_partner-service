declare namespace Express {
  namespace MulterS3 {
    interface File extends Express.Multer.File {
      bucket: string;
      key: string;
      acl: string;
      contentType: string;
      contentDisposition: string;
      storageClass: string;
      serverSideEncryption: string;
      metadata: { [key: string]: string };
      location: string;
      etag: string;
    }
  }
} 