import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getSupabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type ProjectAttachment =
  Database['public']['Tables']['project_attachments']['Row']

const PROJECT_ATTACHMENTS_BUCKET = 'project-attachments'
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.webp,.csv,.xls,.xlsx,.doc,.docx,.txt'

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])

export function isAllowedAttachment(file: File): boolean {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return false
  }

  if (file.type && ALLOWED_MIME_TYPES.has(file.type)) {
    return true
  }

  // Some browsers omit MIME for .csv / Office files — allow by extension.
  const extension = file.name.split('.').pop()?.toLowerCase()
  return (
    extension === 'pdf' ||
    extension === 'png' ||
    extension === 'jpg' ||
    extension === 'jpeg' ||
    extension === 'webp' ||
    extension === 'csv' ||
    extension === 'xls' ||
    extension === 'xlsx' ||
    extension === 'doc' ||
    extension === 'docx' ||
    extension === 'txt'
  )
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^\w.\-() ]+/g, '_').slice(0, 180)
}

function buildStoragePath(projectId: string, fileName: string): string {
  const safeName = sanitizeFileName(fileName)
  return `${projectId}/${crypto.randomUUID()}-${safeName}`
}

export function useProjectAttachments(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projectAttachments(projectId),
    enabled: Boolean(projectId),
    queryFn: async (): Promise<ProjectAttachment[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('project_attachments')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return data
    },
  })
}

export async function uploadProjectAttachments({
  projectId,
  userId,
  files,
}: {
  projectId: string
  userId: string
  files: File[]
}): Promise<ProjectAttachment[]> {
  if (files.length === 0) {
    return []
  }

  const supabase = getSupabase()
  const uploaded: ProjectAttachment[] = []

  for (const file of files) {
    if (!isAllowedAttachment(file)) {
      throw new Error('INVALID_ATTACHMENT')
    }

    const storagePath = buildStoragePath(projectId, file.name)
    const { error: uploadError } = await supabase.storage
      .from(PROJECT_ATTACHMENTS_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || undefined,
        upsert: false,
      })

    if (uploadError) {
      throw uploadError
    }

    const { data, error } = await supabase
      .from('project_attachments')
      .insert({
        project_id: projectId,
        uploaded_by: userId,
        file_name: file.name,
        storage_path: storagePath,
        mime_type: file.type || null,
        file_size_bytes: file.size,
      })
      .select('*')
      .single()

    if (error) {
      await supabase.storage
        .from(PROJECT_ATTACHMENTS_BUCKET)
        .remove([storagePath])
      throw error
    }

    uploaded.push(data)
  }

  return uploaded
}

export function useUploadProjectAttachments(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      files,
    }: {
      userId: string
      files: File[]
    }) => {
      if (!projectId) {
        throw new Error('Missing project id')
      }

      return uploadProjectAttachments({ projectId, userId, files })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectAttachments(projectId),
      })
    },
  })
}

export function useDeleteProjectAttachment(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (attachment: ProjectAttachment) => {
      const supabase = getSupabase()
      const { error: storageError } = await supabase.storage
        .from(PROJECT_ATTACHMENTS_BUCKET)
        .remove([attachment.storage_path])

      if (storageError) {
        throw storageError
      }

      const { error } = await supabase
        .from('project_attachments')
        .delete()
        .eq('id', attachment.id)

      if (error) {
        throw error
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectAttachments(projectId),
      })
    },
  })
}

export async function createSignedAttachmentUrl(
  storagePath: string,
): Promise<string> {
  const supabase = getSupabase()
  const { data, error } = await supabase.storage
    .from(PROJECT_ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, 60 * 10)

  if (error) {
    throw error
  }

  return data.signedUrl
}
