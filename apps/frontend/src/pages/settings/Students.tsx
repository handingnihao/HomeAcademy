import { useState, useEffect, FormEvent } from 'react'
import { api } from '../../lib/api'

interface Student {
  id: string
  firstName: string
  lastName: string
  gradeLevel: string
  dateOfBirth: string | null
  family: { id: string; name: string; state: string }
  _count: { subjects: number; attendanceRecords: number; grades: number }
}

interface Family {
  id: string
  name: string
}

export default function SettingsStudents() {
  const [students, setStudents] = useState<Student[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    familyId: '',
    firstName: '',
    lastName: '',
    gradeLevel: '',
    dateOfBirth: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.get('/students'), api.get('/families')]).then(([sr, fr]) => {
      setStudents(sr.data)
      setFamilies(fr.data)
      setLoading(false)
    })
  }, [])

  const fetchStudents = async () => {
    const res = await api.get('/students')
    setStudents(res.data)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const payload: Record<string, string> = {
        familyId: formData.familyId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        gradeLevel: formData.gradeLevel,
      }
      if (formData.dateOfBirth) payload.dateOfBirth = formData.dateOfBirth
      await api.post('/students', payload)
      setShowForm(false)
      setFormData({ familyId: '', firstName: '', lastName: '', gradeLevel: '', dateOfBirth: '' })
      fetchStudents()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add student')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this student? This will permanently delete all related data.')) return
    await api.delete(`/students/${id}`)
    fetchStudents()
  }

  if (loading) return <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage students across all families</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          disabled={families.length === 0}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {showForm ? 'Cancel' : '+ Add Student'}
        </button>
      </div>

      {families.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
          <p className="text-amber-800 text-sm">Create a family first before adding students.</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-base font-semibold mb-4">Add Student</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Family</label>
              <select
                required
                value={formData.familyId}
                onChange={(e) => setFormData({ ...formData, familyId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">Select a family</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="Smith"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                <input
                  type="text"
                  required
                  value={formData.gradeLevel}
                  onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="K, 1, 2 ... 12"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth (optional)
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
            >
              Add Student
            </button>
          </form>
        </div>
      )}

      {students.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-sm text-center">
          <p className="text-gray-400">No students yet. Add a student to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((student) => (
            <div key={student.id} className="bg-white p-5 rounded-lg shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {student.firstName} {student.lastName}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Grade {student.gradeLevel} &middot; {student.family.name}
                  </p>
                  <div className="flex gap-3 text-xs text-gray-400 mt-1.5">
                    <span>{student._count.subjects} subjects</span>
                    <span>{student._count.attendanceRecords} attendance records</span>
                    <span>{student._count.grades} grades</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(student.id)}
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
