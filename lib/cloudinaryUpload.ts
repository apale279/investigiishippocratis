/** Upload non firmato (preset "unsigned" su Cloudinary). Cloud name e preset da env pubbliche. */

const DEFAULT_CLOUD = "dqc51cg3h";
const DEFAULT_PRESET = "foto_medicina";

function cloudName(): string {
  return process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? DEFAULT_CLOUD;
}

function uploadPreset(): string {
  return process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? DEFAULT_PRESET;
}

export async function uploadImageToCloudinary(file: File): Promise<string> {
  const cloud = cloudName();
  const preset = uploadPreset();
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", preset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body: fd,
  });

  const data = (await res.json()) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !data.secure_url) {
    throw new Error(data.error?.message ?? "Upload fallito");
  }
  return data.secure_url;
}

export async function uploadImagesToCloudinary(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    urls.push(await uploadImageToCloudinary(file));
  }
  return urls;
}
