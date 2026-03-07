import { useAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="max-w-4xl">
      <div className="bg-white shadow rounded-lg p-8">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-primary-700">
            Welcome to HomeAcademy!
          </h1>

          {user && (
            <div className="space-y-2">
              <p className="text-xl text-gray-700">
                Hello, <span className="font-semibold">{user.email}</span>
              </p>
              <p className="text-sm text-gray-500">
                Role: <span className="font-medium text-gray-700">{user.role}</span>
              </p>
            </div>
          )}

          <div className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/families"
              className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
            >
              <div className="text-4xl mb-2">👨‍👩‍👧‍👦</div>
              <h3 className="text-lg font-semibold text-gray-900">Families</h3>
              <p className="text-sm text-gray-600 mt-1">Manage your homeschool families</p>
            </Link>

            <Link
              to="/students"
              className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
            >
              <div className="text-4xl mb-2">🎓</div>
              <h3 className="text-lg font-semibold text-gray-900">Students</h3>
              <p className="text-sm text-gray-600 mt-1">View and manage students</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
