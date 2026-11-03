# Đề mục 11: giao diện công khai (hợp đồng DEV-11 ↔ TESTER-11)

Mã: `audio/src/aivideo/gates.py` (cổng, sổ tập), `audio/src/aivideo/qualify.py` (đo người kiểm). Chạy từ `audio/`: `PYTHONPATH=$PWD/src .venv/bin/python -m aivideo.gates <lệnh> ...`.

## Quy ước chung
- Mọi lệnh in **một object JSON** ra stdout. Quyết định đọc từ JSON, không đọc từ chữ.
- Mã thoát: `0` đạt; `1` bị chặn / chưa đạt / lỗi (`lỗi: ...` ra stderr, không JSON); `2` sai tham số (argparse); `3` `CAN_NGUOI_DUNG`.
- `--episodes-dir` mặc định `../episodes`. `<slug>` theo `^[a-z0-9]+(-[a-z0-9]+)*$` hoặc `_template`.
- Hàm Python tương ứng (test gọi trực tiếp): `extract_items(doc)`, `check_claims(claims)`, `gate1(slug, episodes_dir)`, `gate2(slug, episodes_dir, write_ledger=True)`, `gate3(slug, episodes_dir, kenh_path, video=None)`, `evaluate_findings(raw, root)`, `script_text_hash(doc)`, `prepare_factcheck(slug, episodes_dir, role_file, tmp_parent=None)`, `build_factcheck_prompt(role_text, batch_dir)`, lớp `Ledger`.

## `claims.json` (sổ fact, D22)
Mảng. Mỗi phần tử:
```json
{"id":"c001","claim":"...","question":"...","sources":[{"url":"https://...","credibility":"primary|secondary|anecdotal"}],"status":"DAT|SAI|CHUA_KIEM"}
```
`sources` là mảng (có thể rỗng khi chưa `DAT`), `url` http(s). `id` duy nhất, các chuỗi không rỗng. Mảng rỗng hợp lệ.

## `extract-claims <script.json> [-o file]`
Bắt trên `text` GỐC (và `spoken` nếu có chữ số) của từng beat, trước `normalize_vi`:
```json
[{"scene":"sc01","beat":"b001","field":"text","kind":"number|name","match":"3,14"}]
```
- `number`: mọi dãy chữ số, kể cả nối bằng `. , : / - –` (`3,14`, `1.000`, `15.01.2024`, `2024-01-15`). Số dính chữ chỉ bắt phần chữ số: `x86` ra `86`, `1080p` ra `1080`, `v2` ra `2`. Số viết bằng chữ không bị bắt.
- `name`: từ viết hoa đứng giữa câu (không đứng đầu câu, đầu dòng, sau `. ! ? … : ;`), từ có chữ hoa giữa từ (`iPhone`, `JavaScript`), từ viết hoa toàn bộ từ 2 chữ cái (`IBM`, `CERN`) trừ tập thuật ngữ chung `GENERIC_ACRONYMS` (CPU, GPU, RAM, ROM, SSD, HDD, USB, OS, API, URL, IP, TCP, UDP, DNS, HTTP, HTTPS, HTML, CSS, SQL, AI, ID, PC, LED, LCD, GB, MB, KB, TB, GHz, MHz, UTF, ASCII, BIOS, LAN, WAN, VPN, GUI, CLI, IDE).
- Luôn mã thoát 0.

## `gate1 <slug>`
Chỉ đọc `claims.json`. Chặn (`pass:false`) khi: sai dạng; trùng id; có claim `CHUA_KIEM` hoặc `SAI`; claim `DAT` không có nguồn `primary` hoặc `secondary` (chỉ `anecdotal` hoặc rỗng); `sources` sai dạng; claim về số (có chữ số trong `claim`) `DAT` mà không có nguồn `primary` và không có ít nhất hai nguồn `primary`/`secondary` khác tên miền gốc. Tên miền gốc (eTLD+1 xấp xỉ, hàm `root_domain`): cắt dấu chấm cuối (`x.com.` = `x.com`), `www.` bị bỏ, lấy hai nhãn cuối, hoặc ba nhãn khi dạng `co.uk`, `com.vn` (`a.x.com` và `b.x.com` cùng miền gốc `x.com`). Host là địa chỉ IP (v4, v6) cho `root_domain` rỗng và không được tính vào điều kiện "hai nguồn khác miền".
```json
{"gate":"gate1","pass":false,"problems":[{"claim":"c003","problem":"..."}]}
```

