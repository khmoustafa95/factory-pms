import { Download, Paperclip, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FileDropzone } from '@/components/files/FileDropzone'
import { FileTypeIcon } from '@/components/files/FileTypeIcon'
import { QueryState } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LocaleContext'
import {
  ATTACHMENT_ACCEPT,
  createSignedAttachmentUrl,
  isAllowedAttachment,
  useDeleteProjectAttachment,
  useProjectAttachments,
  useUploadProjectAttachments,
  type ProjectAttachment,
} from '@/hooks/useProjectAttachments'
import { formatLocalizedDateTime } from '@/lib/i18n-format'
import { toastMutationError } from '@/lib/mutation-error'

interface ProjectAttachmentsPanelProps {
  projectId: string
  canManage: boolean
}

function formatFileSize(bytes: number | null, fallback: string): string {
  if (bytes == null) {
    return fallback
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ProjectAttachmentsPanel({
  projectId,
  canManage,
}: ProjectAttachmentsPanelProps) {
  const { t, locale } = useTranslation()
  const { user } = useAuth()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const {
    data: attachments = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useProjectAttachments(projectId)
  const uploadAttachments = useUploadProjectAttachments(projectId)
  const deleteAttachment = useDeleteProjectAttachment(projectId)

  const handleFiles = async (files: File[]) => {
    if (files.length === 0 || !user?.id) {
      return
    }

    const invalid = files.find((file) => !isAllowedAttachment(file))
    if (invalid) {
      toast.error(t('projects.attachments.invalidFile'))
      return
    }

    try {
      await uploadAttachments.mutateAsync({ userId: user.id, files })
      toast.success(t('projects.attachments.uploaded'))
    } catch (uploadError) {
      toastMutationError(uploadError, t('projects.attachments.uploadFailed'))
    }
  }

  const handleDownload = async (attachment: ProjectAttachment) => {
    setDownloadingId(attachment.id)
    try {
      const url = await createSignedAttachmentUrl(attachment.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (downloadError) {
      toastMutationError(
        downloadError,
        t('projects.attachments.downloadFailed'),
      )
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (attachment: ProjectAttachment) => {
    try {
      await deleteAttachment.mutateAsync(attachment)
      toast.success(t('projects.attachments.deleted'))
    } catch (deleteError) {
      toastMutationError(deleteError, t('projects.attachments.deleteFailed'))
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="size-4" />
          {t('projects.attachments.title')}
        </CardTitle>
        <CardDescription>
          {t('projects.attachments.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage ? (
          <FileDropzone
            disabled={uploadAttachments.isPending}
            accept={ATTACHMENT_ACCEPT}
            onFiles={(files) => void handleFiles(files)}
            idleLabel={
              uploadAttachments.isPending
                ? t('common.saving')
                : t('projects.attachments.dropHint')
            }
            activeLabel={t('projects.attachments.dropActive')}
          />
        ) : null}
        <QueryState
          isLoading={isLoading}
          error={error}
          loadingMessage={t('common.loading')}
          errorMessage={t('projects.attachments.loadFailed')}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        >
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('projects.attachments.empty')}
            </p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <FileTypeIcon
                      nameOrType={
                        attachment.mime_type || attachment.file_name
                      }
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {attachment.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(
                          attachment.file_size_bytes,
                          t('common.notAvailable'),
                        )}
                        {' · '}
                        {formatLocalizedDateTime(attachment.created_at, locale)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={downloadingId === attachment.id}
                      onClick={() => void handleDownload(attachment)}
                    >
                      <Download className="size-4" />
                      <span className="sr-only">
                        {t('projects.attachments.download')}
                      </span>
                    </Button>
                    {canManage ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={deleteAttachment.isPending}
                        onClick={() => void handleDelete(attachment)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                        <span className="sr-only">
                          {t('projects.attachments.delete')}
                        </span>
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </CardContent>
    </Card>
  )
}
