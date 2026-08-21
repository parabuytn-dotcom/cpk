"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { uploadResourceSchema, type FormState } from "./schemas";

export async function uploadCourseResource(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) return { message: "Connecte-toi d'abord." };
  if (profile.role !== "admin" && !profile.tags.includes("scribe")) {
    return { message: "Tu n'as pas la permission d'uploader (réservé aux Scribes)." };
  }

  const validated = uploadResourceSchema.safeParse({
    classId: formData.get("classId"),
    className: formData.get("className"),
    subject: formData.get("subject"),
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { message: "Choisis un fichier à uploader." };
  }

  const supabase = await createClient();
  const path = `${validated.data.classId}/${randomBytes(6).toString("hex")}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;

  const { error: uploadError } = await supabase.storage
    .from("course-resources")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { message: uploadError.message };

  const { error } = await supabase.from("course_resources").insert({
    class_id: validated.data.classId,
    class_name: validated.data.className,
    subject: validated.data.subject,
    file_path: path,
    file_name: file.name,
    uploaded_by: profile.id,
  });

  if (error) return { message: error.message };

  revalidatePath("/cours");
  return { success: "Cours ajouté au Vault." };
}

export async function incrementResourceView(resourceId: string) {
  const supabase = await createClient();
  await supabase.rpc("increment_resource_views", { resource_id: resourceId });
}

export async function deleteCourseResource(resourceId: string) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Non connecté.");

  const supabase = await createClient();
  const { error } = await supabase.from("course_resources").delete().eq("id", resourceId);
  if (error) throw new Error(error.message);

  revalidatePath("/cours");
}