## `gate2 <slug> [--no-ledger]`
Gồm mọi kiểm của gate1, cộng `validate_script` của `aivideo.episode`, cộng phủ claim: mỗi `number`/`name` của một beat phải khớp ít nhất một claim trong `beat.claims` (id tồn tại, status `DAT`). Khớp số: số đơn (số nguyên, thập phân, phân cách nghìn) so theo GIÁ TRỊ, dùng đúng quy tắc nghìn/thập phân của `normalize_vi` (`_THOUSANDS`, `_NUM`): `1.000` = `1000` (nghìn), `3,14` = `3.14` (thập phân), nhưng `3,14` khác `31,4` và khác `314`, `1,000` (= 1) khác `1.000`. Token ghép (IP, ngày `15.01.2024`, số 0 đứng đầu) phải trùng nguyên văn một token trong claim; khoảng/giờ/ngày nối bằng `: / -` còn được chấp nhận khi mọi thành phần số có trong claim. khớp tên: chuỗi chữ thường nằm trong `claim` (NFC, không phân biệt hoa thường). Số/tên không có claim, hoặc claim `CHUA_KIEM`/`SAI` được trỏ tới → chặn.
Đạt (và không có `--no-ledger`) thì ghi vào `ledger.json` một mục `stage:"cong2"`, `verdict:"DAT"`, `outputHash` = `script_text_hash`, `claimsHash` = sha256 của `claims.json`.
```json
{"gate":"gate2","pass":true,"problems":[{"beat":"b001","kind":"number","match":"3,14","problem":"..."}],"scriptHash":"<64 hex>","claimsHash":"<64 hex>"}
```
`script_text_hash(doc)`: sha256 của JSON chuẩn (`sort_keys`, `ensure_ascii=False`, `separators=(",",":")`) của `{"title":meta.title,"chapters":[{id,title}],"beats":[{"scene","id","text","spoken","claims"}...]}` theo thứ tự cảnh và beat, chuỗi NFC. Chỉ phần lời: đổi `props`, `type`, `sfx`, `pause_ms`, `cue`, `meta.music` KHÔNG đổi hash; đổi một ký tự `text`/`spoken`/tiêu đề chương/danh sách `claims` thì đổi.

## `verdict <findings.json> [--root DIR]`
`findings.json` = `{"findings":[{"severity":"CRITICAL|MAJOR|MINOR","rule","file","quote","failing_case","owner"}]}`; mọi trường chuỗi không rỗng. `file` tính từ `--root` (mặc định thư mục hiện tại), phải nằm trong root.
- Thiếu file / không phải JSON / sai dạng / bất kỳ phát hiện nào sai dạng → `CHUA_DUYET`.
- Phát hiện có `quote` dài hơn `MAX_QUOTE` = 300 ký tự cũng bị loại.
- Phát hiện mà file không tồn tại, nằm ngoài root, hoặc `quote` (NFC) không là chuỗi con của file → bị loại, vào `dropped`; `complete:false`.
- Còn lại: có CRITICAL → `CHAN`; có MAJOR → `SUA`; còn lại (kể cả rỗng) → `DAT`. Chỉ tính phát hiện đã giữ.
```json
{"verdict":"CHAN","kept":[...],"dropped":[{"finding":{...},"reason":"..."}],"counts":{"CRITICAL":1,"MAJOR":0,"MINOR":2},"complete":true,"findingsHash":"<64 hex>"}
```
Mã thoát 0 chỉ khi `DAT`.

