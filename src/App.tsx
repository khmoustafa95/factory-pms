import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { HomePage } from '@/pages/HomePage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
      </Route>
    </Routes>
  )
}
