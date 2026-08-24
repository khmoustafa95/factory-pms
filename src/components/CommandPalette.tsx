import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTranslation } from '@/contexts/LocaleContext'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useCommandProjectSearch } from '@/hooks/useProjects'
import type { AppNavItem } from '@/lib/nav'

interface CommandPaletteProps {
  navItems: AppNavItem[]
}

export function CommandPalette({ navItems }: CommandPaletteProps) {
  const { t, dir } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 250)
  const { data: projects = [] } = useCommandProjectSearch(debouncedQuery, open)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const goTo = (path: string) => {
    setOpen(false)
    setQuery('')
    void navigate(path)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="hidden h-8 gap-2 text-muted-foreground sm:inline-flex"
        onClick={() => setOpen(true)}
        aria-label={t('a11y.openCommandPalette')}
      >
        <Search className="size-3.5" />
        <span className="text-xs">{t('commandPalette.hint')}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-8 text-muted-foreground sm:hidden"
        onClick={() => setOpen(true)}
        aria-label={t('a11y.openCommandPalette')}
      >
        <Search className="size-4" />
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setQuery('')
          }
        }}
      >
        {open ? (
          <DialogContent
            showCloseButton={false}
            dismissOnOutsideClick
            className="overflow-hidden p-0 sm:max-w-lg duration-0 data-closed:animate-none"
            dir={dir}
          >
            <DialogTitle className="sr-only">
              {t('commandPalette.title')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('commandPalette.placeholder')}
            </DialogDescription>
            <Command label={t('commandPalette.title')}>
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder={t('commandPalette.placeholder')}
              />
              <CommandList>
                <CommandEmpty>{t('commandPalette.empty')}</CommandEmpty>
                <CommandGroup heading={t('commandPalette.navigation')}>
                  {navItems.map((item) => (
                    <CommandItem
                      key={item.to}
                      value={`${item.label} ${item.to}`}
                      onSelect={() => goTo(item.to)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {projects.length > 0 ? (
                  <CommandGroup heading={t('commandPalette.projects')}>
                    {projects.map((project) => (
                      <CommandItem
                        key={project.id}
                        value={`${project.title} ${project.status}`}
                        onSelect={() => goTo(`/projects/${project.id}`)}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {project.title}
                        </span>
                        <ProjectStatusBadge status={project.status} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
              </CommandList>
            </Command>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  )
}