## `gate3 <slug> [--kenh PATH] [--video FILE]`
`--kenh` mặc định `<episodes-dir>/../.team/kenh.json`: `{"channelId","handle","verifiedPhone","firstVideoApproved"}`. Danh sách kiểm, mỗi mục `{"name","ok","detail"}`; `pass` = mọi mục ok. Tên mục: `chuoi-so` (chuỗi hash của ledger nguyên vẹn), `hash-kich-ban` (hash lời hiện tại = mục `cong2` DAT mới nhất; `claimsHash` cũng khớp), `lint`, `ky-thuat`, `qc` (mục ledger mới nhất của stage đó, verdict `DAT`, `scriptHash` = hash hiện tại), `qc-dong-phan-quyet` (file `handoff/qc.verdict` có đúng một dòng `PHAN_QUYET: DAT findings_sha256=<64 hex> script_sha256=<64 hex>` với script_sha256 khớp), `qc-video` (chỉ khi có `--video`: sha256 file = `artifactHash` của mục qc), `publish`.
`publish.json` cần: `title` (≤100 ký tự), `description` (có chuỗi `AI`, tức dòng báo giọng đọc do AI tạo, D21), `tags` (mảng chuỗi không rỗng), `chapters` (chuỗi bắt đầu `00:00`), `thumbnail` (đường dẫn tương đối `episodes/<slug>/`, file tồn tại), `privacy` (`unlisted`|`public`), `channelId` (bằng đúng `channelId` trong `kenh.json`), `containsSyntheticMedia` (phải đúng `false`, D21). Nếu `kenh.json` có `firstVideoApproved` khác `true` thì `privacy` phải là `unlisted`. Thiếu `kenh.json` hoặc thiếu `channelId` → mục `publish` không ok.
Đạt thì ghi mục `stage:"cong3"`.

## `ledger`
`episodes/<slug>/ledger.json`: `{"slug","entries":[...]}`. Mỗi mục:
`{"seq","ts","stage","role","pair","round","inputHash","outputHash","verdict","scriptHash","claimsHash","artifactHash","findingsHash","findingKeys","returnTo","escalate","note","cmd","prevHash","entryHash"}` (trường không dùng là `null`). `entryHash` = sha256 của mục (bỏ `entryHash`, JSON chuẩn như trên) gồm `prevHash` của mục trước (`""` cho mục đầu). Sửa/xoá/chèn một mục thì chuỗi vỡ, mọi lệnh ledger từ chối và `gate3` chặn.

- `ledger add` TỪ CHỐI (lỗi, mã 1) khâu dành riêng `cong2`, `cong3`, `lint`, `ky-thuat`, `fact`, `fact-prepare`: chỉ `gate2`, `gate3`, `ledger run`, `prepare-factcheck` (`fact-prepare`), `apply-factcheck` (`fact`) ghi các khâu đó (`RESERVED_STAGES`, `reject_reserved`).
- `ledger add <slug> --stage S --role R [--pair maker/checker] [--findings F --root DIR] [--input-hash H] [--output-hash H] [--artifact FILE] [--return-to ROLE] [--note T]`
  - Có `--findings`: mục của người kiểm, bắt buộc `--pair`; `verdict` do `verdict` tính (không có cờ nhập tay). Ghi thêm `findings_sha256`. Stage `qc` còn ghi `handoff/qc.verdict`.
  - Không có `--findings`: mục của người làm, `verdict:null`.
  - Vòng: một cặp có tối đa 3 mục người kiểm có verdict khác `DAT` kể từ lần `DAT` gần nhất. Mục người kiểm thứ 4 bị từ chối: không ghi, stdout `{"state":"CAN_NGUOI_DUNG","reason":"..."}`, mã 3. Mục có `--return-to`: lần thứ 3 trong một tập bị từ chối như trên.
  - Lỗi lặp: khoá `findingKeys[i]` = sha1(`rule|file|quote`)[:12]; khi một khoá xuất hiện ở lần thứ 2 trong cùng cặp (kể từ `DAT` gần nhất), mục vẫn ghi với `escalate:true`, stdout `state:"CAN_NGUOI_DUNG"`, mã 3.
  - Thành công: `{"state":"OK","seq":n,"round":r,"verdict":"SUA"}`, mã 0.
