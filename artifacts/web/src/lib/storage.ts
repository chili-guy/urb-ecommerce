import { supabase } from "./supabase";

/** Bucket público criado em supabase/migrations/0004_feature_pack.sql. */
export const PRODUCT_IMAGE_BUCKET = "product-images";
/** Bucket público criado em supabase/migrations/0007_banners_and_visits.sql. */
export const SITE_MEDIA_BUCKET = "site-media";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

/**
 * Envia um arquivo de imagem pro Storage e devolve a URL pública.
 * A escrita nos buckets é restrita à equipe pela RLS de storage.objects.
 */
async function uploadImage(bucket: string, file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Formato inválido. Use JPG, PNG, WebP ou GIF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Imagem muito grande (máx. 5 MB).");
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });
  if (error) throw error;

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export function uploadProductImage(file: File): Promise<string> {
  return uploadImage(PRODUCT_IMAGE_BUCKET, file);
}

export function uploadSiteMedia(file: File): Promise<string> {
  return uploadImage(SITE_MEDIA_BUCKET, file);
}
