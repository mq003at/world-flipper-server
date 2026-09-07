1. Dashboard

Trang đầu nên trả lời ngay:

Server time hiện tại
Season hiện tại
Cycle hiện tại
Bao lâu tới cycle kế
Active NEW / RERUN / WEAPON
Festival hay normal
Month-end free x10 đang active không
Active story event / part hiện tại
Online players
Active multiplayer rooms
Server uptime / DB status

Kiểu:

Season 2
Cycle 17
Day 49 / 91

NEW      → Unit A, B, C
RERUN    → Unit X, Y, Z
WEAPON   → ...
Festival → No

Story Event #8
Part 2
Ends in 13h 21m
2. Clock / Time Controls

Anh đã có nhưng nên hoàn thiện thành:

Current real time
Current server time
Freeze clock
Advance:
+1 hour
+1 day
+3 days
+1 cycle
next month
next season
Set exact datetime
Reset về real time
Preview hậu quả trước khi jump:
cycle change
banner change
daily reset
event phase unlock
season rollover

Đặc biệt nên có:

Dry-run time travel

Ví dụ nhập 2026-03-31 23:59 → 2026-04-01 00:01, console hiện trước:

Will trigger:
- Season 1 → Season 2
- Close 3 banners
- Materialize Cycle 1
- Reset daily free pull
- Close Story Event ...

Cực hữu ích để test.

3. Gacha Console

Đây là nơi Current Probability nằm.

Current Probability

Chọn banner:

NEW
RERUN
WEAPON

Hiện:

featured IDs
unit names nếu sau này extract được
rarity
exact rate
total rarity rate
off-banner count
Festival modifier
currently eligible released pool

Ví dụ:

★5 Total: 5%

Featured:
251008  0.7%
243001  0.7%
...

Off-banner ★5:
127 units
Total 2.9%
Gacha Simulator

Nút:

Simulate 10
Simulate 100
Simulate 10,000

Không thay inventory thật.

Dùng để check distribution:

Expected ★5: 5%
Observed: 4.97%

Cái này rất đáng làm vì vừa phát hiện current gacha rate implementation có dấu hiệu sai.

Rotation controls
View current rotation
View upcoming materialized cycles
Reroll future cycle
Force specific unit vào NEW/RERUN
Lock cycle để scheduler không thay
Materialize next N cycles

Current cycle đã bắt đầu thì mặc định không cho reroll.

4. Season / Live Service

Đây sẽ là màn hình quan trọng nhất về sau.

Season 1
Jan 1 → Apr 1

Cycles:
#1 Jan 1
#2 Jan 4
...

Cho xem:

season start/end
cycle list
NEW sequence
Festival sequence
month-end campaigns
story-event schedule
upcoming content

Actions:

Generate/materialize season
Regenerate future schedule
Start next season
Preview next season
Export schedule JSON
Import schedule JSON

Tức scheduler vẫn tự động, nhưng admin có quyền override.

5. Event Console

Riêng Story Events:

Event #7
Start: Day 28
Part 1: Day 28
Part 2: Day 29
Close: Day 30

Hiện:

event ID
phases
active quest IDs
currently unlocked stages
box gacha / shop
missions
welfare
currencies

Actions:

Open event now
Close event
Unlock Part 2
Extend duration
Skip event
Replay event
Inspect player progress

Sau này thêm:

Raid
Descension
Carnival
Time Attack
campaign overlays
6. Player Management

Trang Players hiện mới vào save.

Nên thêm:

Overview
player ID
name
rank
mana
beads
current season/cycle progress
last login
account created
characters count
weapons count
Player actions
Export save
Import save
Reset player
Clone player
Grant:
beads
mana
items
character
weapon
Remove item/unit
Unlock quest/event
Reset event progress
Reset gacha campaign entitlement
Reset daily missions

Và vì stamina infinite:

Stamina Mode: Unlimited

chỉ hiện informational thôi.

7. Inventory Inspector

Cực kỳ hữu ích khi debug rewards.

Search:

character 251008
equipment 1234
item 42

Rồi thấy:

Player owns: 3
Obtained from:
- gacha ...
- reward ...

Ít nhất V1 chỉ cần:

search ID
current quantity
grant/remove

Không cần provenance log ngay.

8. Master Data Browser

Tôi rất muốn có cái này.

Thay vì mở JSON bằng editor:

Characters
Gacha
Quests
Items
Equipment
Events
Missions
Shops

Search theo:

ID
name
rarity
element

Ví dụ:

Character 251008
Rarity 5
Element Fire
Appears in gachas:
42, 87, 119

Sau khi lấy được unit names từ CDN thì admin panel càng hữu dụng.

9. Multiplayer Monitor

Khi bắt đầu làm co-op:

Active rooms: 7

Room #123456
Host A
Guest B
COM C
State: BATTLE
RTT ...
Battle server ...

Actions:

inspect room
close stale room
disconnect participant
force COM takeover
dump session state

Battle server debug:

connection count
packets/sec
unknown opcode count
current sessions
isolated branches count

Cái này sẽ cứu rất nhiều giờ reverse-engineering.

10. Server Controls

Nên có một trang rõ ràng:

Maintenance mode
Restart scheduler
Reload master data
Clear caches
Run daily reset
Run weekly reset
Materialize schedules
DB checkpoint

Không nhất thiết restart whole Node process từ web nếu khó.

Có thể chỉ expose các safe controls.

11. Logs / Audit

Ít nhất:

latest errors
gacha rolls
reward grants
admin actions
scheduler actions
clock changes

Ví dụ:

13:40 Admin set time +3 days
13:40 Cycle 12 materialized
13:40 NEW [A,B,C]
13:40 RERUN [X,Y]

Admin action log đặc biệt quan trọng vì sau này anh sẽ tự hỏi:

“Ủa sao thằng này tự dưng có 50k beads?”

12. Save / Backup Tools

Ngoài per-player import/export:

export all players
full DB backup
restore DB backup
scheduled backup status
download SQLite DB snapshot
validate save before import

Import nên có preview:

Will replace:
characters +37
equipment +82
mana ...

rồi mới confirm.

13. Mod Management

Phase sau:

list installed mods
enable/disable
priority/order
reload
inspect overrides
detect conflicts

Ví dụ:

mod A overrides quest 102
mod B overrides quest 102
→ conflict
14. Data Integrity / Diagnostics

Một trang kiểu:

Run Health Check

Check:

orphan DB records
invalid character IDs
missing equipment IDs
gacha pool sum
rarity total ≈ 100%
unreleased unit leaked into pool
duplicated rotation entry
event quest missing
schedule overlaps
season boundary errors

Đặc biệt gacha:

Normal:
★5 5%
★4 25%
★3 70%
✓

Festival:
★5 7.5%
...

Cái này rất đáng có.

Nếu chia theo ưu tiên

Tôi sẽ làm tiếp admin console theo thứ tự:

P0
1. Dashboard
2. Clock controls
3. Current Probability
4. Gacha simulator
5. Season/cycle viewer
6. Player management

P1
7. Event console
8. Master data browser
9. Backup/restore
10. Health checks

P2
11. Multiplayer monitor
12. Mod management
13. Advanced server controls
14. Audit/log viewer