- `ledger run <slug> --stage lint|ky-thuat`: KHÔNG nhận lệnh tuỳ ý (có `-- <lệnh>` là lỗi tham số, mã 2). Lệnh cố định trong mã theo stage, hằng `LINT_CMD`, `KY_THUAT_CMD`: `lint` = `npm run lint:episode -- <slug> --json` chạy trong `<repo>/video` (repo = cha của `--episodes-dir`); `ky-thuat` = `python -m aivideo.assemble verify <slug>` (đề mục 10, chưa merge). `verdict` `DAT` nếu mã thoát 0, ngược lại `CHAN`; ghi `outputHash` = sha256 của stdout (JSON), `scriptHash` hiện tại. Mã thoát: 0 nếu `DAT`, ngược lại 1. Không có biến môi trường thay lệnh. Sổ ghi thêm `cmd` (mảng, lệnh đã chạy sau khi thay `{slug}`). `gate3` chặn mục `lint`/`ky-thuat` nếu `cmd` khác `expected_command(stage, slug)` (đọc hằng `LINT_CMD`/`KY_THUAT_CMD` lúc gọi). Test thay lệnh bằng `monkeypatch.setattr(gates, "LINT_CMD", [...])` (và `KY_THUAT_CMD`) rồi gọi hàm Python `ledger_run`/`gate3` trong cùng tiến trình; CLI chỉ test cờ. Hàm: `ledger_run(ep, stage)`.
- `ledger show <slug>`: `{"ok":bool,"entries":n,"last":{...},"scriptHash":...,"rounds":{"<pair>":<số mục người kiểm kể từ DAT>}}`.
- `ledger handoff <slug> <khau>`: tạo `episodes/<slug>/handoff/<khau>.md` với năm mục `## Đã chốt`, `## Đã bỏ`, `## Rủi ro`, `## File`, `## Còn lại`; có sẵn thì mã 1.

## Neo git, bằng chứng qc, số âm (BA 6b)
- `gate3` thêm mục `cong2-lai`: tự chạy lại `gate2(write_ledger=False)` trên dữ liệu hiện tại (không tin mục `cong2`); thiếu `claims.json` thì không ok. Mục `hash-kich-ban` vẫn so với mục `cong2` trong sổ.
- `gate2` (và vì vậy `gate3` qua `cong2-lai`) thêm vấn đề `chưa có mục fact` hoặc `claims.json đã đổi sau lần apply-factcheck cuối` khi sổ không có mục `fact`, hoặc `claimsHash` của mục `fact` mới nhất khác sha256 `claims.json` hiện tại. Sửa tay `status` không qua `apply-factcheck` bị chặn.
- Mục `so-git` (repo = `git -C <thư mục tập> rev-parse --show-toplevel`; không phải repo git thì CHẶN): `ledger.json` phải nằm trong kho git, không có thay đổi chưa commit (kể cả chưa được theo dõi), và lịch sử `git log -- ledger.json` chỉ thêm (mỗi bản giữ nguyên mọi mục của bản trước, commit xoá file là chặn). Sếp tổng commit sổ sau mỗi cổng.
- `ledger add --stage qc --findings F`: nếu `F` khác `episodes/<slug>/handoff/qc.json` thì sao chép nguyên văn vào đó. `qc.json` là JSON của qc: `findings` (như cũ) và `evidence`, nên có thể nộp thẳng `--findings handoff/qc.json`.
- Mục `qc-bang-chung`: `handoff/qc.json` có `findings` và `evidence:{"videoSha256":<64 hex>,"frames":[giây...],"loudness":{"lufs":<số>,"truePeak":<số>}}`; `videoSha256` = sha256 của `--video` (không có `--video` thì so `artifactHash` của mục qc); `frames` là mảng số >= 0 có ít nhất `MIN_FRAMES` = 20 mốc khác nhau và ít nhất 1 mốc trong mỗi chương (chương lấy từ `<out-dir>/<slug>/timeline.json`, `--out-dir` mặc định `<episodes-dir>/../out/episodes`; thiếu timeline thì không ok).
- Số âm: `NUMBER_RE` bắt dấu `-` hoặc `−` đứng sát chữ số khi không dính sau chữ/số/`.`/`,` (`-5`, `−3,5`). Giá trị mang dấu: `-5` không khớp claim `5`.

