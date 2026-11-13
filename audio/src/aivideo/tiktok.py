"""Đăng các phần TikTok của một tập bằng TikTok Studio qua Playwright và cookie (đề mục 17).

Phần điều khiển trình duyệt chuyển thể từ `live-battle/tu-dang/tiktok_dang.py` (dự án khác của
người dùng). Chỉ nạp cookie của tiktok.com, không in giá trị cookie ra đâu cả. Dùng Chrome của
máy (`channel="chrome"`), không tải trình duyệt riêng.

    python -m aivideo.tiktok post <slug> [--parts 1-3] [--visibility everyone|only_you] [--dry-run]
    python -m aivideo.tiktok profile --name "<tên>" --avatar <png> [--dry-run]
    python -m aivideo.tiktok check
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import stat
import sys
import tempfile
import warnings
from contextlib import contextmanager
from http.cookiejar import LoadError, MozillaCookieJar
from pathlib import Path

from aivideo.gates import GateError, Ledger, _ep_dir, _read_json, _script_hash_of, sha256_file

ROOT = Path(__file__).resolve().parents[3]
COOKIE_PATH = Path.home() / ".config" / "aivideo" / "tiktok" / "cookies.txt"
UPLOAD_URL = "https://www.tiktok.com/tiktokstudio/upload?from=webapp"
PROFILE_URL = "https://www.tiktok.com/profile"
STAGE_PREFIX = "tiktok-"
LOGIN_COOKIES = {"sessionid", "sessionid_ss"}
VIS_LABEL = {"everyone": ["Mọi người", "Everyone"],
             "only_you": ["Chỉ mình bạn", "Chỉ mình tôi", "Only you", "Only me"]}
_USER_RE = re.compile(r"tiktok\.com/@([A-Za-z0-9._]+)")


class TikTokError(Exception):
    pass


# ---------- cookie ----------

def check_cookie_file(path: Path) -> None:
    path = Path(path)
    if not path.is_file():
        raise TikTokError(f"thiếu {path}: xuất cookies.txt (Netscape) của tiktok.com khi đang đăng "
                          f"nhập, đặt vào đây rồi chạy `chmod 600 {path}`")
    mode = stat.S_IMODE(path.stat().st_mode)
    if mode != 0o600:
        raise TikTokError(f"{path} có quyền {mode:o}, phải là 600: chạy `chmod 600 {path}`")


def _is_tiktok(domain: str) -> bool:
    d = domain.lstrip(".").lower()
    return d == "tiktok.com" or d.endswith(".tiktok.com")


def load_cookies(path=None) -> list[dict]:
    """Cookie tiktok.com dạng Playwright. Lỗi không kèm nội dung file."""
    path = Path(path or COOKIE_PATH)
    check_cookie_file(path)
    jar = MozillaCookieJar()
    try:
        with warnings.catch_warnings():  # cookiejar cảnh báo kèm traceback khi dòng hỏng
            warnings.simplefilter("ignore")
            jar.load(str(path), ignore_discard=True, ignore_expires=True)
    except (LoadError, OSError, ValueError):
        raise TikTokError(f"{path} không đọc được dạng Netscape cookies.txt: xuất lại") from None
    out = []
    for c in jar:
        if not _is_tiktok(c.domain):
            continue
        item = {"name": c.name, "value": c.value, "domain": c.domain, "path": c.path or "/",
                "secure": bool(c.secure)}
        if c.expires:
            item["expires"] = int(c.expires)
        out.append(item)
    if not {c["name"] for c in out} & LOGIN_COOKIES:
        raise TikTokError(f"{path} thiếu cookie đăng nhập (sessionid): xuất lại khi đang đăng nhập")
    return out


def _scrub(msg: str, cookies: list[dict]) -> str:
    for c in cookies:
        if len(c["value"]) >= 4:
            msg = msg.replace(c["value"], "***")
    return msg


# ---------- trình duyệt ----------

@contextmanager
def _open_browser(cookies: list[dict], headless: bool = False):
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=headless)
        try:
            ctx = browser.new_context(locale="vi-VN", viewport={"width": 1400, "height": 1000})
            try:
                ctx.add_cookies(cookies)
            except Exception:
                raise TikTokError("Chrome không nhận cookie: xuất lại cookies.txt") from None
            yield ctx.new_page()
        finally:
            browser.close()


def _username(page) -> str | None:
    page.goto(PROFILE_URL, wait_until="domcontentloaded")
    page.wait_for_timeout(5000)
    m = _USER_RE.search(page.url)
    return m.group(1) if m and "login" not in page.url else None


def _dismiss(page):
    """Đóng hộp thoại / màn hướng dẫn đang che (bấm nút như người dùng, không xoá phần tử)."""
    tour = page.locator("#react-joyride-portal, [id^=react-joyride-step], .__floater").first
    if tour.count():
        for sel in ("[data-action=skip]", "[data-test-id=button-skip]", "[data-action=close]",
                    "[aria-label=Close]", "[data-test-id=button-primary]", "[data-action=primary]"):
            b = page.locator(sel).first
            try:
                if b.count() and b.is_visible():
                    b.click(timeout=2000)
                    page.wait_for_timeout(400)
                    break
            except Exception:
                pass
    modal = page.locator(".TUXModal, [role=dialog]").filter(
        has_text=re.compile("kiểm tra nội dung|content check", re.I)).first
    labels = ("Hủy", "Cancel") if (modal.count() and modal.is_visible()) else ()
    for label in labels + ("Đã hiểu", "Got it"):
        scope = modal if label in ("Hủy", "Cancel") else page.locator(
            ".TUXModal, [role=dialog], .TUXPopover")
        btn = scope.locator("button").filter(has_text=re.compile(rf"^\s*{label}\s*$")).first
        try:
            if btn.count() and btn.is_visible():
                btn.click(timeout=2000)
                page.wait_for_timeout(400)
        except Exception:
            pass


def _wait_uploaded(page, timeout_s=240) -> bool:
    post = page.locator("[data-e2e=post_video_button]")
    box = page.locator("[data-e2e=upload_status_container]")
    for _ in range(timeout_s // 2):
        _dismiss(page)
        status = box.inner_text(timeout=2000) if box.count() else ""
        ready = (post.count() and post.get_attribute("data-disabled") in (None, "false")
                 and post.is_enabled())
        if ready and re.search(r"Đã tải lên|Uploaded|100\s*%", status or "", re.I):
            return True
        page.wait_for_timeout(2000)
    return False


def _set_caption(page, text: str):
    _dismiss(page)
    box = page.locator("[data-e2e=caption_container] .public-DraftEditor-content").first
    box.click()
    page.wait_for_timeout(300)
    current = box.inner_text().strip()
    page.keyboard.press("End")
    for _ in range(len(current) + 3):  # xoá tên file mặc định từng ký tự
        page.keyboard.press("Backspace")
    page.wait_for_timeout(200)
    for i, line in enumerate(text.split("\n")):
        if i:
            page.keyboard.press("Shift+Enter")
        page.keyboard.insert_text(line)
        page.wait_for_timeout(300)
    page.wait_for_timeout(800)
    page.keyboard.press("Escape")  # đóng gợi ý hashtag
    page.wait_for_timeout(300)


def _set_visibility(page, visibility: str):
    # luôn chọn rõ ràng: TikTok nhớ lựa chọn của lần đăng trước
    trigger = page.locator("[data-e2e=video_visibility_container] [role=combobox]").first
    if any(trigger.inner_text().strip().startswith(l) for l in VIS_LABEL[visibility]):
        return
    trigger.click()
    page.wait_for_timeout(600)
    for label in VIS_LABEL[visibility]:
        opt = page.get_by_text(label, exact=True).last
        if opt.count() and opt.is_visible():
            opt.click()
            page.wait_for_timeout(500)
            break
    now = trigger.inner_text().strip()
    if not any(now.startswith(l) for l in VIS_LABEL[visibility]):
        raise TikTokError(f"không chọn được quyền xem (đang là {now!r})")


def _click_post(page) -> bool:
    page.locator("[data-e2e=post_video_button]").click()
    page.wait_for_timeout(2500)
    for label in ("Đăng ngay", "Tiếp tục đăng", "Đăng", "Post now", "Continue"):
        btn = page.locator(".TUXModal button, [role=dialog] button").filter(
            has_text=re.compile(rf"^\s*{label}\s*$")).first
        if btn.count() and btn.is_visible():
            btn.click()
            page.wait_for_timeout(2000)
            break
    for _ in range(45):
        if "/tiktokstudio/content" in page.url or page.locator(
                "text=/đã được đăng|Video của bạn đang được (tải|xử lý)|"
                "Your video (has been|is being)/i").count():
            return True
        page.wait_for_timeout(2000)
    return False


def _upload(page, video: Path, caption: str, visibility: str, shots: Path) -> None:
    """Đăng một video trên trang đã đăng nhập. Lỗi thì ném TikTokError."""
    page.goto(UPLOAD_URL, wait_until="domcontentloaded")
    page.wait_for_timeout(5000)
    if "login" in page.url:
        raise TikTokError("cookie hết hạn: xuất lại cookies.txt")
    page.set_input_files("input[type=file]", str(video))
    page.wait_for_timeout(3000)
    page.screenshot(path=str(shots / f"{video.stem}-1-chon-file.png"))
    if not _wait_uploaded(page):
        raise TikTokError("tải video lên quá lâu hoặc TikTok báo lỗi")
    _dismiss(page)
    _set_caption(page, caption)
    _dismiss(page)
    _set_visibility(page, visibility)
    page.screenshot(path=str(shots / f"{video.stem}-2-truoc-khi-dang.png"), full_page=True)
    ok = _click_post(page)
    page.screenshot(path=str(shots / f"{video.stem}-3-sau-khi-dang.png"))
    if not ok:
        raise TikTokError("bấm Đăng nhưng không thấy xác nhận")


def _set_profile(page, name: str, avatar: Path, shots: Path) -> str:
    user = _username(page)
    if not user:
        raise TikTokError("cookie hết hạn: xuất lại cookies.txt")
    _dismiss(page)
    page.locator("[data-e2e=edit-profile-entrance]").first.click()
    page.wait_for_timeout(2000)
    page.screenshot(path=str(shots / "ho-so-1-mo-sua.png"))
    page.locator("[role=dialog] input[type=file], [data-e2e=edit-profile-popup] input[type=file]"
                 ).first.set_input_files(str(avatar))
    page.wait_for_timeout(2000)
    for label in ("Áp dụng", "Apply"):
        btn = page.get_by_role("button", name=re.compile(rf"^\s*{label}\s*$")).first
        if btn.count() and btn.is_visible():
            btn.click()
            page.wait_for_timeout(2000)
            break
    box = page.locator("input[data-e2e=edit-profile-name-input], "
                       "[data-e2e=edit-profile-name-input] input").first
    box.fill(name)
    page.screenshot(path=str(shots / "ho-so-2-truoc-khi-luu.png"))
    page.locator("[data-e2e=edit-profile-save]").first.click()
    page.wait_for_timeout(4000)
    page.reload(wait_until="domcontentloaded")
    page.wait_for_timeout(4000)
    page.screenshot(path=str(shots / "ho-so-3-sau-khi-luu.png"))
    now = page.locator("[data-e2e=user-subtitle]").first.inner_text().strip()
    if now != name:
        raise TikTokError(f"lưu xong nhưng tên hiển thị là {now!r}, không phải {name!r} "
                          "(TikTok chỉ cho đổi tên 7 ngày một lần)")
    return user


@contextmanager
def _shots(prefix: str):
    """Thư mục ảnh chụp dưới /tmp: xoá khi thành công, giữ lại khi lỗi để xem."""
    d = Path(tempfile.mkdtemp(prefix=f"aivideo-tiktok-{prefix}-", dir="/tmp"))
    try:
        yield d
    except Exception as e:
        raise TikTokError(f"{_line(e)} (ảnh chụp: {d})") from None
    shutil.rmtree(d, ignore_errors=True)


def _line(err: Exception) -> str:
    if isinstance(err, TikTokError):
        return str(err)
    return (str(err).splitlines() or [type(err).__name__])[0][:200]


# ---------- đăng tập ----------

def parse_parts(s: str) -> tuple[int, int]:
    try:
        a, _, b = s.partition("-")
        lo, hi = int(a), int(b or a)
    except ValueError:
        raise TikTokError(f"--parts phải dạng a-b, nhận {s!r}") from None
    if lo < 1 or hi < lo:
        raise TikTokError(f"--parts không hợp lệ: {s}")
    return lo, hi


def load_manifest(d: Path, slug: str) -> list[dict]:
    """Đọc `manifest.json` do `aivideo.shorts export` ghi; trả các phần theo thứ tự `part`."""
    p = d / "manifest.json"
    if not p.is_file():
        raise TikTokError(f"thiếu {p}: chạy `python -m aivideo.shorts export {slug}` trước")
    try:
        doc = _read_json(p)
    except (OSError, ValueError) as e:
        raise TikTokError(f"{p} hỏng: {e}") from None
    if not isinstance(doc, dict) or doc.get("slug") != slug or not isinstance(doc.get("parts"), list):
        raise TikTokError(f"{p} sai dạng hoặc không phải của {slug}")
    parts, seen = [], set()
    for e in doc["parts"]:
        ok = (isinstance(e, dict) and type(e.get("part")) is int and e["part"] >= 1
              and all(isinstance(e.get(k), str) and e[k] and Path(e[k]).name == e[k]
                      for k in ("mp4", "caption")))
        if not ok or e["part"] in seen:
            raise TikTokError(f"{p}: mục phần sai dạng hoặc trùng: {e!r}")
        seen.add(e["part"])
        for k in ("mp4", "caption"):
            if not (d / e[k]).is_file():
                raise TikTokError(f"thiếu {d / e[k]}")
        parts.append({"part": e["part"], "mp4": d / e["mp4"], "caption": d / e["caption"]})
    if not parts:
        raise TikTokError(f"{p} không có phần nào")
    return sorted(parts, key=lambda e: e["part"])


def _posted(entries: list[dict], part: int, visibility: str) -> bool:
    return any(e["stage"] == f"{STAGE_PREFIX}{part}" and e.get("note") == f"visibility={visibility}"
               for e in entries)


def post(slug: str, *, root=ROOT, parts: str | None = None, visibility: str = "everyone",
         dry_run: bool = False, cookie_path=None) -> list[dict]:
    if visibility not in VIS_LABEL:
        raise TikTokError(f"--visibility phải thuộc {tuple(VIS_LABEL)}")
    root = Path(root)
    ep = _ep_dir(slug, root / "episodes")
    if not ep.is_dir():
        raise TikTokError(f"thiếu {ep}")
    items = load_manifest(root / "out" / "episodes" / slug / "tiktok", slug)
    if parts:
        lo, hi = parse_parts(parts)
        have = {e["part"] for e in items}
        missing = [k for k in range(lo, hi + 1) if k not in have]
        if missing:
            raise TikTokError(f"manifest không có phần {missing}")
        items = [e for e in items if lo <= e["part"] <= hi]
    entries = Ledger(ep).entries()  # sổ hỏng thì dừng trước khi đăng
    plan = [{**e, "skip": _posted(entries, e["part"], visibility)} for e in items]
    if dry_run:
        return [{"part": e["part"], "mp4": str(e["mp4"]), "visibility": visibility,
                 "state": "skipped" if e["skip"] else "planned",
                 "caption": e["caption"].read_text(encoding="utf-8").split("\n", 1)[0]}
                for e in plan]
    out = [{"part": e["part"], "state": "skipped"} for e in plan if e["skip"]]
    todo = [e for e in plan if not e["skip"]]
    if not todo:
        return out
    cookies = load_cookies(cookie_path)
    script_hash = _script_hash_of(ep)
    try:
        with _shots(slug) as shots, _open_browser(cookies) as page:
            for e in todo:
                k = e["part"]
                try:
                    _upload(page, e["mp4"], e["caption"].read_text(encoding="utf-8").rstrip("\n"),
                            visibility, shots)
                except Exception as err:
                    raise TikTokError(f"phần {k}: {_line(err)}") from None
                try:
                    Ledger(ep).add(stage=f"{STAGE_PREFIX}{k}", role="publisher",
                                   note=f"visibility={visibility}", script_hash=script_hash,
                                   artifact_hash=sha256_file(e["mp4"]))
                except (GateError, OSError, ValueError) as err:
                    raise TikTokError(f"phần {k} đã đăng lên TikTok nhưng ghi sổ lỗi: {err}. "
                                      f"Đừng chạy lại phần này; ghi sổ tay rồi tiếp từ phần "
                                      f"{k + 1}") from None
                out.append({"part": k, "state": "posted"})
    except TikTokError as err:
        raise TikTokError(_scrub(str(err), cookies)) from None
    return sorted(out, key=lambda r: r["part"])


# ---------- hồ sơ, kiểm cookie ----------

def profile(name: str, avatar, *, dry_run: bool = False, cookie_path=None) -> dict:
    avatar = Path(avatar)
    if not name.strip():
        raise TikTokError("--name rỗng")
    if not avatar.is_file() or avatar.suffix.lower() != ".png":
        raise TikTokError(f"ảnh đại diện không phải file PNG: {avatar}")
    if dry_run:
        return {"steps": [f"mở {PROFILE_URL} bằng cookie {cookie_path or COOKIE_PATH}",
                          "bấm Sửa hồ sơ", f"tải ảnh đại diện {avatar}", "bấm Áp dụng",
                          f"đặt tên hiển thị {name!r}", "bấm Lưu",
                          "tải lại trang, kiểm tên hiển thị"]}
    cookies = load_cookies(cookie_path)
    try:
        with _shots("ho-so") as shots, _open_browser(cookies) as page:
            user = _set_profile(page, name, avatar, shots)
    except TikTokError as err:
        raise TikTokError(_scrub(str(err), cookies)) from None
    return {"username": user, "name": name, "avatar": str(avatar)}


def check(*, cookie_path=None) -> str | None:
    """Tên người dùng đang đăng nhập, hoặc None khi cookie hết hạn."""
    cookies = load_cookies(cookie_path)
    try:
        with _open_browser(cookies) as page:
            return _username(page)
    except Exception as err:
        raise TikTokError(_scrub(_line(err), cookies)) from None


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="aivideo.tiktok")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("post")
    p.add_argument("slug")
    p.add_argument("--parts")
    p.add_argument("--visibility", choices=tuple(VIS_LABEL), default="everyone")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--root", default=str(ROOT))
    f = sub.add_parser("profile")
    f.add_argument("--name", required=True)
    f.add_argument("--avatar", required=True)
    f.add_argument("--dry-run", action="store_true")
    sub.add_parser("check")
    a = ap.parse_args(argv)
    try:
        if a.cmd == "post":
            r = post(a.slug, root=a.root, parts=a.parts, visibility=a.visibility,
                     dry_run=a.dry_run)
        elif a.cmd == "profile":
            r = profile(a.name, a.avatar, dry_run=a.dry_run)
        else:
            user = check()
            print(f"đăng nhập: @{user}" if user else "cookie hết hạn")
            return 0 if user else 1
    except (TikTokError, GateError) as e:
        print(f"lỗi: {e}", file=sys.stderr)
        return 1
    print(json.dumps(r, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
