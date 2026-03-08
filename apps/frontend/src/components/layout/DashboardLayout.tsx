import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'

interface FamilyHeader {
  id: string
  name: string
}

export default function DashboardLayout() {
  const { familyId } = useParams<{ familyId: string }>()
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [family, setFamily] = useState<FamilyHeader | null>(null)

  useEffect(() => {
    if (!familyId) return
    api.get(`/families/${familyId}`)
      .then((res) => setFamily({ id: res.data.id, name: res.data.name }))
      .catch(() => navigate('/', { replace: true }))
  }, [familyId, navigate])

  const nav = [
    { name: 'Home', href: `/family/${familyId}`, exact: true, icon: '⊞' },
    { name: 'Attendance', href: `/family/${familyId}/attendance`, icon: '◫' },
    { name: 'Subjects', href: `/family/${familyId}/subjects`, icon: '▤' },
  ]

  const isActive = (href: string, exact = false) =>
    exact ? location.pathname === href : location.pathname.startsWith(href)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-primary-700">HomeAcademy</span>
              {family && (
                <>
                  <span className="text-gray-300">/</span>
                  <span className="text-sm font-medium text-gray-700">{family.name}</span>
                </>
              )}
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
          <nav className="px-3 py-5 space-y-1 flex-1">
            {nav.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  isActive(item.href, item.exact)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2.5 text-base leading-none">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="px-3 py-4 border-t border-gray-100 space-y-1">
            <Link
              to="/settings/families"
              className="flex items-center px-3 py-2.5 text-sm font-medium rounded-md text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <span className="mr-2.5 text-base leading-none">⚙</span>
              Settings
            </Link>
            <button
              onClick={() => navigate('/select-family')}
              className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-md text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <span className="mr-2.5 text-base leading-none">⇄</span>
              Switch Family
            </button>
          </div>
        </aside>

        <main className="flex-1 p-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
