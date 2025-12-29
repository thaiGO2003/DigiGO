export default function CursorTab() {
  return (
    <div className="animate-fade-in">
      <div className="mx-auto max-w-7xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-extrabold text-gray-900">Đăng nhập hệ thống</h2>
            <p className="text-sm text-gray-600">Nhập key để truy cập vào hệ thống lấy token</p>
          </div>
          <div className="relative">
            <iframe
              src="https://zeno360.io.vn"
              title="Key Token App"
              className="w-full h-[70vh] md:h-[80vh] bg-white"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <div className="px-6 py-4 flex items-center justify-between text-sm">
            <a
              href="https://zeno360.io.vn/login"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Mở trong tab mới
            </a>
            <span className="text-gray-400">Tương thích Chrome, Firefox, Safari</span>
          </div>
        </div>
      </div>
    </div>
  )
}
