import { useState, useEffect, FormEvent } from 'react'
import { api } from '../lib/api'

interface Student {
  id: string
  firstName: string
  lastName: string
  gradeLevel: string
  dateOfBirth: string | null
  family: {
    id: string
    name: string
    state: string
  }
  _count: {
    subjects: number
    attendanceRecords: number
    grades: number
  }
}

interface Family {
  id: string
  name: string
}

export default function Students() {
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
    fetchStudents()
    fetchFamilies()
  }, [])

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students')
      setStudents(response.data)
    } catch (err) {
      console.error('Failed to fetch students:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchFamilies = async () => {
    try {
      const response = await api.get('/families')
      setFamilies(response.data)
    } catch (err) {
      console.error('Failed to fetch families:', err)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const payload: any = {
        familyId: formData.familyId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        gradeLevel: formData.gradeLevel,
      }

      if (formData.dateOfBirth) {
        payload.dateOfBirth = formData.dateOfBirth
      }

      await api.post('/students', payload)
      setShowForm(false)
      setFormData({ familyId: '', firstName: '', lastName: '', gradeLevel: '', dateOfBirth: '' })
      fetchStudents()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create student')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student? This will delete all related data.')) {
      return
    }

    try {
      await api.delete(`/students/${id}`)
      fetchStudents()
    } catch (err) {
      console.error('Failed to delete student:', err)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Students</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          disabled={families.length === 0}
        >
          {showForm ? 'Cancel' : '+ New Student'}
        </button>
      </div>

      {families.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            Please create a family first before adding students.
          </p>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Student</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Family
              </label>
              <select
                required
                value={formData.familyId}
                onChange={(e) => setFormData({ ...formData, familyId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select a family</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Smith"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grade Level
                </label>
                <input
                  type="text"
                  required
                  value={formData.gradeLevel}
                  onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="K, 1, 2, ... 12"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Add Student
            </button>
          </form>
        </div>
      )}

      {students.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-md text-center">
          <p className="text-gray-500 mb-4">No students yet. Add your first student to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {students.map((student) => (
            <div key={student.id} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {student.firstName} {student.lastName}
                  </h3>
                  <p className="text-sm text-gray-600">Grade {student.gradeLevel}</p>
                </div>
                <button
                  onClick={() => handleDelete(student.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  <span className="font-medium">Family:</span> {student.family.name}
                </p>
                {student.dateOfBirth && (
                  <p className="text-gray-600">
                    <span className="font-medium">DOB:</span> {new Date(student.dateOfBirth).toLocaleDateString()}
                  </p>
                )}
                <div className="flex gap-4 text-gray-500 pt-2 border-t">
                  <span>{student._count.subjects} subjects</span>
                  <span>{student._count.attendanceRecords} attendance</span>
                  <span>{student._count.grades} grades</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
