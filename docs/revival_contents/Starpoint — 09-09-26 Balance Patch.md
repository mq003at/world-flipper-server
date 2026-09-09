# Starpoint — 09/09/26 Balance Patch

## 3★ Unit Balance Reworks

Balance pass đầu tiên tập trung vào việc **revive các 3★ có kit lỗi thời, thiếu payoff hoặc thiếu identity rõ ràng**, đồng thời đảm bảo roster 3★ có đủ nền tảng để xây team và solo progression content một cách ổn định.

---

## Cody
**Dark / Bruiser / Power Flip Carry**

> **Design intent:** Build-around 3★ carry. Adil vẫn là synergy rất tốt, nhưng không còn là gần như đáp án duy nhất để kích hoạt Ability 3.

### Leader Ability
- Dark ATK **+15% → +25%**
- Giữ nguyên phần stacking gốc.

### Skill
- Self ATK Up **+75% → +90%**

### Ability 1
- **Unchanged**

### Ability 2
- **Unchanged**
- Every ATK Up condition:
  - Self ATK +20%
  - **[MAX: +60%]**

### Ability 3
- Self ATK threshold:
  - **+300% → +250%**
- Khi đạt threshold:
  - Self ATK +100%
  - **Power Flip Damage +25%**

### Ability 4
- **Unchanged**
- Start Skill Gauge +25%

### Ability 5
- **Unchanged**
- Self ATK +15%

### Ability 6
- Every ATK Up condition:
  - Self ATK +10%
  - Power Flip Damage +5%
- **[MAX: +30% ATK / +15% PF]**

---

## Faf
**Water / Tank-Support**

> **Design intent:** Fire-specialist cover tank. Chuyển một phần Fire Resistance dư thừa thành party sustain, nhưng Faf vẫn cần healer bên ngoài và không trở thành self-sufficient tank.

### Skill
- Party ATK Up:
  - **+30% → +40%**
- Fire Resistance:
  - **+20% → +15%**
- Duration:
  - **10s → 12s**

### Ability 1
- **Unchanged**
- Self Fire Resistance +12%

### Ability 2
- Khi Faf có buff:
  - Cover các Main khác.
- Fire Resistance bonus:
  - **+80% → +70%**
- Giữ:
  - Self Fire Resistance +8%

### Ability 3
- **Unchanged**
- Every 5 hits:
  - Fire Resistance +9%
- **[MAX: +45%]**

### Ability 4
- **Unchanged**
- Fire Resistance +8%

### Ability 5
- Buff Duration:
  - **+6% → +10%**

### Ability 6
**Reworked completely**

- For every 30% self Fire Resistance:
  - Party Healing Effectiveness +5%
- **[MAX: +30%]**

---

## Folus
**Wind / Universal Combo Utility**

> **Design intent:** *Jack of all trades, master of none.* Folus không còn bị khóa vào Wind Fever. Combo được dùng để cung cấp Fever, Float, debuff và universal ATK support.

### Leader Ability
**Before**
- Every 30 combo:
  - Wind characters' ATK +9%
- **[MAX: +90%]**

**After**
- Every 30 combo:
  - **All allies' ATK +9%**
- **[MAX: +90%]**

### Ability 1
**Before**
- Every 30 combo:
  - Fever Gauge +15

**After**
- Every 15 combo:
  - **Fever Gauge +10**

### Ability 2
- **Unchanged**
- Upon reaching 100 combo:
  - Own ATK +90%
- **[MAX: +90%]**

### Ability 3
**Before**
- `[Main]` While in Fever:
  - Own ATK +120%

**After**
- `[Main]` While in Fever:
  - **Enemies' DEF -10%**

> **Implementation note:** Nếu engine không có generic DEF Down, sử dụng equivalent generic Vulnerability / Damage Taken modifier.

### Ability 4
- **Unchanged**
- Start Skill Gauge +25%

### Ability 5
**Before**
- Own damage received from enemies with ATK Down -4%

**After**
- Upon reaching 50 combo:
  - **Grant allies Float for 5s**

### Ability 6
**Before**
- Skill activates:
  - Combo +3
  - Own ATK +10%

**After**
- Skill activates:
  - **Combo +10**

Phần Own ATK bị loại bỏ.

---

## Claw
**Thunder / Fever Fighter**

