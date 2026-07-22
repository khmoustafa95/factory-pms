import { Component, type ErrorInfo, type ReactNode } from 'react'
import { StatusMessage } from '@/components/StatusMessage'
import { Button } from '@/components/ui/button'

interface AppErrorBoundaryProps {
  children: ReactNode
  labels: {
    title: string
    description: string
    retry: string
  }
}

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled application error', error, errorInfo)
  }

  private handleRetry = () => {
    this.setState({ hasError: false })
    window.location.assign(window.location.pathname)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-md space-y-4 text-center">
            <h1 className="text-xl font-semibold">{this.props.labels.title}</h1>
            <StatusMessage variant="error" role="alert">
              {this.props.labels.description}
            </StatusMessage>
            <Button type="button" onClick={this.handleRetry}>
              {this.props.labels.retry}
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
