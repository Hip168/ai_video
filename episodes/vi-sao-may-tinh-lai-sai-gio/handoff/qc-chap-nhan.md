# Chấp nhận lỗi còn sống sau CAN_NGUOI_DUNG (sổ seq 39)

- Ngày: 2026-11-21. Ghi bởi: qc (theo lệnh sếp tổng).
- Lỗi: MINOR `phu-de-ngat-dong`, video dài 317,8–323,8 s, phụ đề tách "362-" / "TTP" (khoá `731e3686782b`, còn sống từ vòng trước nên sổ trả CAN_NGUOI_DUNG).
- Quyết định: sếp tổng chấp nhận lỗi MINOR này cho bản dài, không render lại (khoảng 6 s, vẫn đọc được). Sếp tổng báo: người dùng giao toàn quyền 21/11 cho các quyết định video.
- Ghi chú: quyết định do sếp tổng chuyển lời; qc không trực tiếp nhận lời người dùng. Bản TikTok phan-3 đã giữ "362-TTP" một dòng (04d8aa9).
- Không sửa `handoff/qc.json` để giữ khớp `findings_sha256` trong `qc.verdict` và sổ.

Ký: sep-tong (ghi qua qc)
