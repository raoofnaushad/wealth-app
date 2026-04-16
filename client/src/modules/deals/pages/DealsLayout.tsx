import { Outlet } from 'react-router-dom'

export function DealsLayout() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Outlet />
    </div>
  )
}
