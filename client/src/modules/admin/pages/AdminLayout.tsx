import { Outlet } from 'react-router-dom'

export function AdminLayout() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Outlet />
    </div>
  )
}
