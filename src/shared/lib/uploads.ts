export const PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];
export const VIDEO_ACCEPT = [...VIDEO_TYPES, ...VIDEO_EXTENSIONS].join(",");

export const MAX_PHOTO_SIZE_MB = 12;
export const MAX_VIDEO_SIZE_MB = 200;

export const PHOTO_UPLOAD_HINT =
  "Фото: JPG, PNG, WEBP, HEIC, HEIF до 12 МБ. Изображения автоматически подготавливаются к загрузке.";

export const VIDEO_UPLOAD_HINT =
  "Видео: MP4, WEBM, MOV до 200 МБ.";

export const PROFILE_MEDIA_MODERATION_WARNING =
  "Важно: модераторы проверяют фото и видео профилей. Загружайте только свои фото и видео. Если будут обнаружены чужие фото, случайные картинки, не относящиеся изображения или другие некорректные материалы, аккаунт будет временно деактивирован до исправления.";

export const isAllowedPhotoFile = (file: File) => {
  const lowerName = file.name.toLowerCase();
  return (
    PHOTO_TYPES.includes(file.type) ||
    PHOTO_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  );
};

export const isAllowedVideoFile = (file: File) => {
  const lowerName = file.name.toLowerCase();
  return (
    VIDEO_TYPES.includes(file.type) ||
    VIDEO_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  );
};

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("IMAGE_LOAD_FAILED"));
    };
    image.src = objectUrl;
  });

export const preparePhotoFile = async (file: File): Promise<File> => {
  if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
    throw new Error(`PHOTO_TOO_LARGE:${MAX_PHOTO_SIZE_MB}`);
  }

  if (file.type === "image/webp") {
    return file;
  }

  try {
    const image = await loadImage(file);
    const maxDimension = 2200;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.86)
    );
    if (!blob) return file;

    const fileName = file.name.replace(/\.[^.]+$/, "") || "profile-photo";
    return new File([blob], `${fileName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
};

export const assertVideoSize = (file: File) => {
  if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
    throw new Error(`VIDEO_TOO_LARGE:${MAX_VIDEO_SIZE_MB}`);
  }
};

export const getUploadErrorMessage = (error: unknown, kind: "photo" | "video") => {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("PHOTO_TOO_LARGE:")) {
    return `Фото слишком большое. Максимум ${MAX_PHOTO_SIZE_MB} МБ.`;
  }
  if (message.startsWith("VIDEO_TOO_LARGE:")) {
    return `Видео слишком большое. Максимум ${MAX_VIDEO_SIZE_MB} МБ.`;
  }
  return kind === "photo" ? "Ошибка загрузки фотографий" : "Ошибка загрузки видео";
};
