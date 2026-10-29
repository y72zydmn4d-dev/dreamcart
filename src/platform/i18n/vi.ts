/**
 * Vietnamese UI dictionary (default and only language in the MVP, ADR-012).
 * Every user-facing string lives here; components call `t("path.to.key")`.
 * Technical identifiers and code stay in English.
 */
export const vi = {
  brand: {
    name: "DreamCart",
    tagline: "Mua sắm cảm xúc, không tiêu tiền.",
  },
  meta: {
    title: "DreamCart — Mua sắm mô phỏng với sản phẩm thật",
    description:
      "DreamCart là trải nghiệm mua sắm ảo xoay quanh sản phẩm thật. Mọi giao dịch đều là mô phỏng: không thanh toán, không đặt hàng, không giao hàng thật.",
  },
  simulation: {
    // Required disclosure copy from the PRD. Do not paraphrase.
    notice: "Mô phỏng — không thanh toán, không đặt hàng, không giao hàng thật.",
    learnMore: "Tìm hiểu thêm",
    regionLabel: "Thông báo mô phỏng",
  },
  a11y: {
    skipToContent: "Bỏ qua và đến nội dung chính",
    mainNavigation: "Điều hướng chính",
    loading: "Đang tải…",
  },
  nav: {
    home: "Trang chủ",
    search: "Tìm kiếm",
    cart: "Giỏ hàng",
    orders: "Đơn hàng",
    collection: "Bộ sưu tập",
    about: "Giới thiệu",
  },
  footer: {
    disclosure: "DreamCart là trải nghiệm mua sắm mô phỏng. Mọi giao dịch đều là giả lập.",
    status: "Bản nền tảng: chưa có dữ liệu sản phẩm thật.",
  },
  placeholder: {
    badge: "Bản giữ chỗ",
    body: "Đây là trang giữ chỗ của Giai đoạn 1. Tính năng thật sẽ được xây dựng ở Giai đoạn {phase}.",
    noData:
      "Chưa có dữ liệu sản phẩm thật. DreamCart không hiển thị dữ liệu giả như thể đó là sản phẩm thật.",
  },
  home: {
    eyebrow: "Trải nghiệm mua sắm mô phỏng",
    title: "Mua sắm cảm xúc, không tiêu tiền.",
    subtitle:
      "DreamCart xoay quanh sản phẩm thật: khám phá, cấu hình, thêm vào giỏ, thanh toán mô phỏng, theo dõi giao hàng ảo và lưu vào bộ sưu tập của bạn.",
    ctaSearch: "Bắt đầu tìm kiếm",
    ctaAbout: "DreamCart hoạt động thế nào",
    journeyHeading: "Hành trình mua sắm",
    journey: {
      discover: "Khám phá",
      search: "Tìm kiếm",
      configure: "Cấu hình",
      addToCart: "Thêm vào giỏ",
      checkout: "Thanh toán mô phỏng",
      order: "Đơn hàng ảo",
      delivery: "Giao hàng mô phỏng",
      collection: "Bộ sưu tập",
    },
    statusHeading: "Đang xây dựng nền tảng",
    statusBody:
      "Đây là bản nền tảng kỹ thuật. Giao diện đầy đủ, danh mục sản phẩm thật và các bước mua sắm sẽ được bổ sung theo từng giai đoạn.",
  },
  pages: {
    search: {
      title: "Tìm kiếm sản phẩm",
      description: "Tìm theo tên, mẫu máy và cấu hình.",
      phase: "5–6",
    },
    product: {
      title: "Chi tiết sản phẩm",
      description: "Thư viện ảnh, thông số, cấu hình và giá tham khảo có nguồn.",
      phase: "6",
      idLabel: "Mã sản phẩm: {id}",
    },
    cart: {
      title: "Giỏ hàng",
      description: "Các sản phẩm bạn đã chọn, nhóm theo nguồn.",
      phase: "7",
    },
    checkout: {
      title: "Thanh toán mô phỏng",
      description: "Bước xác nhận đơn hàng ảo. Không có khoản thanh toán thật nào được thực hiện.",
      phase: "8",
    },
    orders: {
      title: "Đơn hàng mô phỏng",
      description: "Lịch sử đơn hàng ảo và tiến trình giao hàng mô phỏng.",
      phase: "8–9",
    },
    collection: {
      title: "Bộ sưu tập của tôi",
      description: "Những sản phẩm đã được giao ảo thành công.",
      phase: "9",
    },
    about: {
      title: "Giới thiệu về mô phỏng",
      lead: "DreamCart cho bạn cảm giác mua sắm trọn vẹn mà không có giao dịch thật nào xảy ra.",
      notRealHeading: "Những gì không bao giờ xảy ra thật",
      notReal: {
        payment: "Không có khoản thanh toán thật. DreamCart không kết nối ngân hàng, thẻ hay ví.",
        order: "Không đặt hàng với cửa hàng thật. Đơn hàng chỉ tồn tại trong trình duyệt của bạn.",
        delivery:
          "Không có giao hàng thật. Hành trình giao hàng là một mô phỏng, không có đơn vị vận chuyển nào tham gia.",
      },
      realHeading: "Những gì là thật",
      real: {
        products: "Sản phẩm là sản phẩm thật, với nguồn có thể kiểm chứng.",
        prices: "Giá chỉ mang tính tham khảo, luôn kèm nguồn và ngày ghi nhận.",
      },
    },
  },
  notFound: {
    title: "Không tìm thấy trang",
    body: "Trang bạn tìm không tồn tại hoặc đã được di chuyển.",
    backHome: "Về trang chủ",
  },
  error: {
    title: "Đã xảy ra lỗi",
    body: "Có sự cố khi hiển thị trang này. Dữ liệu của bạn không bị ảnh hưởng.",
    retry: "Thử lại",
  },
} as const;

export type Dictionary = typeof vi;
