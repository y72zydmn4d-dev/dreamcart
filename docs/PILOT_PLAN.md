# DreamCart — Pilot Plan (Phase 11)

**Status: `PENDING_HUMAN_VALIDATION`.** This plan is ready to run; nobody has run it. It needs 5–10 volunteers and a facilitator. Until it has run, the usability and comprehension claims of the PRD (gate G14) are **unverified**.

## 1. Goal and pass criteria (PRD gate G14)

- At least **80%** of participants complete the whole journey (tasks 1–7 below) **unaided**.
- **100%** can say, in their own words, that **no real purchase occurred** (comprehension questions C1–C3).
- **No personal data** is collected.
- Every severity-1 and severity-2 finding is fixed (or explicitly accepted by the owner) before a go/no-go.

## 2. What the pilot can and cannot tell us

The application currently contains only **fictional "Fixturia" products with sample prices**, labeled as such (the verified real catalog is the owner's to supply). The pilot therefore tests the *journey and comprehension*: can people find, configure, cart, import, check out, follow and understand a simulated order, and do they understand it is not real. It cannot test whether a catalog of **real** products and prices feels trustworthy; schedule a second, short session on the real catalog once it exists. Tell participants up front that the products are fictional.

## 3. Participants

- 5–10 volunteers, recruited by the owner from their own network. Aim for a spread: phone and desktop, Android and iOS, people who shop online often and rarely, at least two who are not technical.
- Volunteers are adults, take part freely, and may stop at any moment without giving a reason.
- **Identity:** participants are labeled P1…P10 on every note. No names, emails, phone numbers, photographs, device identifiers or recordings of faces or voices are collected. If the owner wants screen or voice recording, it needs a separate explicit consent and is off by default; observer notes are enough.
- The application itself collects nothing (no accounts, analytics or cookies); data stays in the participant's browser. After the session the facilitator helps the participant use Settings → "Xoá toàn bộ dữ liệu" on a shared device.

### Consent text (read aloud, Vietnamese)

> Cảm ơn bạn đã giúp thử DreamCart. DreamCart là trải nghiệm mua sắm **mô phỏng**: không có thanh toán, đặt hàng hay giao hàng thật, và các sản phẩm trong bản thử này là **hư cấu**. Chúng tôi đang thử xem *ứng dụng* có dễ dùng không, không phải thử *bạn*. Bạn có thể dừng bất cứ lúc nào. Chúng tôi sẽ không hỏi tên, số điện thoại hay bất kỳ thông tin cá nhân nào, chỉ ghi lại những gì bạn làm và nói, dưới mã P1, P2… Ứng dụng không gửi dữ liệu của bạn đi đâu cả. Bạn đồng ý tham gia chứ?

Record only "consented: yes/no" on the sheet.

## 4. Setup

- A Vercel **preview** URL of the build under test (production is not authorized). Note the commit SHA on the sheet.
- Before each session: open the app on the participant's device in a normal (not private) window, check Settings → delete all data so the cart and orders are empty.
- Devices: the participant's own phone or a provided one; at least one iPhone/Safari and one Android/Chrome among the participants, and one desktop.
- The facilitator does not help during tasks; if a participant is stuck for 2 minutes, record "needed help" and give the minimum hint.

## 5. Task script (about 20 minutes; read the task, then stay quiet)

| # | Task (Vietnamese wording) | Success looks like |
|---|---|---|
| 1 | "Hãy tìm một chiếc laptop và xem các cấu hình của nó." | Reaches the Aero product page |
| 2 | "Chọn màn hình 13 inch, 16 GB RAM, 512 GB bộ nhớ, rồi thêm vào giỏ." | A configured variant is in the cart |
| 3 | "Bạn có một sản phẩm tìm thấy ở trang khác. Hãy nhập nó từ liên kết này: `https://shop.example/p/9` — tên: Tai nghe, giá: 990.000." | Imported item saved and added to the cart |
| 4 | "Tăng số lượng của chiếc laptop lên 2, rồi xem tổng tiền." | Quantity 2 and a total are seen |
| 5 | "Hãy tạo đơn hàng." | Order created with the acknowledgement ticked |
| 6 | "Cho tôi biết đơn hàng đang ở bước nào. Hãy chờ hoặc bấm tiếp cho đến khi nó được giao." | Reaches the delivered state |
| 7 | "Bây giờ hãy xem món đồ đã giao nằm ở đâu." | Finds My Collection |
| 8 | "Hãy lưu một bản sao lưu dữ liệu của bạn." | Downloads the backup |

Tasks 1–7 define "completed the journey"; task 8 is recorded separately.

## 6. Comprehension questions (ask after task 7, before showing anything else)

- **C1.** "Bạn vừa mua hàng thật chưa?" → must be **no**, in the participant's own words.
- **C2.** "Tiền của bạn có bị trừ hoặc có ai nhận đơn của bạn không?" → no.
- **C3.** "Món đồ này có được giao đến nhà bạn không? Vì sao?" → no, it is a simulation.
- **C4.** "Nếu bạn xoá dữ liệu trình duyệt thì chuyện gì xảy ra với giỏ hàng và đơn hàng?" → they are lost unless backed up.
- **C5.** "Giá trên trang là giá gì?" → a reference price with a source and a date, not a price they can pay here.
- **E1 (ease, 1–5):** "Mức độ dễ dùng?" **E2:** "Có chỗ nào bạn không chắc nên làm gì?" (free text, one line).

A "no" to any of C1–C3 is a severity-1 finding by itself.

## 7. Observer sheet (one per participant)

```
Participant: P__   Date: ____   Device/OS/Browser: ____________   Build SHA: ________   Consented: yes / no
Task  Done unaided (Y/N)   Needed help (what hint)   Time (min)   Errors / hesitations / quotes
1
2
3
4
5
6
7
8
C1 __  C2 __  C3 __  C4 __  C5 __   E1 __  E2 ______________________________
Anything that looked like a real purchase to the participant: ________________
```

## 8. Severity scale and triage

| Severity | Meaning | Rule |
|---|---|---|
| 1 | Participant believes something real happened, or loses data, or cannot continue | Fix before any release |
| 2 | Participant fails a task unaided, or an important label is misunderstood | Fix before release |
| 3 | Slows or annoys but the task is completed | Fix if small; otherwise log |
| 4 | Cosmetic, preference, wish | Log only |

Triage within 24 hours of the last session: group findings by task, merge duplicates, count how many participants hit each, assign a severity, write the fix or the reason to leave it.

**Scope guard.** Only validated friction and bugs are fixed. A request for a new feature is logged under "ideas" and is not built without the owner's approval (CLAUDE.md: do not expand the MVP scope).

## 9. After the fixes

Run the full automated suite (`npm run verify`, all three browser engines in CI, the 21-step journey), re-check each fixed finding on a device, and write the pilot report with the SHA tested and the SHA fixed.

## 10. Pilot report template (`docs/PILOT_REPORT.md`, to be written after the sessions)

```
# Pilot report
Build tested (SHA), build after fixes (SHA); dates; number of participants; devices.
Results: journey completed unaided N/M (__%), C1–C3 correct N/M, ease average, time on task.
Findings table: id, task, what happened, participants affected, severity, decision, fix PR.
Quotes (anonymous).
Open items and risks. Recommendation: go / no-go / go with conditions (owner decides).
```

## 11. Roles and limits

- **Owner:** recruits, decides go/no-go, owns the consent wording and any recording decision.
- **Facilitator:** runs sessions, keeps notes; may be the owner.
- **Engineering (Claude Code):** prepared this plan and the build; fixes triaged findings on the owner's instruction. It cannot recruit, observe real people, or judge comprehension, so no pilot result may be claimed until the sheets exist.
