import { useState, useEffect, FormEvent } from 'react'
import { api } from '../lib/api'

interface Family {
  id: string
  name: string
  state: string
  schoolYearStart: string
  schoolYearEnd: string
  _count: {
    students: number
  }
}

export default function Families() {
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
      const response = await api.get('/families')
      setFamilies(response.data)
    } catch (err) {
      console.error('Failed to fetch families:', err)
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
    if (!confirm('Are you sure you want to delete this family? This will delete all students and related data.')) {
      return
    }

    try {
      await api.delete(`/families/${id}`)
      fetchFamilies()
    } catch (err) {
      console.error('Failed to delete family:', err)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Families</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Family'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Family</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Family Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Smith Family Homeschool"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                required
                maxLength={2}
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="TN"
              />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Create Family
            </button>
          </form>
        </div>
      )}

      {families.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-md text-center">
          <p className="text-gray-500 mb-4">No families yet. Create your first family to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {families.map((family) => (
            <div key={family.id} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{family.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    State: {family.state} • {family._count.students} student(s)
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(family.schoolYearStart).toLocaleDateString()} - {new Date(family.schoolYearEnd).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(family.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
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
