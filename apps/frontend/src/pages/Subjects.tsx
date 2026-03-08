import { useEffect, useState, FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'

interface Student {
  id: string
  firstName: string
  lastName: string
  gradeLevel: string
}

interface Subject {
  id: string
  studentId: string
  name: string
  color: string
  curriculumName: string | null
  isActive: boolean
  _count: { lessonPlans: number }
}

const PRESET_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
]

export default function Subjects() {
  const { familyId } = useParams<{ familyId: string }>()
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [showInactive, setShowInactive] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', color: '#6366f1', curriculumName: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!familyId) return
    api.get(`/families/${familyId}`).then((res) => {
      const stus: Student[] = res.data.students ?? []
      setStudents(stus)
      if (stus.length > 0) setSelectedStudentId(stus[0].id)
      setLoading(false)
    })
  }, [familyId])

  const fetchSubjects = (studentId: string) => {
    api
      .get('/subjects', { params: { studentId, includeInactive: 'true' } })
      .then((res) => setSubjects(res.data))
  }

  useEffect(() => {
    if (selectedStudentId) fetchSubjects(selectedStudentId)
  }, [selectedStudentId])

  const handleAddSubject = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/subjects', {
        studentId: selectedStudentId,
        name: formData.name,
        color: formData.color,
        curriculumName: formData.curriculumName || undefined,
      })
      setShowForm(false)
      setFormData({ name: '', color: '#6366f1', curriculumName: '' })
      fetchSubjects(selectedStudentId)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add subject')
    }
  }

  const handleToggleActive = async (subject: Subject) => {
    await api.put(`/subjects/${subject.id}`, { isActive: !subject.isActive })
    fetchSubjects(selectedStudentId)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subject and all its lesson plans?')) return
    await api.delete(`/subjects/${id}`)
    fetchSubjects(selectedStudentId)
  }

  const visible = showInactive ? subjects : subjects.filter((s) => s.isActive)
  const hasInactive = subjects.some((s) => !s.isActive)

  if (loading) return <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>

  if (students.length === 0) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Subjects</h1>
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-400">No students in this family yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Subjects</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          disabled={!selectedStudentId}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {showForm ? 'Cancel' : '+ Add Subject'}
        </button>
      </div>

      {/* Student tabs */}
      {students.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedStudentId(s.id)
                setShowForm(false)
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedStudentId === s.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s.firstName} {s.lastName}
            </button>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Add Subject</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleAddSubject} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="Math, Language Arts, Science..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Curriculum (optional)
                </label>
                <input
                  type="text"
                  value={formData.curriculumName}
                  onChange={(e) => setFormData({ ...formData, curriculumName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="Saxon Math 5/4"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      formData.color === color
                        ? 'border-gray-800 scale-110'
                        : 'border-transparent hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
            >
              Add Subject
            </button>
          </form>
        </div>
      )}

      {/* Inactive toggle */}
      {hasInactive && (
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setShowInactive((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {showInactive ? 'Hide inactive' : 'Show inactive'}
          </button>
        </div>
      )}

      {/* Subject list */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-400 mb-1">No subjects yet.</p>
          <p className="text-sm text-gray-400">Add a subject to start tracking curriculum.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((subject) => (
            <div
              key={subject.id}
              className={`bg-white rounded-lg shadow-sm p-4 flex items-center gap-4 border-l-4 ${
                !subject.isActive ? 'opacity-55' : ''
              }`}
              style={{ borderLeftColor: subject.color }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                  {!subject.isActive && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      inactive
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {subject.curriculumName && (
                    <span className="text-sm text-gray-500">{subject.curriculumName}</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {subject._count.lessonPlans} lesson plan
                    {subject._count.lessonPlans !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm shrink-0">
                <button
                  onClick={() => handleToggleActive(subject)}
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                >
                  {subject.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(subject.id)}
                  className="text-red-400 hover:text-red-600 transition-colors"
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
