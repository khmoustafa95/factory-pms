import {
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type FileKind =
  | 'image'
  | 'pdf'
  | 'excel'
  | 'word'
  | 'csv'
  | 'text'
  | 'video'
  | 'audio'
  | 'archive'
  | 'code'
  | 'file'

const KIND_ICONS: Record<FileKind, LucideIcon> = {
  image: FileImage,
  pdf: FileText,
  excel: FileSpreadsheet,
  word: FileText,
  csv: FileSpreadsheet,
  text: FileText,
  video: FileVideo,
  audio: FileAudio,
  archive: FileArchive,
  code: FileCode,
  file: FileText,
}

const KIND_CLASS: Record<FileKind, string> = {
  image: 'text-sky-600 dark:text-sky-400',
  pdf: 'text-red-600 dark:text-red-400',
  excel: 'text-emerald-600 dark:text-emerald-400',
  word: 'text-blue-600 dark:text-blue-400',
  csv: 'text-emerald-600 dark:text-emerald-400',
  text: 'text-muted-foreground',
  video: 'text-violet-600 dark:text-violet-400',
  audio: 'text-amber-600 dark:text-amber-400',
  archive: 'text-orange-600 dark:text-orange-400',
  code: 'text-slate-600 dark:text-slate-300',
  file: 'text-muted-foreground',
}

function getFileKind(nameOrType: string): FileKind {
  const value = nameOrType.toLowerCase()

  if (
    value.includes('image') ||
    /\.(png|jpe?g|webp|gif|svg)$/.test(value) ||
    value.endsWith('png') ||
    value.endsWith('jpg') ||
    value.endsWith('jpeg') ||
    value.endsWith('webp')
  ) {
    return 'image'
  }

  if (value.includes('pdf') || value.endsWith('.pdf')) {
    return 'pdf'
  }

  if (
    value.includes('spreadsheet') ||
    value.includes('excel') ||
    /\.xlsx?$/.test(value)
  ) {
    return 'excel'
  }

  if (value.includes('csv') || value.endsWith('.csv')) {
    return 'csv'
  }

  if (
    value.includes('word') ||
    value.includes('msword') ||
    /\.docx?$/.test(value)
  ) {
    return 'word'
  }

  if (value.includes('video') || /\.(mp4|mov|webm)$/.test(value)) {
    return 'video'
  }

  if (value.includes('audio') || /\.(mp3|wav|ogg)$/.test(value)) {
    return 'audio'
  }

  if (value.includes('zip') || /\.(zip|rar|7z)$/.test(value)) {
    return 'archive'
  }

  if (/\.(json|js|ts|tsx|css|html)$/.test(value)) {
    return 'code'
  }

  if (value.includes('text') || value.endsWith('.txt')) {
    return 'text'
  }

  return 'file'
}

interface FileTypeIconProps {
  nameOrType: string
  className?: string
}

export function FileTypeIcon({ nameOrType, className }: FileTypeIconProps) {
  const kind = getFileKind(nameOrType)
  const Icon = KIND_ICONS[kind]

  return (
    <Icon
      aria-hidden
      className={cn('size-4 shrink-0', KIND_CLASS[kind], className)}
    />
  )
}
