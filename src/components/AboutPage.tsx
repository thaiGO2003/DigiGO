import { Shield, Headphones, Zap, Award } from 'lucide-react'

export default function AboutPage() {
  const features = [
    {
      icon: Shield,
      title: 'Bảo mật tuyệt đối',
      description: 'Tất cả giao dịch được mã hóa và bảo mật theo tiêu chuẩn quốc tế'
    },
    {
      icon: Zap,
      title: 'Giao hàng tức thì',
      description: 'Nhận sản phẩm ngay lập tức sau khi thanh toán thành công'
    },
    {
      icon: Headphones,
      title: 'Hỗ trợ 24/7',
      description: 'Đội ngũ hỗ trợ khách hàng luôn sẵn sàng giúp đỡ bạn'
    },
    {
      icon: Award,
      title: 'Chất lượng đảm bảo',
      description: 'Tất cả sản phẩm đều được kiểm tra kỹ lưỡng trước khi bán'
    }
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Chào mừng đến với DigiGO
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Chúng tôi là nhà cung cấp hàng đầu các sản phẩm số chất lượng cao với 
          dịch vụ khách hàng xuất sắc và giao hàng tức thì.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {features.map((feature, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 rounded-full p-3">
                <feature.icon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* About Content */}
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="prose max-w-none">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Về DigiGO
          </h2>
          
          <p className="text-gray-600 mb-6">
            DigiGO được thành lập với sứ mệnh mang đến cho khách hàng những sản phẩm 
            số chất lượng cao với giá cả hợp lý. Chúng tôi chuyên cung cấp các loại tài khoản 
            email, key phần mềm, và các gói dịch vụ đa dạng.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Cam kết của chúng tôi
          </h3>
          
          <ul className="space-y-2 text-gray-600 mb-6">
            <li>• Sản phẩm chính hãng 100%</li>
            <li>• Giao hàng tức thì sau khi thanh toán</li>
            <li>• Hỗ trợ khách hàng 24/7</li>
            <li>• Bảo hành và đổi trả theo chính sách</li>
            <li>• Giá cả cạnh tranh nhất thị trường</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Liên hệ với chúng tôi
          </h3>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-600 mb-2">
              <strong>Email hỗ trợ:</strong> support@digigo.online
            </p>
            <p className="text-gray-600 mb-2">
              <strong>Website:</strong> digigo.online
            </p>
            <p className="text-gray-600">
              <strong>Thời gian hỗ trợ:</strong> 24/7
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}