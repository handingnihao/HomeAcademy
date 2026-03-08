import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function HomeRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem('authToken')) {
      navigate('/login', { replace: true })
      return
    }

    api
      .get('/families')
      .then((res) => {
        const families = res.data
        if (families.length === 0) {
          navigate('/setup', { replace: true })
        } else if (families.length === 1) {
          navigate(`/family/${families[0].id}`, { replace: true })
        } else {
          navigate('/select-family', { replace: true })
        }
      })
      .catch(() => navigate('/login', { replace: true }))
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  )
}
