import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'

interface Student {
  id: string
  firstName: string
  lastName: string
  gradeLevel: string
}

interface AttendanceRecord {
  id: string
  studentId: string
  date: string
  status: AttendanceStatus
  hours: number | null
  notes: string | null
}

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'FIELD_TRIP' | 'COOP_DAY'

const STATUS: Record<
  AttendanceStatus,
  { label: string; bg: string; text: string; dot: string; border: string }
> = {
  PRESENT: {
    label: 'Present',
    bg: 'bg-green-50',
    text: 'text-green-800',
    dot: 'bg-green-500',
    border: 'border-green-400',
  },
  ABSENT: {
    label: 'Absent',
    bg: 'bg-red-50',
    text: 'text-red-800',
    dot: 'bg-red-500',
    border: 'border-red-400',
  },
  HALF_DAY: {
    label: 'Half Day',
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    dot: 'bg-yellow-500',
    border: 'border-yellow-400',
  },
  FIELD_TRIP: {
    label: 'Field Trip',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    dot: 'bg-blue-500',
    border: 'border-blue-400',
  },
  COOP_DAY: {
    label: 'Co-op Day',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    dot: 'bg-purple-500',
    border: 'border-purple-400',
  },
}

const pad = (n: number) => String(n).padStart(2, '0')

export default function Attendance() {
  const { familyId } = useParams<{ familyId: string }>()
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({})
  const [today] = useState(() => new Date())
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [formStatus, setFormStatus] = useState<AttendanceStatus>('PRESENT')
  const [formNotes, setFormNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!familyId) return
    api.get(`/families/${familyId}`).then((res) => {
      const stus: Student[] = res.data.students ?? []
      setStudents(stus)
      if (stus.length > 0) setSelectedStudentId(stus[0].id)
    })
  }, [familyId])

  const dateKey = useCallback(
    (day: number) => `${year}-${pad(month + 1)}-${pad(day)}`,
    [year, month]
  )

  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

  const fetchRecords = useCallback(() => {
    if (!selectedStudentId) return
    const startDate = `${year}-${pad(month + 1)}-01`
    const endDate = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`
    api
      .get('/attendance', { params: { studentId: selectedStudentId, startDate, endDate } })
      .then((res) => {
        const map: Record<string, AttendanceRecord> = {}
        for (const r of res.data) {
          map[r.date.split('T')[0]] = r
        }
        setRecords(map)
      })
  }, [selectedStudentId, year, month])

  useEffect(() => {
    fetchRecords()
    setSelectedDay(null)
  }, [fetchRecords])

  const handleDayClick = (day: number) => {
    const existing = records[dateKey(day)]
    setSelectedDay(day)
    setFormStatus(existing?.status ?? 'PRESENT')
    setFormNotes(existing?.notes ?? '')
  }

  const handleSave = async () => {
    if (!selectedStudentId || selectedDay === null) return
    setSaving(true)
    try {
      await api.post('/attendance', {
        studentId: selectedStudentId,
        date: dateKey(selectedDay),
        status: formStatus,
        notes: formNotes || null,
      })
      setSelectedDay(null)
      fetchRecords()
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async (day: number) => {
    const record = records[dateKey(day)]
    if (!record) return
    await api.delete(`/attendance/${record.id}`)
    setSelectedDay(null)
    fetchRecords()
  }

  const prevMonth = () => {
    setMonth((m) => {
      if (m === 0) { setYear((y) => y - 1); return 11 }
      return m - 1
    })
  }

  const nextMonth = () => {
    setMonth((m) => {
      if (m === 11) { setYear((y) => y + 1); return 0 }
      return m + 1
    })
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const monthLabel = new Date(year, month, 1).toLocaleString('default', { month: 'long' })

  const presentCount = Object.values(records).filter((r) => r.status !== 'ABSENT').length
  const absentCount = Object.values(records).filter((r) => r.status === 'ABSENT').length

  if (students.length === 0) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Attendance</h1>
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-400">No students in this family yet.</p>
        </div>
      </div>
    )
  }

  const selectedStudent = students.find((s) => s.id === selectedStudentId)

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
      </div>

      {/* Student selector */}
      {students.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStudentId(s.id)}
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

      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors text-gray-600"
          >
            ‹
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {monthLabel} {year}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="text-green-600 font-medium">{presentCount} school days</span>
              {absentCount > 0 && (
                <span className="text-red-500 ml-2">{absentCount} absent</span>
              )}
            </p>
          </div>
          <button
            onClick={nextMonth}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors text-gray-600"
          >
            ›
          </button>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">
              {d}
            </div>
          ))}

          {Array.from({ length: firstDayOfWeek }, (_, i) => (
            <div key={`pad-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const key = dateKey(day)
            const record = records[key]
            const config = record ? STATUS[record.status] : null
            const isToday = key === todayKey
            const isSelected = selectedDay === day

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`aspect-square rounded-lg text-xs flex flex-col items-center justify-center transition-all border-2 ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : isToday
                    ? 'border-primary-200'
                    : config
                    ? `${config.border} border-opacity-50`
                    : 'border-transparent hover:bg-gray-50'
                } ${config ? config.bg : ''}`}
              >
                <span
                  className={`font-medium text-xs ${
                    isToday ? 'text-primary-700' : config ? config.text : 'text-gray-700'
                  }`}
                >
                  {day}
                </span>
                {config && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${config.dot}`} />}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
          {(Object.entries(STATUS) as [AttendanceStatus, (typeof STATUS)[AttendanceStatus]][]).map(
            ([status, cfg]) => (
              <span
                key={status}
                className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${cfg.bg} ${cfg.text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            )
          )}
        </div>
      </div>

      {/* Day editor */}
      {selectedDay !== null && (
        <div className="mt-4 bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">
              {monthLabel} {selectedDay}, {year}
              {selectedStudent && students.length > 1 && (
                <span className="text-gray-400 font-normal text-sm ml-2">
                  — {selectedStudent.firstName}
                </span>
              )}
            </h3>
            <div className="flex gap-3">
              {records[dateKey(selectedDay)] && (
                <button
                  onClick={() => handleClear(selectedDay)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setSelectedDay(null)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(
                  Object.entries(STATUS) as [AttendanceStatus, (typeof STATUS)[AttendanceStatus]][]
                ).map(([status, cfg]) => (
                  <button
                    key={status}
                    onClick={() => setFormStatus(status)}
                    className={`px-3 py-2 rounded-md text-sm font-medium border-2 transition-colors ${
                      formStatus === status
                        ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                placeholder="e.g. Doctor's appointment, field trip details..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setSelectedDay(null)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
