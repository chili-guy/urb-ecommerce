import { supabase } from "./supabase";

/** Bucket público criado em supabase/migrations/0004_feature_pack.sql. */
export const PRODUCT_IMAGE_BUCKET = "product-images";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

/**
 * Envia um arquivo de imagem para o Storage e devolve a URL pública.
 * A escrita no bucket é restrita à equipe pela RLS de storage.objects.
 */
export async function uploadProductImage(file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Formato inválido. Use JPG, PNG, WebP ou GIF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Imagem muito grande (máx. 5 MB).");
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });
  if (error) throw error;

  return supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path).data
    .publicUrl;
}
