import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'

interface Student {
  id: string
  firstName: string
  lastName: string
  gradeLevel: string
  _count: { subjects: number; attendanceRecords: number; grades: number }
}

interface Family {
  id: string
  name: string
  state: string
  schoolYearStart: string
  schoolYearEnd: string
  students: Student[]
}

export default function FamilyDashboard() {
  const { familyId } = useParams<{ familyId: string }>()
  const [family, setFamily] = useState<Family | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!familyId) return
    api
      .get(`/families/${familyId}`)
      .then((res) => setFamily(res.data))
      .finally(() => setLoading(false))
  }, [familyId])

  if (loading) return <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
  if (!family) return <div className="text-center py-12 text-gray-400 text-sm">Family not found</div>

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <p className="text-sm text-gray-400">{today}</p>
        <h1 className="text-3xl font-bold text-gray-900 mt-0.5">{family.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {family.state} &middot; School year ends{' '}
          {new Date(family.schoolYearEnd).toLocaleDateString()}
        </p>
      </div>

      {family.students.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500 mb-4">No students yet.</p>
          <Link
            to="/settings/students"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
          >
            Add a Student
          </Link>
        </div>
      ) : (
        <>
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Students
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {family.students.map((student) => (
              <div key={student.id} className="bg-white rounded-lg shadow-sm p-5">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {student.firstName} {student.lastName}
                  </h3>
                  <p className="text-sm text-gray-400">Grade {student.gradeLevel}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Link
                    to={`/family/${familyId}/subjects`}
                    className="p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <p className="text-xl font-bold text-indigo-700">{student._count.subjects}</p>
                    <p className="text-xs text-indigo-500 mt-0.5">Subjects</p>
                  </Link>
                  <Link
                    to={`/family/${familyId}/attendance`}
                    className="p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <p className="text-xl font-bold text-green-700">
                      {student._count.attendanceRecords}
                    </p>
                    <p className="text-xs text-green-500 mt-0.5">Days</p>
                  </Link>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <p className="text-xl font-bold text-amber-700">{student._count.grades}</p>
                    <p className="text-xs text-amber-500 mt-0.5">Grades</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Quick Access
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to={`/family/${familyId}/attendance`}
              className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow border-l-4 border-green-400"
            >
              <h3 className="font-semibold text-gray-900">Attendance</h3>
              <p className="text-sm text-gray-400 mt-1">Track daily attendance</p>
            </Link>
            <Link
              to={`/family/${familyId}/subjects`}
              className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow border-l-4 border-indigo-400"
            >
              <h3 className="font-semibold text-gray-900">Subjects</h3>
              <p className="text-sm text-gray-400 mt-1">Manage curriculum</p>
            </Link>
            <Link
              to="/settings/families"
              className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow border-l-4 border-gray-200"
            >
              <h3 className="font-semibold text-gray-900">Settings</h3>
              <p className="text-sm text-gray-400 mt-1">Family &amp; student management</p>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
