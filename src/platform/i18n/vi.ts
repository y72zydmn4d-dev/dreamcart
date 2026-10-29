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
  fixture: {
    badge: "Dữ liệu mẫu",
    notice:
      "Bản thử nghiệm giao diện: sản phẩm Fixturia là hư cấu, giá là giá mẫu. Chỉ dùng để đánh giá thiết kế.",
    priceLabel: "Giá mẫu",
    source: "Nguồn: dữ liệu mẫu, không phải cửa hàng thật",
    artCaption: "Ảnh minh hoạ, không phải ảnh sản phẩm thật",
  },
  art: {
    label: "Ảnh minh hoạ {name}, màu {color}",
    labelNoColor: "Ảnh minh hoạ {name}",
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
    openMenu: "Mở menu",
    closeMenu: "Đóng menu",
    menuTitle: "Menu",
  },
  footer: {
    disclosure: "DreamCart là trải nghiệm mua sắm mô phỏng. Mọi giao dịch đều là giả lập.",
    status: "Bản thử nghiệm giao diện: chưa có dữ liệu sản phẩm thật.",
    designSystem: "Hệ thống thiết kế (bản thử)",
  },
  placeholder: {
    badge: "Bản giữ chỗ",
    body: "Đây là trang giữ chỗ. Tính năng thật sẽ được xây dựng ở Giai đoạn {phase}.",
    noData:
      "Chưa có dữ liệu sản phẩm thật. DreamCart không hiển thị dữ liệu giả như thể đó là sản phẩm thật.",
  },
  categories: {
    laptop: {
      name: "Laptop & máy tính",
      short: "Laptop",
      blurb: "Mỏng nhẹ hay mạnh mẽ, cấu hình đúng như bạn muốn.",
    },
    phone: {
      name: "Điện thoại",
      short: "Điện thoại",
      blurb: "Chọn đúng dung lượng và màu sắc bạn thích.",
    },
    audio: {
      name: "Tai nghe & âm thanh",
      short: "Âm thanh",
      blurb: "Nhét tai hay chụp tai, nghe theo cách của bạn.",
    },
  },
  attributes: {
    screen_in: "Màn hình",
    chip: "Chip",
    ram_gb: "RAM",
    storage_gb: "Bộ nhớ trong",
    color: "Màu sắc",
    type: "Kiểu tai nghe",
  },
  units: {
    inch: "{value} inch",
    gb: "{value} GB",
    tb: "{value} TB",
  },
  colors: {
    graphite: "Xám than",
    sand: "Cát",
    black: "Đen",
    white: "Trắng",
    silver: "Bạc",
    mint: "Xanh bạc hà",
    midnight: "Xanh đêm",
    lunar: "Xám trăng",
  },
  audioTypes: {
    earbuds: "Nhét tai",
    over_ear: "Chụp tai",
  },
  home: {
    eyebrow: "Mua sắm mô phỏng với sản phẩm thật",
    title: "Mua sắm cảm xúc, không tiêu tiền.",
    subtitle:
      "Khám phá, cấu hình và sưu tập những món đồ bạn mơ ước. Mọi bước mua đều là mô phỏng minh bạch.",
    disclosure: "Không thanh toán thật · Không đặt hàng thật · Không giao hàng thật",
    quickLinks: "Gợi ý nhanh",
    categoriesHeading: "Khám phá theo danh mục",
    categoriesCta: "Xem {category}",
    featuredHeading: "Tuyển chọn để trải nghiệm",
    featuredLead: "Sản phẩm mẫu để thử bộ cấu hình và cách trình bày giá, nguồn.",
    featuredAll: "Xem tất cả",
    howHeading: "Hành trình mô phỏng",
    how: {
      discover: {
        title: "Khám phá và cấu hình",
        body: "Tìm sản phẩm, chọn đúng phiên bản. Không có cấu hình nào được bịa ra.",
      },
      cart: {
        title: "Thêm vào giỏ",
        body: "Giỏ hàng lưu trên trình duyệt của bạn, không cần tài khoản.",
      },
      checkout: {
        title: "Thanh toán mô phỏng",
        body: "Một bước xác nhận rõ ràng. Không có ngân hàng, thẻ hay ví nào.",
      },
      collect: {
        title: "Theo dõi và sưu tập",
        body: "Theo dõi hành trình giao hàng ảo và lưu món đồ vào bộ sưu tập.",
      },
    },
    trustHeading: "Minh bạch ngay từ đầu",
    trustBody:
      "DreamCart cho biết rõ đâu là thật và đâu là mô phỏng. Giá luôn kèm nguồn và ngày ghi nhận khi có danh mục thật.",
    trustCta: "Cách DreamCart hoạt động",
  },
  search: {
    label: "Tìm sản phẩm",
    placeholder: "Tìm laptop, điện thoại, tai nghe…",
    submit: "Tìm",
    clear: "Xoá nội dung tìm kiếm",
    suggestions: "Gợi ý",
    suggestCategory: "Danh mục · {name}",
    resultsCount: "{count} sản phẩm",
    resultsFor: "cho “{q}”",
    sortLabel: "Sắp xếp",
    sort: {
      relevance: "Phù hợp nhất",
      priceAsc: "Giá mẫu: thấp đến cao",
      priceDesc: "Giá mẫu: cao đến thấp",
      name: "Tên A–Z",
    },
    filters: {
      title: "Bộ lọc",
      openCount: "Bộ lọc ({count})",
      clear: "Xoá bộ lọc",
      apply: "Xem {count} kết quả",
      category: "Danh mục",
      all: "Tất cả",
      price: "Khoảng giá mẫu",
      remove: "Bỏ lọc {label}",
      hint: "Chọn một danh mục để lọc theo cấu hình.",
      active: "Bộ lọc đang dùng",
      close: "Đóng bộ lọc",
    },
    price: {
      under20: "Dưới 20 triệu",
      "20to30": "20–30 triệu",
      "30to40": "30–40 triệu",
      over40: "Trên 40 triệu",
    },
    fromPrice: "Từ {price}",
    variants: "{count} cấu hình",
    empty: {
      title: "Không tìm thấy sản phẩm phù hợp",
      body: "Thử bỏ bớt bộ lọc hoặc tìm với từ khoá khác. DreamCart chỉ hiển thị những gì có trong dữ liệu.",
      reset: "Xoá tìm kiếm và bộ lọc",
    },
    loading: "Đang tải kết quả…",
    error: {
      title: "Không tải được kết quả",
      body: "Đã có lỗi khi hiển thị kết quả. Dữ liệu của bạn không bị ảnh hưởng.",
      retry: "Thử lại",
    },
  },
  product: {
    breadcrumb: "Đường dẫn",
    breadcrumbSearch: "Tìm kiếm",
    gallery: "Thư viện ảnh minh hoạ",
    viewLabel: "Xem ảnh: {view}",
    views: {
      front: "Mặt trước",
      side: "Cạnh bên",
      detail: "Chi tiết",
    },
    specsHeading: "Thông số mẫu",
    sourceHeading: "Nguồn và giá",
    sourceBody:
      "Đây là dữ liệu mẫu để đánh giá thiết kế. Khi có danh mục thật, mỗi giá sẽ kèm nguồn, ngày ghi nhận và cảnh báo nếu đã cũ.",
  },
  configurator: {
    heading: "Cấu hình",
    quickNav: "Chuyển nhanh tới nhóm tùy chọn",
    notSelected: "Chưa chọn",
    onlyOption: "Lựa chọn duy nhất",
    unavailableWith: "Không có với {values}",
    conflictTitle: "{value} không có với lựa chọn hiện tại",
    conflictBody: "Không có cấu hình nào kết hợp {value} với {values}. Chưa có gì thay đổi.",
    conflictApply: "Chọn {value} và bỏ {groups}",
    conflictKeep: "Giữ nguyên",
    reset: "Chọn lại từ đầu",
    summary: "Cấu hình của bạn",
    priceFrom: "Từ {price}",
    priceRange: "{min} – {max}",
    selectAll: "Chọn đủ các nhóm để xem giá mẫu của cấu hình.",
    missing: "Còn thiếu: {groups}",
    complete: "Cấu hình này có sẵn trong dữ liệu mẫu",
    addToCart: "Thêm vào giỏ mô phỏng",
    prototypeNotice:
      "Bản thử nghiệm: giỏ hàng mô phỏng sẽ có ở Giai đoạn 7. Không có giao dịch thật nào.",
    variantId: "Mã biến thể: {id}",
  },
  priceStates: {
    observed: "Giá tham khảo · ghi nhận {date}",
    stale: "Giá có thể đã thay đổi · ghi nhận {date}",
    userEntered: "Người dùng nhập, chưa xác minh",
    unavailable: "Chưa có giá",
  },
  orderStates: {
    confirmed: "Đã xác nhận đơn mô phỏng",
    preparing: "Đang chuẩn bị (ảo)",
    packed: "Đã đóng gói (ảo)",
    inTransit: "Đang vận chuyển ảo",
    outForDelivery: "Đang giao ảo",
    delivered: "Đã giao ảo",
    cancelled: "Đã huỷ (mô phỏng)",
  },
  design: {
    title: "Hệ thống thiết kế",
    lead: "Màu sắc, kiểu chữ và các thành phần nền tảng của DreamCart. Các mẫu dưới đây là tĩnh; chức năng thật thuộc các giai đoạn sau.",
    colorsHeading: "Màu sắc",
    typeHeading: "Kiểu chữ",
    componentsHeading: "Thành phần",
    foundationsHeading: "Nền tảng cho các bước sau",
    foundationsLead:
      "Giỏ hàng, thanh toán, đơn hàng, theo dõi và bộ sưu tập dùng chung các mẫu này.",
    cartTitle: "Dòng giỏ hàng",
    checkoutTitle: "Tóm tắt thanh toán mô phỏng",
    checkoutAck:
      "Tôi hiểu đây là mô phỏng: không thanh toán, không đặt hàng, không giao hàng thật.",
    checkoutConfirm: "Tạo đơn mô phỏng",
    ordersTitle: "Thẻ đơn hàng",
    orderCode: "Mã đơn {code}",
    trackingTitle: "Dòng thời gian giao hàng ảo",
    collectionTitle: "Thẻ bộ sưu tập",
    collectionDelivered: "Đã giao ảo · {date}",
    priceStatesTitle: "Trạng thái giá",
    quantity: "Số lượng: {count}",
    subtotal: "Tạm tính (giá mẫu)",
    destination: "Địa chỉ ảo: Dream Apartment",
    payment: "Phương thức: Dream Credits (ảo)",
  },
  pages: {
    search: {
      title: "Tìm kiếm sản phẩm",
      description: "Tìm theo tên, mẫu máy và cấu hình.",
    },
    product: {
      title: "Chi tiết sản phẩm",
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
      prototypeNote:
        "Hiện tại DreamCart đang ở giai đoạn thử nghiệm giao diện: các sản phẩm Fixturia là hư cấu và giá là giá mẫu.",
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
