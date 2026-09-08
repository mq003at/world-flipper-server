Migration order tôi sẽ dùng

Không port tất cả một phát.

Phase 0 — skeleton
config
createApp
main
database
clock
protocol codec
error handling
health endpoint
Phase 1 — login/bootstrap
identity
OpenAPI
Infodesk
session
player creation

Mục tiêu:

client login được.

Phase 2 — content/player
master data
player serialization
tutorial
inventory
character
equipment
party

Mục tiêu:

tutorial chạy tới home.

Phase 3 — core gameplay
reward
quest
gacha
shop

Mục tiêu:

chơi progression bình thường.

Phase 4 — live service
missions
mail
events
server clock
schedule

Phase 5 — tools/admin
save import/export
CDN management
season system
 -- import / export. UI rework
 -- stamina
 -- 6 month rotation banner
 -- Shop - Star sliver
mod management
server controls

Phase 6 — những thứ Starpoint chưa làm
co-op
proper shop limits
missions
public authentication
Nếu chốt architecture hôm nay

Tôi sẽ lấy cấu trúc này, không lấy cấu trúc tôi đề xuất ở lượt trước.

Lý do lớn nhất là sau khi thấy toàn bộ repo, Starpoint thực chất có hai loại complexity rất đặc thù:

protocol emulator complexity và game-domain complexity.

Nếu chỉ dùng Controller → Service → Repository, hai thứ đó sẽ lại trộn vào nhau.

Thiết kế mới phải giữ ranh giới:

             WORLD FLIPPER CLIENT
                      │
                protocol adapter
                      │
                      ▼
                feature modules
               /       |       \
          mutable    static     time/RNG
           state     content
             │          │
           SQLite      JSON

Binary CDN ───────── separate delivery plane
Admin UI  ────────── separate adapter

Đó là architecture tôi nghĩ đủ sạch để chúng ta có thể kéo project từ “local emulator” sang private live-service server sau này mà không phải đập đi xây lại lần nữa.


----

Cần test mitproxy để check xem có mua beads qua GGPlay Billing không
Tạo 1 chỗ cho probability list
Sửa trag admin
--< Free beads fail, lần khác thử lại. .env có field đó>





Fix conf Shop

----

## LIVE SERVICE
### Lifecycle
- 6 tháng reset content. Beads giữ, nhưng unit bị deleted. Weapon giữ.
- Banner:
+ 5 banner thường trực: Base Banner, New Faces, Rerun, Elemental, Weapons. Duration 7 ngày reset. Nếu tuần cuối cùng của tháng không đủ 7 ngày thì cộng vào banner trước. Tối đa 13 ngày là reset.
+ Banner phụ nếu có: Seasonal, Meteor Fes, Anniversary. 
+ Banner đặc biệt: Tutorial.
-> Ngoài ra, để hỗ trợ người chơi mới, có thể mua thẳng 1 unit 5 sao trong shop. Pool được chọn là 15 unit trong Base Banner. 
-> Những thay đổi phía Banner:
+ Base banner: gacha_id = 1. Không có gì nhiều. 10 roll đầu tiên chắc chắn có 5 sao.
+ New Face Banner: 3 featured unit riêng. Về phía non featured, 5 unit 5 sao mỗi hệ nhưng không featured, 10 unit 4 và 3 sao mỗi hệ nhưng không featured. Không theo banner cũ, hệ thống tự tạo. Có database keep track các unit đã từng vào banner và ngày tháng luôn.
+ Rerun Banner: 3 featured unit mỗi rarity, tổng 9 unit featured. Chỉ láy trong Base và các unit được  Về phía non featured, 5 unit 5 sao mỗi hệ nhưng không featured, 10 unit 4 và 3 sao mỗi hệ nhưng không featured. CHÚ Ý, không bao giờ lấy unit trong banner ngay trước vào đây. Rerun Banner start vào ngày 21 mỗi tháng đầu tiên.
+ Elemental Banner: tương tự nhưng tất cả unit đều cùng 1 hệ. Fix mặc định hệ theo code của hệ thống. 1 là water thì phải.
+ Seasonal Banner: tôi sẽ manually set, ở đây được set rate 5 sao, 4 sao, 3 sao luôn.
+ Meteor Fes: Rate tăng, nhưng chỉ xuất hiện 2 lần vào 2 tuần cuối của tháng. Coi như là 2 cái 7 ngày đấy.
+ Anniversary: 7 ngày cuối mỗi tháng. Đi kèm là event 1 pull mỗi ngày trên banner này. Reroll banner nhưng lần này lấy hết các unit đã release.

#### Sliver shop:
Catalog:
- Released ★5 Character: 600
- Released ★4 Character: 300
- ★5 Astral Gem: 600
- ★4 Astral Gem: 300

Removed:
- All Armaments
- ★3 Characters
- Other original Star Sliver items

Character eligibility:
- Base pool always available
- Any normal character released in current season becomes available
- Unreleased characters must never appear
- Limited/Seasonal/Fes units excluded by default unless explicitly configured

Stock:
- Characters: unlimited purchase unless existing client/master constraints require otherwise
- Astral Gems: configurable; default unlimited or monthly-limited depending desired economy

Season behavior:
- Character catalog rebuilds from current-season release state
- Currency persists across seasons
- +2100 grant every season

Configuration:
- Currently for the 07/26 - 12/26, 
