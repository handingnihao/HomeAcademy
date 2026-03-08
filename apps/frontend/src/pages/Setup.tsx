import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

type Step = 'family' | 'student'

export default function Setup() {
  const [step, setStep] = useState<Step>('family')
  const [createdFamilyId, setCreatedFamilyId] = useState('')
  const [familyData, setFamilyData] = useState({
    name: '',
    state: '',
    schoolYearStart: '',
    schoolYearEnd: '',
  })
  const [studentData, setStudentData] = useState({
    firstName: '',
    lastName: '',
    gradeLevel: '',
  })
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleCreateFamily = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await api.post('/families', familyData)
      setCreatedFamilyId(res.data.id)
      setStep('student')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create family')
    }
  }

  const handleAddStudent = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/students', { ...studentData, familyId: createdFamilyId })
      navigate(`/family/${createdFamilyId}`, { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add student')
    }
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

      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {(['family', 'student'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="h-px w-8 bg-gray-200" />}
              <div className={`flex items-center gap-2 ${step === s ? 'text-primary-700' : 'text-gray-400'}`}>
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    step === s
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="text-sm font-medium">
                  {s === 'family' ? 'Create Family' : 'Add Student'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {step === 'family' && (
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Set up your family</h2>
            <p className="text-sm text-gray-500 mb-6">This will be your homeschool profile.</p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleCreateFamily} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Family Name</label>
                <input
                  type="text"
                  required
                  value={familyData.name}
                  onChange={(e) => setFamilyData({ ...familyData, name: e.target.value })}
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
                  value={familyData.state}
                  onChange={(e) =>
                    setFamilyData({ ...familyData, state: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
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
                    value={familyData.schoolYearStart}
                    onChange={(e) =>
                      setFamilyData({ ...familyData, schoolYearStart: e.target.value })
                    }
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
                    value={familyData.schoolYearEnd}
                    onChange={(e) =>
                      setFamilyData({ ...familyData, schoolYearEnd: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                Create Family &amp; Continue
              </button>
            </form>
          </div>
        )}

        {step === 'student' && (
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Add your first student</h2>
            <p className="text-sm text-gray-500 mb-6">You can add more students later in Settings.</p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={studentData.firstName}
                    onChange={(e) => setStudentData({ ...studentData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={studentData.lastName}
                    onChange={(e) => setStudentData({ ...studentData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    placeholder="Smith"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                <input
                  type="text"
                  required
                  value={studentData.gradeLevel}
                  onChange={(e) => setStudentData({ ...studentData, gradeLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="K, 1, 2 ... 12"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                Add Student &amp; Get Started
              </button>
              <button
                type="button"
                onClick={() => navigate(`/family/${createdFamilyId}`, { replace: true })}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
              >
                Skip for now
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
