import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

interface Family {
  id: string
  name: string
  state: string
  schoolYearStart: string
  schoolYearEnd: string
  _count: { students: number }
}

export default function SelectFamily() {
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  useEffect(() => {
    api
      .get('/families')
      .then((res) => setFamilies(res.data))
      .catch(() => navigate('/login', { replace: true }))
      .finally(() => setLoading(false))
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <span className="text-xl font-bold text-primary-700">HomeAcademy</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900">Select a Family</h2>
          <p className="text-gray-500 mt-2">Choose which family to manage</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {families.map((family) => (
            <button
              key={family.id}
              onClick={() => navigate(`/family/${family.id}`)}
              className="bg-white p-6 rounded-lg shadow-sm border-2 border-transparent hover:border-primary-500 hover:shadow-md transition-all text-left"
            >
              <h3 className="text-xl font-semibold text-gray-900">{family.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {family.state} &middot;{' '}
                {family._count.students} student{family._count.students !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(family.schoolYearStart).toLocaleDateString()} &ndash;{' '}
                {new Date(family.schoolYearEnd).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>

        <p className="text-center mt-8">
          <button
            onClick={() => navigate('/settings/families')}
            className="text-sm text-primary-600 hover:text-primary-800"
          >
            Manage families in Settings
          </button>
        </p>
      </div>
    </div>
  )
}
