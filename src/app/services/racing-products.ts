import type { GiftProduct } from './gift-shop';

// Fictional catalog for the racing-interest demo; not official inventory or age certification.
const racing=(id:string,name:string,price:number,color:string,description:string,tags:string[]):GiftProduct=>({
  id,name,price,description,theme:'gach_lego',ages:['6–8','9–12','13+'],
  emoji:'🏎️',collection:'racing',imageUrl:`/mock/images/products/${id.toLowerCase()}.jpg`,
  tags:['xe đua','đua xe','racing','ô tô',color,...tags],
});

export const RACING_PRODUCTS:GiftProduct[]=[
  racing('RACE01','Xe thể thao Đỏ Tia Chớp',129000,'đỏ','Mô hình xe thể thao sọc trắng, bánh lăn tự do để tạo đường đua trên bàn.',['xe thể thao','mô hình','sưu tập']),
  racing('RACE02','Xe đua Công Thức Xanh',179000,'xanh dương','Thiết kế bánh hở và cánh gió, dành cho những cuộc đua tưởng tượng kiểu F1.',['f1','công thức','mô hình']),
  racing('RACE03','Xe Rally Vàng Bứt Phá',219000,'vàng','Mô hình rally có lốp lớn và đèn nóc, gợi ý kể chuyện chinh phục đường đua.',['rally','địa hình','mô hình']),
  racing('RACE04','Buggy điều khiển Vượt Địa Hình',699000,'xanh lá','Xe buggy kèm tay điều khiển, để thử các lượt lái và vượt chướng ngại vật.',['buggy','điều khiển','địa hình']),
  racing('RACE05','Bộ lắp ghép Siêu Xe Cam',349000,'cam','Tự lắp mô hình siêu xe từ các mảnh ghép rồi sáng tạo câu chuyện đua xe.',['lắp ghép','sáng tạo','lego']),
  racing('RACE06','Xe Drift Tím Đường Phố',159000,'tím','Mô hình coupe tím với mâm bạc, bổ sung phong cách khác cho bộ sưu tập xe.',['drift','mô hình','sưu tập']),
  racing('RACE07','Đường đua Vòng Xoáy Tốc Độ',459000,'xanh dương','Bộ đường đua vòng lượn kèm một xe xanh, thử thay đổi điểm xuất phát.',['đường đua','vòng lượn','thử thách']),
  racing('RACE08','Đường đua Song Đấu',599000,'đỏ','Hai làn đua cùng xe đỏ và vàng để phụ huynh và bé thi tài qua từng lượt.',['đường đua','gia đình','hai người']),
  racing('RACE09','Trạm Pit-stop & Gara Đội Đua',399000,'trắng','Gara mô hình kèm xe, giá lốp và cầu nâng để nhập vai đội kỹ thuật đường đua.',['gara','nhập vai','pit stop']),
];
