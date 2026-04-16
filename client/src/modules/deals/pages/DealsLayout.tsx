import { Outlet } from 'react-router-dom'
import { DevRoleSwitcher } from '../components/DevRoleSwitcher'

export function DealsLayout() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Outlet />
      <DevRoleSwitcher />
    </div>
  )
}
