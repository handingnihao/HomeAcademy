import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function SettingsLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const nav = [
    { name: 'Families', href: '/settings/families' },
    { name: 'Students', href: '/settings/students' },
  ]

  const isActive = (href: string) => location.pathname === href

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-primary-700">HomeAcademy</span>
              <span className="text-gray-300">/</span>
              <span className="text-sm font-medium text-gray-700">Settings</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
              <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-56 bg-white shadow-sm min-h-[calc(100vh-4rem)] flex flex-col shrink-0">
          <div className="px-3 pt-4 pb-2">
            <Link to="/" className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 px-3 py-2">
              ← Dashboard
            </Link>
          </div>
          <nav className="px-3 py-2 space-y-1 flex-1">
            <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Settings
            </p>
            {nav.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