> **Design intent:** Self-contained Fever fighter / secondary DPS. Claw tập trung vào việc tự vận hành Fever và tự gây damage, khác với Holiday Challua là party Fever support.

### Leader Ability
**Before**
- Thunder ATK +15%
- Fever Duration +25%

**After**
- Thunder ATK +15%
- **Fever Duration +35%**

### Skill
- **Unchanged**

### Ability 1
- **Unchanged**
- Khi self nhận ATK Up condition:
  - Fever Gauge +20

### Ability 2
**Before**
- While in Fever:
  - Own ATK +60%

**After**
- Upon entering Fever:
  - **Self ATK Up +70% for 20s**

### Ability 3
- **Unchanged**
- `[Main]` Fever Duration +20%

### Ability 4
- **Unchanged**
- Start Skill Gauge +25%

### Ability 5
- **Unchanged**
- Start Skill Gauge +25%

### Ability 6
- **Unchanged**
- When Skill activates:
  - Self ATK Up +40% for 15s

---

## Treyne
**Fire / Universal Power Flip Specialist**

> **Design intent:** Treyne đi theo cả hai hướng:
>
> 1. Giữ giá trị như một universal PF Unison / generalist.
> 2. Có lý do thật sự để đứng Main hoặc Leader nhờ giảm mạnh combo requirement của Lv3 Power Flip.

### Leader Ability
- Power Flip Damage:
  - **+70% → +130%**

### Skill
- **Unchanged**

### Ability 1
- **Unchanged**
- Power Flip Damage +20%

### Ability 2
- **Unchanged**
- Every 5 ball flips:
  - Own ATK +7%
- **[MAX: +35%]**

### Ability 3
**Before**
- `[Main]`
  - Combo needed for Lv3 Power Flip -2
  - Power Flip Damage +25%

**After**
- `[Main]`
  - **Combo needed for Lv3 Power Flip -7**

Phần +25% Power Flip Damage bị loại bỏ.

### Ability 4
**Before**
- Leader ATK +10%

**After**
- Leader ATK +10%
- **Power Flip Damage +20%**

### Ability 5
- **Unchanged**
- Power Flip Damage +12.5%

### Ability 6
- **Unchanged**
- Every Lv3 Power Flip:
  - Power Flip Damage +4%
- **[MAX: +20%]**

> **Balance watch:** Giữ Leader ở +130% generic PF trong patch này. Theo dõi team-building và cross-element dominance trước khi cân nhắc nerf thêm.

---

## Holiday Challua
**Water / Fever Party Support**

> **Design intent:** Water Fever backbone. Challua kéo dài Fever và đóng góp lượng lớn party ATK, thay vì cố trở thành selfish attacker.

### Leader Ability
**Before**
- Water ATK +15%
- Fever Duration +25%

**After**
- Fever Duration 20%. While self has ATK Up and 3 Water units in the main team, Fever duration +50% additionally.

### Skill
- **Unchanged**
- Party ATK Up +60% for 20s
- Fever Gauge +40

### Ability 1
**Before**
- While self has ATK Up:
  - Own ATK +35%

**After**
- While self has ATK Up:
  - **Water characters' ATK +20%**

### Ability 2
**Before**
- Every time self gains ATK Up:
  - Own ATK +7%
- **[MAX: +35%]**

**After**
- Every time self gains ATK Up:
  - **Water characters' ATK +5%**
- **[MAX: +25%]**

### Ability 3
**Before**
- `[Main]` While in Fever:
  - Own ATK +110%

**After**
- [Main] Fever Mode Duration +20% / While in Fever, Water characters' ATK +10%

### Ability 4
- **Unchanged**
- While self has ATK Up:
  - Water characters' Fever generation +10%

### Ability 5
- **Unchanged**
- When self gains ATK Up:
  - Fever Gauge +10
  - Cooldown: 15s

### Ability 6
**Before**
- Every time Fever starts:
  - Own ATK +15%
- **[MAX: +45%]**

**After**
- Every time Fever starts:
  - **Water characters' ATK +10%**
- **[MAX: +30%]**

---

## Colt
**Thunder / Multiball Commander**

> **Design intent:** Multiballs là “quân đội” của Colt. Summon nhiều hơn → refund Skill Gauge → tăng ball-flip count → ramp party ATK → MB2 biến Multiballs thành nguồn damage thực sự.

