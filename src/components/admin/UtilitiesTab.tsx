import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Eye, Download, Link as LinkIcon } from 'lucide-react'
import { supabase, Program } from '../../lib/supabase'
import ProgramModal from './ProgramModal'

export default function UtilitiesTab() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)

  useEffect(() => {
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPrograms(data || [])
    } catch (error) {
      console.error('Error fetching programs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa chương trình này?')) return

    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchPrograms()
    } catch (error) {
      console.error('Error deleting program:', error)
      alert('Không thể xóa chương trình')
    }
  }

  const handleEdit = (program: Program) => {
    setSelectedProgram(program)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setSelectedProgram(null)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Quản lý Tiện ích & Chương trình</h2>
        <button
          onClick={handleAdd}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Thêm chương trình
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên chương trình
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Liên kết
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thống kê
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Hành động</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {programs.map((program) => (
                <tr key={program.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{program.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{program.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <a href={program.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 flex items-center">
                        <LinkIcon className="h-3 w-3 mr-1" /> Source
                      </a>
                      <a href={program.download_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:text-green-800 flex items-center">
                        <Download className="h-3 w-3 mr-1" /> Download
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center space-x-3">
                      <span className="flex items-center" title="Lượt xem">
                        <Eye className="h-4 w-4 mr-1 text-gray-400" />
                        {program.view_count}
                      </span>
                      <span className="flex items-center" title="Lượt tải">
                        <Download className="h-4 w-4 mr-1 text-gray-400" />
                        {program.download_count}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      program.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {program.is_active ? 'Hiển thị' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(program)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(program.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {programs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Chưa có chương trình nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ProgramModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        program={selectedProgram}
        onSuccess={fetchPrograms}
      />
    </div>
  )
}
