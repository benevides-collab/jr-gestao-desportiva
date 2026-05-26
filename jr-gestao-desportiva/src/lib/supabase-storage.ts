import "server-only";

const maxPhotoSize = 2 * 1024 * 1024;
const acceptedPhotoTypes = ["image/jpeg", "image/png", "image/webp"];
const maxDocumentSize = 10 * 1024 * 1024;
const acceptedDocumentTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

type StorageConfig = {
  supabaseUrl: string;
  supabaseKey: string;
};

function getStorageConfig() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("PHOTO_STORAGE_NOT_CONFIGURED");
  }

  return {
    supabaseUrl,
    supabaseKey,
  };
}

function getStorageHeaders(supabaseKey: string) {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };
}

async function ensureAthletePhotosBucket({
  supabaseUrl,
  supabaseKey,
  bucketName,
}: StorageConfig & { bucketName: string }) {
  const bucketUrl = `${supabaseUrl}/storage/v1/bucket/${bucketName}`;
  const headers = getStorageHeaders(supabaseKey);
  const bucketResponse = await fetch(bucketUrl, {
    headers,
  });

  if (bucketResponse.ok) {
    const bucket = (await bucketResponse.json()) as { public?: boolean };

    if (bucket.public) {
      return;
    }

    const updateResponse = await fetch(bucketUrl, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        public: true,
        file_size_limit: maxPhotoSize,
        allowed_mime_types: acceptedPhotoTypes,
      }),
    });

    if (!updateResponse.ok) {
      throw new Error("PHOTO_BUCKET_UNAVAILABLE");
    }

    return;
  }

  if (bucketResponse.status !== 404) {
    throw new Error("PHOTO_BUCKET_UNAVAILABLE");
  }

  const createResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: bucketName,
      name: bucketName,
      public: true,
      file_size_limit: maxPhotoSize,
      allowed_mime_types: acceptedPhotoTypes,
    }),
  });

  if (!createResponse.ok) {
    throw new Error("PHOTO_BUCKET_UNAVAILABLE");
  }
}

async function ensurePrivateDocumentBucket({
  supabaseUrl,
  supabaseKey,
  bucketName,
}: StorageConfig & { bucketName: string }) {
  const bucketUrl = `${supabaseUrl}/storage/v1/bucket/${bucketName}`;
  const headers = getStorageHeaders(supabaseKey);
  const bucketResponse = await fetch(bucketUrl, { headers });

  if (bucketResponse.ok) {
    const bucket = (await bucketResponse.json()) as { public?: boolean };

    if (!bucket.public) {
      return;
    }

    const updateResponse = await fetch(bucketUrl, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        public: false,
        file_size_limit: maxDocumentSize,
        allowed_mime_types: acceptedDocumentTypes,
      }),
    });

    if (!updateResponse.ok) {
      throw new Error("DOCUMENT_BUCKET_UNAVAILABLE");
    }

    return;
  }

  if (bucketResponse.status !== 404) {
    throw new Error("DOCUMENT_BUCKET_UNAVAILABLE");
  }

  const createResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: bucketName,
      name: bucketName,
      public: false,
      file_size_limit: maxDocumentSize,
      allowed_mime_types: acceptedDocumentTypes,
    }),
  });

  if (!createResponse.ok) {
    throw new Error("DOCUMENT_BUCKET_UNAVAILABLE");
  }
}

async function uploadPersonPhoto(file: File, ownerId: string, bucketName: string) {
  if (!acceptedPhotoTypes.includes(file.type)) {
    throw new Error("INVALID_PHOTO_TYPE");
  }

  if (file.size > maxPhotoSize) {
    throw new Error("PHOTO_TOO_LARGE");
  }

  const { supabaseUrl, supabaseKey } = getStorageConfig();
  await ensureAthletePhotosBucket({ supabaseUrl, supabaseKey, bucketName });

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${ownerId}/${crypto.randomUUID()}.${extension}`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${path}`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      ...getStorageHeaders(supabaseKey),
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: await file.arrayBuffer(),
  });

  if (!response.ok) {
    throw new Error("PHOTO_UPLOAD_FAILED");
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${path}`;
}

export async function uploadAthletePhoto(file: File, athleteId: string) {
  return uploadPersonPhoto(file, athleteId, "athlete-photos");
}

export async function uploadGuardianPhoto(file: File, guardianId: string) {
  return uploadPersonPhoto(file, guardianId, "guardian-photos");
}

export async function uploadStaffPhoto(file: File, staffMemberId: string) {
  return uploadPersonPhoto(file, staffMemberId, "staff-photos");
}

export async function uploadAthleteDocument(file: File, athleteId: string) {
  if (!acceptedDocumentTypes.includes(file.type)) {
    throw new Error("INVALID_DOCUMENT_TYPE");
  }

  if (file.size > maxDocumentSize) {
    throw new Error("DOCUMENT_TOO_LARGE");
  }

  const { supabaseUrl, supabaseKey } = getStorageConfig();
  const bucketName = "athlete-documents";
  await ensurePrivateDocumentBucket({ supabaseUrl, supabaseKey, bucketName });

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${athleteId}/${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${path}`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      ...getStorageHeaders(supabaseKey),
      "Content-Type": file.type,
      "x-upsert": "false",
    },
    body: await file.arrayBuffer(),
  });

  if (!response.ok) {
    throw new Error("DOCUMENT_UPLOAD_FAILED");
  }

  return path;
}

export async function createAthleteDocumentSignedUrl(filePath: string) {
  const { supabaseUrl, supabaseKey } = getStorageConfig();
  const bucketName = "athlete-documents";
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/sign/${bucketName}/${filePath}`,
    {
      method: "POST",
      headers: {
        ...getStorageHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 60 }),
    }
  );

  if (!response.ok) {
    throw new Error("DOCUMENT_SIGN_URL_FAILED");
  }

  const payload = (await response.json()) as { signedURL?: string };

  if (!payload.signedURL) {
    throw new Error("DOCUMENT_SIGN_URL_FAILED");
  }

  return `${supabaseUrl}/storage/v1${payload.signedURL}`;
}

export async function deleteAthleteDocument(filePath: string) {
  const { supabaseUrl, supabaseKey } = getStorageConfig();
  const bucketName = "athlete-documents";
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`,
    {
      method: "DELETE",
      headers: getStorageHeaders(supabaseKey),
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error("DOCUMENT_DELETE_FAILED");
  }
}

export function isPhotoUploadConfigured() {
  return Boolean(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function isDocumentUploadConfigured() {
  return Boolean(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