### Leader Ability
- Loại bỏ hoàn toàn flat Thunder ATK.

**New**
- Every 20 ball flips:
  - **Thunder Multiball ATK +10%**
- **[MAX: +100%]**

### Skill
- **Unchanged**
- Summon 2 Thunder Multiballs.

### Ability 1
**Before**
- Own ATK +20%

**After**
- When a Multiball appears:
  - **Own Skill Gauge +10%**

### Ability 2
- **Unchanged for now**
- Every 20 ball flips:
  - Thunder characters' ATK +5%
- **[MAX: +20%]**

### Ability 3
**Before**
- `[Main]` Multiball ATK +40%

**After**
- `[Main]`
  - **Own Skill summons 1 additional Multiball**

Main Colt summon **3 Multiballs** thay vì 2.

### Ability 4
- **Unchanged**
- Start Skill Gauge +25%

### Ability 5
- Multiball ATK:
  - **+10% → +20%**

### Ability 6
**Before**
- Multiball ATK +10%

**After**
- **Multiballs' Direct Attack Damage +30%**

> **Balance watch:** A1 hiện universal: +10% gauge cho mỗi Multiball xuất hiện. Theo dõi khả năng abuse với external high-count Multiball summoners.

---

## Marguerite
**Light / One-Punch Skill Damage Sniper**

> **Design intent:** 3★ glass-cannon one-shot specialist. Marguerite sở hữu front-loaded personal Skill Damage cực lớn nhưng gần như không cung cấp utility. Nếu trận kéo dài hoặc bị đánh nhiều, sức mạnh vẫn suy giảm như thiết kế gốc.

### Leader Ability
**Before**
- Light characters' Skill Damage +70%

**After**
- **Own Skill Damage +225%**

### Ability 1
- **Unchanged**
- Own Skill Damage +90%
- Every 5 hits taken:
  - Own Skill Damage -30%
- **[MAX: -120%]**

### Ability 2
**Before**
- While in Fever:
  - Own Skill Damage +100%

**After**
- **Own Skill Damage +35%**

### Ability 3
- **Unchanged**
- `[Main]` While HP ≥80%:
  - Light characters' Skill Damage +55%
  - Fatigue immunity

### Ability 4
**Before**
- Own Skill Damage +20%

**After**
- **Start Skill Gauge +25%**

### Ability 5
- **Unchanged**
- Start Skill Gauge +25%

### Ability 6
**Before**
- While HP ≥80%:
  - Own ATK +30%

**After**
- While HP ≥80%:
  - **Own Skill Damage +70%**

### Final MB2 Result
- Start Skill Gauge:
  - **50% total**

Marguerite Leader ở trạng thái opening / high HP sở hữu lượng personal Skill Damage cực lớn, nhưng gần như toàn bộ power budget nằm trong cùng Skill Damage bucket và Leader Ability không buff các carry khác.

---

# Patch Summary

| Unit | Element | New Identity |
|---|---|---|
| Cody | Dark | Build-around Power Flip Carry |
| Faf | Water | Fire-specialist Cover Tank / Sustain Amplifier |
| Folus | Wind | Universal Combo Utility |
| Claw | Thunder | Self-contained Fever Fighter |
| Treyne | Fire | Universal Power Flip Specialist |
| Holiday Challua | Water | Water Fever Party Support |
| Colt | Thunder | Multiball Commander |
| Marguerite | Light | One-Punch Skill Damage Sniper |

## Balance Philosophy

- 3★ units không cần cạnh tranh trực tiếp với premium 5★ về tổng power budget.
- Mỗi 3★ cần có **một lý do rõ ràng để tồn tại trong team-building**.
- Một số 3★ có thể trở thành specialist rất mạnh trong đúng niche.
- MB1 nên thể hiện identity; MB2 có thể hoàn thiện engine hoặc nâng ceiling.
- Không bắt buộc mọi 3★ phải mono-element.
- Element specialists vẫn giữ element lock khi đó là một phần quan trọng của identity.
- Generalist/mechanic-driven units có thể sử dụng generic effects để mở rộng team-building.
- Mục tiêu dài hạn là đảm bảo **3★-only teams có thể solo progression content ổn định khi được build đúng archetype và đầu tư đầy đủ**.