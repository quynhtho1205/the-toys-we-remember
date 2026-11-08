# Luồng tương tác → Memory Card → chọn quà

## Mở demo

- Admin phân tích: `/admin?tab=livestream` (tên mới: Phân tích tương tác & Ý tưởng nội dung, đứng trước Tổng quan).
- Campaign: `/home` → `/choose-memory` → `/create-memory` → `/memory-card`.
- Cửa hàng demo: `/gift-shop`.

## Phân tích nội dung

Chọn nội dung và kênh (TikTok/Facebook/YouTube), bấm phân tích. Cột trái chứa bình luận, cột phải chứa nhóm nhu cầu, tỷ trọng, dẫn chứng và phản hồi. Mỗi bình luận có thể thuộc nhiều nhóm. Phần dưới tạo bài post hoặc kịch bản video 30/60/90 giây, chỉnh sửa, sao chép và lưu nháp. Có thể nhập tối đa 500 bình luận/lần, mỗi dòng một bình luận. Dữ liệu nhập chỉ ở phiên hiện tại. Bản nháp tách theo nguồn mock/live.

Phân tích hiện dùng quy tắc và mẫu nội dung tại máy, được ghi rõ trên UI. Chưa có API thu thập bình luận, kết nối mô hình AI hoặc tự xuất bản. Không có khóa bí mật trong frontend.

## Nhận thẻ và chọn người nhận

Khi tạo Memory Card thành công, hiện hộp thoại chọn cho bản thân / chơi cùng con / tặng người khác. Có thể đóng để xem và tải thẻ. Hộp thoại chỉ tự mở một lần cho mỗi câu chuyện trong phiên; nút “Chọn quà theo người nhận” mở lại bất cứ lúc nào. Khách có thể dùng hồ sơ đã đồng ý lưu hoặc nhập thông tin tùy chọn. Thông tin tạm chỉ giữ trong sessionStorage, không được đẩy vào hồ sơ lâu dài khi chưa đồng ý.

## Hồ sơ và đơn demo

Tài khoản demo dùng tên hiển thị và bộ nhớ của trình duyệt, không phải tài khoản MyKingdom hoặc hệ thống xác thực an toàn. Không nhập thông tin nhạy cảm. Đăng xuất rồi dùng lại cùng tên để thử việc quay lại. Không đồng bộ giữa thiết bị.

Nickname, nhóm tuổi, sở thích, màu yêu thích và món đồ chơi yêu thích đều tùy chọn. Chọn tài khoản và tích đồng ý lưu tại checkout mới tạo/cập nhật hồ sơ lâu dài. Đây là đồng ý cá nhân hóa gợi ý quà, hoàn toàn riêng với marketing consent. Không tự cấp marketing consent. Hồ sơ không được đưa vào tác vụ chăm sóc/automation cũ vì chưa có đồng ý cho mục đích đó. Có nút xóa hồ sơ và liên kết cá nhân hóa; lịch sử giao dịch được giữ.

Sản phẩm, độ tuổi và giá là dữ liệu minh họa. Gợi ý xếp theo sở thích, món yêu thích, nhóm tuổi, màu và chủ đề thẻ; có lý do đi kèm. Nhóm 0–2 chưa có sản phẩm minh họa phù hợp. Checkout không yêu cầu thanh toán thật; MEMORY15 giảm 15%, MYKID-NOSTALGIA-30 giảm 30%, không cộng dồn.

Đơn mang tiền tố DEMO_, kênh demo_checkout và shop_demo=true, không có cờ xác nhận campaign_attributed. Do đó không giả lập xác nhận doanh thu campaign. Đơn và hồ sơ con xuất hiện ở Admin khi chọn “Dữ liệu thao tác trực tiếp”; bộ mock 400 khách không bị sửa. Hồ sơ con được nối vào gia đình demo, giữ tên/tuổi/sở thích/màu/đồ chơi/đồng ý lưu; đơn mua cho hồ sơ đã lưu được gắn đúng bé. Mua không lưu vẫn tạo đơn, không tạo hồ sơ con. Không gửi email, Zalo hay thu tiền.


## Demo hướng 1: sở thích xe đua

Mở `/gift-shop`, chọn “Xem gợi ý phù hợp”. Chọn nhóm tuổi 6–8 (hoặc 9–12 / 13+), nhập “xe đua” vào sở thích rồi cập nhật gợi ý; nút nhanh “Xe đua” cũng áp dụng cùng logic. Để ngân sách “Tất cả mức giá” để xem đủ 9 sản phẩm; mức 300.000đ còn 4 sản phẩm. Có thể thêm vào giỏ và thanh toán mô phỏng như các món khác. Không cần đăng nhập để xem hoặc mua demo.

Catalog ở `src/app/services/racing-products.ts`, 9 ảnh AI riêng ở `public/mock/images/products/race01.jpg` đến `race09.jpg`. Prompt và nguồn tạo ảnh built-in image_gen ở `scripts/racing-image-prompts.json`. Đây là sản phẩm, giá và độ tuổi minh họa, không phải danh mục chính thức. Người nhận không cung cấp sở thích vẫn được xem catalog chung; chọn xe đua sẽ lọc đúng bộ xe đua, sau đó áp dụng bộ lọc tuổi và ngân sách.


## Các danh mục demo khác

Ngoài 9 món xe đua, có 3 danh mục chọn nhanh: Lắp ghép (GIFT01, GIFT06, GIFT07); Búp bê & thú bông (GIFT02, GIFT03, GIFT09); Trò chơi gia đình (GIFT04, GIFT08, GIFT10). Mỗi nhóm có 3 sản phẩm và 3 ảnh riêng. Chọn tuổi 6–8 và tất cả mức giá để xem đủ 3 món mỗi nhóm; tuổi/ngân sách khác có thể làm giảm số món. Danh mục nhận diện từ sở thích đang chọn trước, sau đó mới từ đồ chơi yêu thích, nên chọn một nhóm mới không bị giữ ở nhóm xe đua từ hồ sơ cũ.

Ảnh AI được tạo bằng built-in image_gen, lưu ở `public/mock/images/products/gift01.jpg`…`gift10.jpg` (không có gift05, món diều cũ). Prompt lưu ở `scripts/category-image-prompts.json`; dữ liệu sản phẩm, giá và tuổi vẫn là minh họa.