## Đưa claim cho fact-checker mù
- `prepare-factcheck <slug> --role <file vai> [--tmp-parent DIR] [--with-lines]`: tạo thư mục tên ngẫu nhiên trung tính `lo-xxxxxxxx` dưới `--tmp-parent` (mặc định thư mục tạm của hệ điều hành; từ chối nếu nằm trong repo) gồm `items.json` (mảng `{id,claim,question,sourceUrls}`, `sourceUrls` là mảng chuỗi URL; không `status`, không `credibility`) và `prompt.txt` (nội dung file vai + đường dẫn thư mục lô + yêu cầu trả JSON phát hiện, `rule` dạng `claim:<id>`). Dựng prompt từ chối (lỗi) nếu file vai hoặc prompt chứa `script.json`, `kịch bản`, `episodes/`. `--with-lines` (lượt 2 của fact-checker) thêm vào mỗi phần tử trường `lines`: mảng `text` của các beat có `claims` chứa id đó (chỉ chữ của beat, không có `script.json`). Không có file nào khác ngoài hai file này. Stdout: `{"batchDir","items","prompt"}`.
- `prepare-factcheck` ghi mục sổ `fact-prepare` (không còn file meta): `note` = tên thư mục lô, `fileHashes` = `{tên file: sha256}` của mọi file trong thư mục lô lúc prepare (`items.json`, `prompt.txt`), `claimHashes` = `{id: claim_hash}` (`claim_hash` = sha256 của claim bỏ `status`), `claimsHash`. Cần sổ hợp lệ.
- `apply-factcheck <slug> --findings F --batch DIR`: lỗi (không đổi gì, nêu tên file lệch) nếu: một file trong `fileHashes` bị sửa hoặc mất so với lúc prepare (file thêm sau như `findings.json` được phép); sổ đã có mục `fact` cho cùng lô (`note` = tên lô; muốn kiểm lại phải `prepare-factcheck` lô mới); tập `id` trong `items.json` khác tập khoá `claimHashes` của mục `fact-prepare`; sổ không có mục `fact-prepare` cho lô này (so `note` với tên thư mục lô) hoặc claim hiện tại khác `claimHashes` của mục đó; sau khi áp, ghi mục sổ `fact` (`note` = tên lô, `claimsHash` = sha256 `claims.json` sau khi áp, `verdict`); chạy `verdict` với root = lô; `CHUA_DUYET` thì lỗi, không đổi gì. Với mỗi claim trong `items.json`: có phát hiện giữ lại `rule:"claim:<id>"` mức CRITICAL → `SAI`; mức MAJOR → `CHUA_KIEM`; còn lại → `DAT`. Chỉ ghi lại trường `status` của `claims.json`; claim có trong `claims.json` nhưng không thuộc lô đã áp bị đặt `CHUA_KIEM`. Stdout `{"verdict","updated":{"c001":"DAT"},"unmapped":[...]}`.

## `qualify.py` (đo người kiểm, đề mục 11-5)
`python -m aivideo.qualify build [--out DIR]` sinh lại bộ cài lỗi (xác định, cùng đầu ra); `python -m aivideo.qualify prepare --kind fact|qc --which clean|seeded [--role FILE] [--tmp-parent DIR]` chép đầu vào mù ra thư mục tạm ngoài repo (fact: qua `prepare_factcheck`, stdout `{batchDir,items,prompt}`; qc: `{packageDir,files}` chứa `script.json`, `timeline.json`, `video.srt`, `chapters.txt`); `python -m aivideo.qualify score --kind fact|qc --errors F --found F [--clean-found F] [--root DIR] [--threshold 0.9] [--max-false 1]`.
- Bộ cài lỗi nằm ở `qualification/`: `fact/clean.json`, `fact/seeded.json`, `fact/seeded-errors.json`, `qc/clean/`, `qc/seeded/`, `qc/seeded-errors.json`.
- `seeded-errors.json`: `[{"id","severity","file","marker","kind","note"}]`. Một lỗi được tính là bắt khi có phát hiện CRITICAL/MAJOR đã giữ (qua `verdict` với `--root`), `file` cùng tên tệp, và `marker` có trong `quote` hoặc `rule` chứa `:<id>`.
- Mỗi phát hiện chỉ tính bắt tối đa MỘT lỗi cài (ghép lần lượt theo thứ tự lỗi, phát hiện đã dùng không dùng lại). Báo sai = phát hiện CRITICAL/MAJOR không khớp lỗi nào (trên bản cài lỗi) cộng mọi phát hiện CRITICAL/MAJOR trên bản sạch (`--clean-found`).
- Bộ qc là các sản phẩm dạng chữ (kịch bản chốt, timeline, SRT, mục lục) có 5 lỗi CRITICAL và 1 MAJOR; lỗi hình/âm của video thật do sếp tổng thêm ở đề mục 12.
- Stdout: `{"kind","errors":n,"caught":k,"rate":0.9,"missed":[ids],"falseAlarms":m,"passRate":bool,"passFalse":bool,"pass":bool,"row":"| ... |"}`. `pass` cho `fact`: `rate>=threshold` và `falseAlarms<=max-false`; cho `qc`: mọi lỗi CRITICAL được bắt.
