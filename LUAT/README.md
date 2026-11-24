# LUAT: bộ luật hiện hành của hai kênh (bản gộp 24/11/2026)

Hai kênh: **Con Bit** (tin học tiếng Việt, repo `~/Documents/ai_video`) và **Follow the Buck** (kinh tế đời thường Mỹ, tiếng Anh, repo `~/Documents/AI_VIDEO_FLOW_STORY`, worktree `.worktrees/kenh-my-bible`).

| File | Nội dung |
|---|---|
| `chung.md` | An toàn, file/Drive/dọn rác, git, cách đăng từng nền tảng, hạn mức |
| `con-bit.md` | Tiêu đề, mô tả, ảnh bìa, Short, caption, hashtag, giờ đăng, âm thanh, fact, giọng, outro của Con Bit |
| `buck.md` | Như trên cho Follow the Buck |
| `flow-chung.md` | Nguyên tắc chung của quy trình, công cụ cho phép, bảng outlier, đo lường, CHECKLIST Y/F/T (nguồn duy nhất) |
| `flow-con-bit.md` | Quy trình từng khâu của Con Bit + nợ DEV đang chặn. Phiên Con Bit đọc file này, không đọc flow Buck |
| `flow-buck.md` | Quy trình từng khâu của Follow the Buck + nợ DEV đang chặn. Phiên Buck đọc file này, không đọc flow Con Bit |
| `tranh-luan/` | Biên bản tranh luận đổi luật (`YYYY-MM-DD-<slug>.md`) |

## Thứ tự ưu tiên
1. Lệnh mới nhất của chủ kênh trong phiên > `LUAT/` > `.team/decisions.md` > memory > các file cũ (PLAYBOOK, bible, lich-dang, chien-luoc). Luật mới nhất thắng [D43].
2. Gặp mâu thuẫn giữa `LUAT/` và nguồn cũ: theo `LUAT/`, rồi ghi lại chỗ lệch cho trưởng kênh sửa. Dòng ghi "CHỜ CHỦ KÊNH" là chưa chốt: giữ cách đang làm, không tự đổi.

## Cách đổi luật
- Chỉ hai đường: (a) chủ kênh ra lệnh trực tiếp; (b) skill `tranh-luan` (`~/Documents/ai_video/.claude/skills/tranh-luan/SKILL.md`: ỦNG HỘ / PHẢN ĐỐI / TRỌNG TÀI, chốt riêng từng kênh, biên bản ở `LUAT/tranh-luan/`).
- Mỗi dòng luật có nguồn trong ngoặc vuông ở cuối, luật mới thêm ngày: `[owner 2026-11-24]`, `[tranh-luan 2026-11-24 <slug>]`.
- Sửa một luật thì xoá hoặc gạch dòng cũ ngay trong cùng lần sửa. Không được để hai dòng mâu thuẫn.
- Luật quyết định mới (D44…) vẫn ghi vào `.team/decisions.md`, đồng thời cập nhật `LUAT/` trong cùng commit.
- Các file cũ chỉ để tham khảo; dòng đầu mỗi file cũ trỏ về đây.
