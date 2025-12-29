import { useState, useEffect } from 'react'
import { supabase, Program } from '../../lib/supabase'
import { Link as LinkIcon, Download, Eye } from 'lucide-react'

export default function ProgramsTab() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPrograms(data || [])
    } catch (error) {
      console.error('Error fetching programs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Note: For high traffic, RPC is better to avoid race conditions.
  const handleSimpleTrack = async (program: Program, type: 'view' | 'download') => {
    try {
      const update = type === 'view'
        ? { view_count: (program.view_count || 0) + 1 }
        : { download_count: (program.download_count || 0) + 1 }

      await supabase.from('programs').update(update).eq('id', program.id)

      // Update local state to reflect change immediately
      setPrograms(prev => prev.map(p =>
        p.id === program.id ? { ...p, ...update } : p
      ))
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="animate-fade-in">
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
              <div className="flex space-x-3">
                <div className="h-10 bg-gray-200 rounded flex-1"></div>
                <div className="h-10 bg-gray-200 rounded flex-1"></div>
              </div>
            </div>
          ))}
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">Chưa có chương trình nào được chia sẻ.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => (
            <div key={program.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 flex flex-col h-full">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-900 line-clamp-2" title={program.title}>
                    {program.title}
                  </h3>
                </div>
                <p className="text-gray-600 text-sm mb-6 line-clamp-3">
                  {program.description || 'Không có mô tả'}
                </p>

                <div className="flex items-center space-x-4 text-xs text-gray-500 mb-6">
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    {program.view_count.toLocaleString()}
                  </div>
                  <div className="flex items-center">
                    <Download className="h-4 w-4 mr-1" />
                    {program.download_count.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 mt-auto grid grid-cols-2 gap-3">
                <a
                  href={program.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleSimpleTrack(program, 'view')}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Source
                </a>
                <a
                  href={program.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleSimpleTrack(program, 'download')}
                  className="flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Tải về
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
