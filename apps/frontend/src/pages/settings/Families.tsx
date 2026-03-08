import { useState, useEffect, FormEvent } from 'react'
import { api } from '../../lib/api'

interface Family {
  id: string
  name: string
  state: string
  schoolYearStart: string
  schoolYearEnd: string
  _count: { students: number }
}

export default function SettingsFamilies() {
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    state: '',
    schoolYearStart: '',
    schoolYearEnd: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchFamilies()
  }, [])

  const fetchFamilies = async () => {
    try {
      const res = await api.get('/families')
      setFamilies(res.data)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/families', formData)
      setShowForm(false)
      setFormData({ name: '', state: '', schoolYearStart: '', schoolYearEnd: '' })
      fetchFamilies()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create family')
    }
  }

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'Delete this family? This will permanently delete all students, attendance records, and grades.'
      )
    )
      return
    try {
      await api.delete(`/families/${id}`)
      fetchFamilies()
    } catch {
      // handled by axios interceptor
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Families</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your homeschool families</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          {showForm ? 'Cancel' : '+ New Family'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-base font-semibold mb-4">Create New Family</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Family Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="Smith Family Homeschool"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="TN"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School Year Start
                </label>
                <input
                  type="date"
                  required
                  value={formData.schoolYearStart}
                  onChange={(e) => setFormData({ ...formData, schoolYearStart: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School Year End
                </label>
                <input
                  type="date"
                  required
                  value={formData.schoolYearEnd}
                  onChange={(e) => setFormData({ ...formData, schoolYearEnd: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
            >
              Create Family
            </button>
          </form>
        </div>
      )}

      {families.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-sm text-center">
          <p className="text-gray-400">No families yet. Create your first family to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {families.map((family) => (
            <div key={family.id} className="bg-white p-5 rounded-lg shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{family.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {family.state} &middot; {family._count.students} student
                    {family._count.students !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(family.schoolYearStart).toLocaleDateString()} &ndash;{' '}
                    {new Date(family.schoolYearEnd).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(family.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
