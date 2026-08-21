import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";

export type CourseResourceRow = {
  id: string;
  subject: string;
  fileName: string;
  fileUrl: string | null;
  uploadedById: string | null;
  uploadedByName: string | null;
  viewCount: number;
  createdAt: string;
};

export async function listCourseResources(classId: string): Promise<CourseResourceRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("course_resources")
    .select(
      "id, subject, file_path, file_name, view_count, created_at, uploaded_by, profiles(full_name, parent_first_name)",
    )
    .eq("class_id", classId)
    .order("created_at", { ascending: false });

  if (!data) return [];

  return Promise.all(
    data.map(async (row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const { data: signed } = await supabase.storage
        .from("course-resources")
        .createSignedUrl(row.file_path, 3600);

      return {
        id: row.id,
        subject: row.subject,
        fileName: row.file_name,
        fileUrl: signed?.signedUrl ?? null,
        uploadedById: row.uploaded_by,
        uploadedByName: profile?.full_name ?? profile?.parent_first_name ?? null,
        viewCount: row.view_count,
        createdAt: row.created_at,
      };
    }),
  );
}
