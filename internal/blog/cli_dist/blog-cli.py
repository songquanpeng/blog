#!/usr/bin/env python3
"""Agent-friendly command line client for this blog installation."""

import argparse
import getpass
import json
import mimetypes
import os
import platform
import socket
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import webbrowser
from pathlib import Path

VERSION = "1.0.0"
DEFAULT_BASE_URL = "__BLOG_BASE_URL__"
PAGE_TYPES = {"article": 0, "code": 1, "bulletin": 2, "discussion": 3, "links": 4,
              "html": 5, "media": 6, "timeline": 7, "redirect": 8, "text": 9}
PAGE_STATUSES = {"recalled": 0, "published": 1, "topped": 2, "hidden": 3}
STATUS_COMMANDS = {"recall": 0, "publish": 1, "top": 2, "hide": 3}


def config_path():
    root = os.environ.get("XDG_CONFIG_HOME")
    if root:
        return Path(root) / "blog-cli" / "config.json"
    return Path.home() / ".config" / "blog-cli" / "config.json"


def load_config():
    try:
        value = json.loads(config_path().read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else {}
    except (OSError, ValueError):
        return {}


def save_config(value):
    target = config_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.chmod(temporary, 0o600)
    temporary.replace(target)


class CLIError(Exception):
    def __init__(self, message, code="request_failed", status=None, hints=None, exit_code=1, payload=None):
        super().__init__(message)
        self.code, self.status, self.hints, self.exit_code, self.payload = code, status, hints or [], exit_code, payload


class AgentArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        raise CLIError(message, "invalid_arguments", hints=[f"{self.prog} --help", "blog-cli help --json"], exit_code=2)


class Client:
    def __init__(self, base_url, token=None):
        self.base_url = base_url.rstrip("/")
        self.token = token

    def request(self, method, path, body=None, auth=True, headers=None, raw=False):
        request_headers = {"Accept": "application/json", "User-Agent": f"blog-cli/{VERSION}"}
        request_headers.update(headers or {})
        data = body
        if body is not None and not isinstance(body, bytes):
            data = json.dumps(body, ensure_ascii=False).encode("utf-8")
            request_headers["Content-Type"] = "application/json"
        if auth:
            if not self.token:
                raise CLIError("尚未登录", "authentication_required", hints=["blog-cli auth login"], exit_code=4)
            request_headers["Authorization"] = "Bearer " + self.token
        request = urllib.request.Request(self.base_url + path, data=data, headers=request_headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                content = response.read()
                if raw:
                    return content, dict(response.headers)
                return json.loads(content.decode("utf-8")) if content else {"status": True}
        except urllib.error.HTTPError as error:
            content = error.read()
            try:
                payload = json.loads(content.decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                payload = {"message": content.decode("utf-8", "replace") or str(error)}
            hints = []
            if payload.get("hint"):
                hints.append(payload["hint"])
            if error.code == 401:
                hints.append("blog-cli auth login")
            raise CLIError(payload.get("message", str(error)), payload.get("error", "http_error"),
                           status=error.code, hints=hints, exit_code=4 if error.code == 401 else 1, payload=payload)
        except urllib.error.URLError as error:
            raise CLIError(f"无法连接 {self.base_url}: {error.reason}", "connection_failed",
                           hints=["检查网络和 --base-url；运行 blog-cli info 验证服务地址"])

    def multipart(self, path, filename, description=""):
        boundary = "----blog-cli-" + uuid.uuid4().hex
        file_path = Path(filename)
        chunks = []
        def field(name, value):
            chunks.extend([f"--{boundary}\r\n".encode(),
                           f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
                           str(value).encode("utf-8"), b"\r\n"])
        field("description", description)
        safe_name = file_path.name.replace('"', "_")
        content_type = mimetypes.guess_type(safe_name)[0] or "application/octet-stream"
        chunks.extend([f"--{boundary}\r\n".encode(),
                       f'Content-Disposition: form-data; name="file"; filename="{safe_name}"\r\n'.encode("utf-8"),
                       f"Content-Type: {content_type}\r\n\r\n".encode(), file_path.read_bytes(), b"\r\n",
                       f"--{boundary}--\r\n".encode()])
        return self.request("POST", path, b"".join(chunks), headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})


def command_manifest():
    return {
        "name": "blog-cli", "version": VERSION,
        "contract": {
            "structured_output": "Use --json anywhere. Output is automatically JSON when stdout is not a TTY.",
            "success": "Exit 0 with {ok:true,data:...,hints:[...]}",
            "errors": "Non-zero exit with {ok:false,error:{code,message,httpStatus?,details?},hints:[...]}",
            "content_input": "Use --content-file FILE, or --content-file - to read stdin.",
            "destructive_actions": "Pass --yes. Without it, non-interactive calls fail safely with a retry hint.",
            "resource_ids": "Page commands accept either an exact page ID or exact permalink; file commands use file ID."
        },
        "recommended_workflow": [
            "blog-cli auth status --json",
            "blog-cli page list --json",
            "blog-cli page create --title TITLE --link SLUG --content-file post.md --status published --json",
            "blog-cli page publish ID_OR_LINK --json"
        ],
        "commands": {
            "info": {"purpose": "Show server/CLI metadata", "example": "blog-cli info --json"},
            "auth login": {"purpose": "Start or resume browser device-flow login", "options": ["--resume", "--wait", "--no-wait", "--no-browser", "--client-name NAME"]},
            "auth status": {"purpose": "Validate current token and show expiry"},
            "auth logout": {"purpose": "Revoke current token and erase it locally"},
            "page list": {"purpose": "List/search all pages", "options": ["--search TEXT", "--type TYPE", "--status STATUS"]},
            "page get ID_OR_LINK": {"purpose": "Get the complete page including content"},
            "page create": {"purpose": "Create a page", "required": ["--title", "--link"], "options": ["--content", "--content-file", "--type", "--status", "--tags", "--description", "--password", "--comments/--no-comments"]},
            "page update ID_OR_LINK": {"purpose": "Patch specified fields while preserving all others", "options": ["same fields as create"]},
            "page publish|recall|hide|top ID_OR_LINK": {"purpose": "Change only publication status"},
            "page delete ID_OR_LINK --yes": {"purpose": "Permanently delete a page"},
            "page export ID_OR_LINK": {"purpose": "Export Markdown", "options": ["--output FILE; omit for stdout"]},
            "settings list": {"purpose": "List every site option"},
            "settings get KEY": {"purpose": "Read one site option"},
            "settings set KEY VALUE": {"purpose": "Set any site option", "options": ["--value-file FILE"]},
            "site show": {"purpose": "Show common blog identity and sidebar settings"},
            "site title [VALUE]": {"purpose": "Get or set blog title (site_name)"},
            "site sidebar get": {"purpose": "Get parsed sidebar navigation (nav_links)"},
            "site sidebar set FILE": {"purpose": "Validate and set sidebar JSON; use - for stdin"},
            "file list": {"purpose": "List/search uploaded files", "options": ["--search TEXT"]},
            "file get ID": {"purpose": "Get uploaded-file metadata"},
            "file upload FILE": {"purpose": "Upload a file", "options": ["--description TEXT"]},
            "file delete ID --yes": {"purpose": "Permanently delete an uploaded file"},
            "server shutdown --yes": {"purpose": "Stop server if BLOG_ENABLE_SHUTDOWN=true"}
        },
        "page_types": PAGE_TYPES, "page_statuses": PAGE_STATUSES,
        "discovery": ["blog-cli help --json", "blog-cli COMMAND --help"]
    }


def extract_globals(argv):
    result, values = [], {"json": False, "no_hints": False, "base_url": None, "token": None}
    index = 0
    while index < len(argv):
        value = argv[index]
        if value == "--json":
            values["json"] = True
        elif value == "--no-hints":
            values["no_hints"] = True
        elif value.startswith("--base-url="):
            values["base_url"] = value.split("=", 1)[1]
        elif value.startswith("--token="):
            values["token"] = value.split("=", 1)[1]
        elif value in ("--base-url", "--token"):
            if index + 1 >= len(argv):
                raise CLIError(f"{value} 缺少参数", "invalid_arguments", exit_code=2)
            values[value[2:].replace("-", "_")] = argv[index + 1]
            index += 1
        else:
            result.append(value)
        index += 1
    return result, values


def add_content_args(parser):
    parser.add_argument("--title")
    parser.add_argument("--link")
    parser.add_argument("--content")
    parser.add_argument("--content-file", metavar="FILE", help="Read content from FILE; use - for stdin")
    parser.add_argument("--type", choices=list(PAGE_TYPES), help="Page type name")
    parser.add_argument("--status", choices=list(PAGE_STATUSES), help="Publication status")
    parser.add_argument("--tags", help="Semicolon- or comma-separated tags")
    parser.add_argument("--description")
    parser.add_argument("--password")
    comments = parser.add_mutually_exclusive_group()
    comments.add_argument("--comments", action="store_true", default=None)
    comments.add_argument("--no-comments", action="store_false", dest="comments")


def make_parser():
    parser = AgentArgumentParser(prog="blog-cli", description="Manage every operation exposed by the blog admin.",
                                 epilog="Agent discovery: blog-cli help --json")
    parser.add_argument("--version", action="version", version=f"blog-cli {VERSION}")
    commands = parser.add_subparsers(dest="command")
    commands.add_parser("help", help="Show the complete machine-readable command catalog")
    commands.add_parser("info", help="Show CLI server metadata")

    auth = commands.add_parser("auth", help="Device-flow authentication").add_subparsers(dest="action")
    login = auth.add_parser("login", help="Log in through the browser device flow")
    login.add_argument("--resume", action="store_true")
    wait = login.add_mutually_exclusive_group()
    wait.add_argument("--wait", action="store_true")
    wait.add_argument("--no-wait", action="store_true")
    login.add_argument("--no-browser", action="store_true")
    login.add_argument("--client-name")
    auth.add_parser("status", help="Validate the saved token")
    auth.add_parser("logout", help="Revoke and erase the saved token")

    page = commands.add_parser("page", aliases=["pages"], help="Manage pages and articles").add_subparsers(dest="action")
    listing = page.add_parser("list", help="List or search all pages")
    listing.add_argument("--search")
    listing.add_argument("--type", choices=list(PAGE_TYPES))
    listing.add_argument("--status", choices=list(PAGE_STATUSES))
    get_page = page.add_parser("get", help="Get a full page")
    get_page.add_argument("target")
    create = page.add_parser("create", help="Create a new page")
    add_content_args(create)
    update = page.add_parser("update", help="Patch an existing page")
    update.add_argument("target")
    add_content_args(update)
    for action in STATUS_COMMANDS:
        operation = page.add_parser(action, help=f"Set page status to {action}")
        operation.add_argument("target")
    delete = page.add_parser("delete", help="Permanently delete a page")
    delete.add_argument("target")
    delete.add_argument("--yes", action="store_true")
    export = page.add_parser("export", help="Export page Markdown")
    export.add_argument("target")
    export.add_argument("--output", "-o")

    settings = commands.add_parser("settings", aliases=["setting"], help="Manage every site option").add_subparsers(dest="action")
    settings.add_parser("list")
    setting_get = settings.add_parser("get")
    setting_get.add_argument("key")
    setting_set = settings.add_parser("set")
    setting_set.add_argument("key")
    setting_set.add_argument("value", nargs="?")
    setting_set.add_argument("--value-file")

    site = commands.add_parser("site", help="Convenience commands for title and sidebar").add_subparsers(dest="action")
    site.add_parser("show")
    title = site.add_parser("title")
    title.add_argument("value", nargs="?")
    sidebar = site.add_parser("sidebar").add_subparsers(dest="site_action")
    sidebar.add_parser("get")
    sidebar_set = sidebar.add_parser("set")
    sidebar_set.add_argument("file", help="JSON file, or - for stdin")

    files = commands.add_parser("file", aliases=["files"], help="Manage uploads").add_subparsers(dest="action")
    file_list = files.add_parser("list")
    file_list.add_argument("--search")
    file_get = files.add_parser("get")
    file_get.add_argument("id")
    upload = files.add_parser("upload")
    upload.add_argument("file")
    upload.add_argument("--description", default="")
    file_delete = files.add_parser("delete")
    file_delete.add_argument("id")
    file_delete.add_argument("--yes", action="store_true")

    server = commands.add_parser("server", help="Server administration").add_subparsers(dest="action")
    shutdown = server.add_parser("shutdown")
    shutdown.add_argument("--yes", action="store_true")
    return parser


def read_value(filename):
    if filename == "-":
        return sys.stdin.read()
    return Path(filename).read_text(encoding="utf-8")


def page_input(args, creating=False):
    result = {}
    for name in ("title", "link", "description", "password"):
        value = getattr(args, name, None)
        if value is not None:
            result[name] = value
    if getattr(args, "content", None) is not None and getattr(args, "content_file", None) is not None:
        raise CLIError("--content 与 --content-file 不能同时使用", "invalid_arguments", exit_code=2)
    if getattr(args, "content_file", None) is not None:
        result["content"] = read_value(args.content_file)
    elif getattr(args, "content", None) is not None:
        result["content"] = args.content
    if getattr(args, "type", None) is not None:
        result["type"] = PAGE_TYPES[args.type]
    if getattr(args, "status", None) is not None:
        result["pageStatus"] = PAGE_STATUSES[args.status]
    if getattr(args, "tags", None) is not None:
        result["tag"] = ";".join(part.strip() for part in args.tags.replace(",", ";").split(";") if part.strip())
    if getattr(args, "comments", None) is not None:
        result["commentStatus"] = 1 if args.comments else 0
    if creating:
        result.setdefault("type", PAGE_TYPES["article"])
        result.setdefault("pageStatus", PAGE_STATUSES["published"])
        result.setdefault("commentStatus", 1)
        result.setdefault("content", "")
        result.setdefault("tag", "")
        if not result.get("title") or not result.get("link"):
            raise CLIError("page create 需要 --title 和 --link", "invalid_arguments",
                           hints=["blog-cli page create --title TITLE --link SLUG --content-file post.md"], exit_code=2)
    return result


def resolve_page(client, target):
    quoted = urllib.parse.quote(target, safe="")
    try:
        return client.request("GET", "/api/page/" + quoted)["page"]
    except CLIError as error:
        if error.status != 404:
            raise
    pages = client.request("GET", "/api/page").get("pages", [])
    matches = [page for page in pages if page.get("link") == target]
    if len(matches) == 1:
        return client.request("GET", "/api/page/" + urllib.parse.quote(matches[0]["id"], safe=""))["page"]
    raise CLIError(f"找不到页面 ID 或固定链接: {target}", "not_found",
                   hints=["blog-cli page list --search " + json.dumps(target, ensure_ascii=False)])


def require_yes(value, command):
    if value:
        return
    if sys.stdin.isatty():
        answer = input("此操作不可撤销。输入 yes 继续: ").strip().lower()
        if answer == "yes":
            return
    raise CLIError("未执行破坏性操作：需要明确确认", "confirmation_required",
                   hints=[command + " --yes"], exit_code=2)


def token_hints(payload=None):
    hints = ["blog-cli page list --json", "blog-cli help --json"]
    if payload and payload.get("token", {}).get("expiresAt"):
        hints.insert(0, "Token 到期时间: " + payload["token"]["expiresAt"])
    return hints


def run_login(client, args, cfg, machine):
    pending = cfg.get("pending") if args.resume else None
    if args.resume and not pending:
        raise CLIError("没有可恢复的登录；请开始新的 device flow", "no_pending_login",
                       hints=["blog-cli auth login"], exit_code=2)
    if pending:
        device = pending
    else:
        name = args.client_name or f"blog-cli on {socket.gethostname()} ({platform.system()})"
        device = client.request("POST", "/api/cli/device/code", {"clientName": name}, auth=False)
        cfg["pending"] = {key: device[key] for key in ("device_code", "user_code", "verification_uri", "verification_uri_complete", "expires_in", "interval")}
        cfg["pending"]["created_at"] = int(time.time())
        save_config(cfg)
        if not args.no_browser and sys.stdout.isatty():
            try:
                webbrowser.open(device["verification_uri_complete"])
            except Exception:
                pass
    wait_forever = args.wait or (sys.stdout.isatty() and not args.no_wait)
    if not wait_forever and not args.resume:
        return {"state": "authorization_pending", "userCode": device["user_code"],
                "verificationUri": device["verification_uri"], "verificationUriComplete": device["verification_uri_complete"],
                "resumeCommand": "blog-cli auth login --resume --json"}, [
                    "请让博客管理员打开 verificationUriComplete 并批准授权",
                    "批准后运行: blog-cli auth login --resume --json"]
    interval = max(2, int(device.get("interval", 5)))
    deadline = int(device.get("created_at", time.time())) + int(device.get("expires_in", 600))
    while True:
        try:
            payload = client.request("POST", "/api/cli/device/token", {
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                "device_code": device["device_code"]}, auth=False)
            cfg["token"] = payload["access_token"]
            cfg.pop("pending", None)
            save_config(cfg)
            payload.pop("access_token", None)
            return payload, token_hints(payload)
        except CLIError as error:
            if error.code != "authorization_pending":
                cfg.pop("pending", None)
                save_config(cfg)
                raise
            if not wait_forever:
                raise CLIError("等待管理员批准", "authorization_pending", status=428,
                               hints=[device["verification_uri_complete"], "批准后运行: blog-cli auth login --resume --json"], exit_code=3)
            if time.time() >= deadline:
                cfg.pop("pending", None)
                save_config(cfg)
                raise CLIError("device code 已过期", "expired_token", hints=["blog-cli auth login"], exit_code=3)
            if sys.stdout.isatty():
                print(f"等待批准：{device['user_code']}  ({device['verification_uri_complete']})", file=sys.stderr, flush=True)
            time.sleep(interval)


def execute(args, client, cfg, machine):
    command = "page" if args.command == "pages" else "settings" if args.command == "setting" else "file" if args.command == "files" else args.command
    if command in (None, "help"):
        return command_manifest(), ["登录: blog-cli auth login", "列出文章: blog-cli page list --json"]
    if command == "info":
        payload = client.request("GET", "/api/cli/info", auth=False)
        return payload, ["blog-cli auth status --json", "blog-cli help --json"]
    if command == "auth":
        if args.action == "login":
            return run_login(client, args, cfg, machine)
        if args.action == "status":
            payload = client.request("GET", "/api/cli/me")
            return payload, token_hints(payload)
        if args.action == "logout":
            try:
                payload = client.request("DELETE", "/api/cli/token")
            finally:
                cfg.pop("token", None)
                cfg.pop("pending", None)
                save_config(cfg)
            return payload, ["重新登录: blog-cli auth login"]
        raise CLIError("缺少 auth 子命令", "invalid_arguments", hints=["blog-cli auth --help"], exit_code=2)
    if command == "page":
        if args.action == "list":
            if args.search:
                payload = client.request("POST", "/api/page/search", {"keyword": args.search, "type": PAGE_TYPES[args.type] if args.type else -1})
            else:
                payload = client.request("GET", "/api/page")
            pages = payload.get("pages", [])
            if args.type:
                pages = [page for page in pages if page.get("type") == PAGE_TYPES[args.type]]
            if args.status:
                pages = [page for page in pages if page.get("pageStatus") == PAGE_STATUSES[args.status]]
            for page in pages:
                page.pop("content", None)
                page.pop("password", None)
            return {"pages": pages, "count": len(pages)}, ["查看全文: blog-cli page get ID_OR_LINK --json", "新建: blog-cli page create --help"]
        if args.action == "get":
            page = resolve_page(client, args.target)
            return {"page": page}, [f"blog-cli page update {page['id']} --help", f"blog-cli page export {page['id']} --output {page['link']}.md"]
        if args.action == "create":
            payload = client.request("POST", "/api/page", page_input(args, creating=True))
            return payload, [f"blog-cli page get {payload['id']} --json", f"blog-cli page recall {payload['id']} --json"]
        if args.action == "update":
            current = resolve_page(client, args.target)
            changes = page_input(args)
            if not changes:
                raise CLIError("没有指定任何要修改的字段", "invalid_arguments", hints=["blog-cli page update --help"], exit_code=2)
            current.update(changes)
            payload = client.request("PUT", "/api/page", current)
            return {"result": payload, "page": current}, [f"blog-cli page get {current['id']} --json"]
        if args.action in STATUS_COMMANDS:
            current = resolve_page(client, args.target)
            current["pageStatus"] = STATUS_COMMANDS[args.action]
            client.request("PUT", "/api/page", current)
            return {"id": current["id"], "link": current["link"], "pageStatus": STATUS_COMMANDS[args.action], "statusName": {v:k for k,v in PAGE_STATUSES.items()}[STATUS_COMMANDS[args.action]]}, [f"blog-cli page get {current['id']} --json"]
        if args.action == "delete":
            page = resolve_page(client, args.target)
            require_yes(args.yes, f"blog-cli page delete {page['id']}")
            payload = client.request("DELETE", "/api/page/" + urllib.parse.quote(page["id"], safe=""))
            return payload, ["blog-cli page list --json"]
        if args.action == "export":
            page = resolve_page(client, args.target)
            content, _ = client.request("GET", "/api/page/export/" + urllib.parse.quote(page["id"], safe=""), raw=True)
            if args.output:
                Path(args.output).write_bytes(content)
                return {"id": page["id"], "output": str(Path(args.output).resolve()), "bytes": len(content)}, [f"Edit the file, then: blog-cli page update {page['id']} --content-file {args.output}"]
            if machine:
                return {"id": page["id"], "link": page["link"], "content": content.decode("utf-8")}, ["Use --output FILE to write the Markdown without a JSON envelope"]
            sys.stdout.buffer.write(content)
            return None, []
        raise CLIError("缺少 page 子命令", "invalid_arguments", hints=["blog-cli page --help", "blog-cli help --json"], exit_code=2)
    if command == "settings":
        if args.action == "list":
            payload = client.request("GET", "/api/option")
            options = {item["key"]: item["value"] for item in payload.get("options", [])}
            return {"options": options}, ["blog-cli settings get site_name --json", "blog-cli settings set KEY VALUE --json"]
        if args.action == "get":
            payload = client.request("GET", "/api/option/" + urllib.parse.quote(args.key, safe=""))
            return payload, [f"blog-cli settings set {args.key} VALUE --json"]
        if args.action == "set":
            if args.value is not None and args.value_file is not None:
                raise CLIError("VALUE 与 --value-file 不能同时使用", "invalid_arguments", exit_code=2)
            value = read_value(args.value_file) if args.value_file is not None else args.value
            if value is None:
                raise CLIError("settings set 需要 VALUE 或 --value-file", "invalid_arguments", exit_code=2)
            payload = client.request("PUT", "/api/option", {args.key: value})
            return {"result": payload, "option": {"key": args.key, "value": value}}, [f"blog-cli settings get {args.key} --json"]
        raise CLIError("缺少 settings 子命令", "invalid_arguments", hints=["blog-cli settings --help"], exit_code=2)
    if command == "site":
        if args.action == "show":
            payload = client.request("GET", "/api/option")
            options = {item["key"]: item["value"] for item in payload.get("options", [])}
            keys = ["site_name", "motto", "description", "author", "domain", "language", "nav_links"]
            return {"site": {key: options.get(key, "") for key in keys}}, ["blog-cli site title NEW_TITLE", "blog-cli site sidebar get --json"]
        if args.action == "title":
            if args.value is None:
                return client.request("GET", "/api/option/site_name"), ["设置标题: blog-cli site title NEW_TITLE"]
            payload = client.request("PUT", "/api/option", {"site_name": args.value})
            return {"result": payload, "title": args.value}, ["blog-cli site show --json"]
        if args.action == "sidebar":
            if args.site_action == "get":
                payload = client.request("GET", "/api/option/nav_links")
                raw = payload.get("option", {}).get("value", "[]")
                try:
                    parsed = json.loads(raw)
                except ValueError:
                    parsed = raw
                return {"sidebar": parsed, "raw": raw}, ["保存后编辑: blog-cli site sidebar get --json", "更新: blog-cli site sidebar set sidebar.json"]
            if args.site_action == "set":
                raw = read_value(args.file)
                try:
                    parsed = json.loads(raw)
                except ValueError as error:
                    raise CLIError(f"侧边栏 JSON 无效: {error}", "invalid_json", exit_code=2)
                if not isinstance(parsed, list):
                    raise CLIError("侧边栏 JSON 顶层必须是数组", "invalid_sidebar", exit_code=2)
                value = json.dumps(parsed, ensure_ascii=False, separators=(",", ":"))
                payload = client.request("PUT", "/api/option", {"nav_links": value})
                return {"result": payload, "sidebar": parsed}, ["blog-cli site sidebar get --json"]
        raise CLIError("缺少 site 子命令", "invalid_arguments", hints=["blog-cli site --help"], exit_code=2)
    if command == "file":
        if args.action == "list":
            payload = client.request("POST", "/api/file/search", {"keyword": args.search}) if args.search else client.request("GET", "/api/file")
            files = payload.get("files", [])
            return {"files": files, "count": len(files)}, ["blog-cli file upload FILE --description TEXT", "blog-cli file get ID --json"]
        if args.action == "get":
            payload = client.request("GET", "/api/file/" + urllib.parse.quote(args.id, safe=""))
            return payload, [f"blog-cli file delete {args.id} --yes --json"]
        if args.action == "upload":
            path = Path(args.file)
            if not path.is_file():
                raise CLIError(f"文件不存在: {args.file}", "file_not_found", exit_code=2)
            payload = client.multipart("/api/file", args.file, args.description)
            return payload, ["在文章中使用返回的 file.path", "blog-cli file list --json"]
        if args.action == "delete":
            require_yes(args.yes, f"blog-cli file delete {args.id}")
            payload = client.request("DELETE", "/api/file/" + urllib.parse.quote(args.id, safe=""))
            return payload, ["blog-cli file list --json"]
        raise CLIError("缺少 file 子命令", "invalid_arguments", hints=["blog-cli file --help"], exit_code=2)
    if command == "server":
        if args.action == "shutdown":
            require_yes(args.yes, "blog-cli server shutdown")
            return client.request("POST", "/api/option/shutdown", {}), ["服务正在关闭；稍后从部署平台重新启动"]
        raise CLIError("缺少 server 子命令", "invalid_arguments", hints=["blog-cli server --help"], exit_code=2)
    raise CLIError(f"未知命令: {command}", "invalid_arguments", hints=["blog-cli help --json"], exit_code=2)


def render(data, hints, machine, no_hints=False):
    if data is None:
        return
    envelope = {"ok": True, "data": data}
    if hints and not no_hints:
        envelope["hints"] = hints
    if machine:
        print(json.dumps(envelope, ensure_ascii=False, separators=(",", ":")))
        return
    print(json.dumps(data, ensure_ascii=False, indent=2))
    if hints and not no_hints:
        print("\nNext steps:")
        for hint in hints:
            print("  - " + hint)


def render_error(error, machine, no_hints=False):
    details = {"code": error.code, "message": str(error)}
    if error.status is not None:
        details["httpStatus"] = error.status
    if error.payload:
        details["details"] = error.payload
    envelope = {"ok": False, "error": details}
    if error.hints and not no_hints:
        envelope["hints"] = error.hints
    stream = sys.stderr
    if machine:
        print(json.dumps(envelope, ensure_ascii=False, separators=(",", ":")), file=stream)
    else:
        print(f"Error [{error.code}]: {error}", file=stream)
        if error.hints and not no_hints:
            print("Next steps:", file=stream)
            for hint in error.hints:
                print("  - " + hint, file=stream)


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    try:
        argv, global_options = extract_globals(argv)
        machine = global_options["json"] or not sys.stdout.isatty()
        if global_options["json"] and "--help" in argv:
            argv = ["help"]
        parser = make_parser()
        args = parser.parse_args(argv)
        cfg = load_config()
        base_url = global_options["base_url"] or os.environ.get("BLOG_CLI_BASE_URL") or cfg.get("base_url") or DEFAULT_BASE_URL
        token = global_options["token"] or os.environ.get("BLOG_CLI_TOKEN") or cfg.get("token")
        if global_options["base_url"]:
            cfg["base_url"] = base_url.rstrip("/")
            save_config(cfg)
        data, hints = execute(args, Client(base_url, token), cfg, machine)
        render(data, hints, machine, global_options["no_hints"])
        return 0
    except CLIError as error:
        machine = locals().get("machine", True)
        render_error(error, machine, locals().get("global_options", {}).get("no_hints", False))
        return error.exit_code
    except (OSError, ValueError) as error:
        wrapped = CLIError(str(error), "local_error")
        render_error(wrapped, locals().get("machine", True))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
