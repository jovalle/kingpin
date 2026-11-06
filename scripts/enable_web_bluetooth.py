#!/usr/bin/env python3
"""Enable experimental web-platform features in a closed Chromium profile."""
import argparse
import json
import os
from pathlib import Path
import platform
import tempfile

FLAG = 'enable-experimental-web-platform-features'


def _copy_windows_acl(source, destination):
    # Protect the staging file before writing any profile data to it.
    import ctypes
    from ctypes import wintypes
    api = ctypes.WinDLL('advapi32', use_last_error=True)
    get = api.GetFileSecurityW
    get.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD)]
    get.restype = wintypes.BOOL
    set_security = api.SetFileSecurityW
    set_security.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, ctypes.c_void_p]
    set_security.restype = wintypes.BOOL
    control_fn = api.GetSecurityDescriptorControl
    control_fn.argtypes = [ctypes.c_void_p, ctypes.POINTER(wintypes.WORD), ctypes.POINTER(wintypes.DWORD)]
    control_fn.restype = wintypes.BOOL
    needed = wintypes.DWORD()
    get(str(source), 4, None, 0, ctypes.byref(needed))
    if not needed.value:
        raise ctypes.WinError(ctypes.get_last_error())
    descriptor = ctypes.create_string_buffer(needed.value)
    if not get(str(source), 4, descriptor, needed, ctypes.byref(needed)):
        raise ctypes.WinError(ctypes.get_last_error())
    control, revision = wintypes.WORD(), wintypes.DWORD()
    if not control_fn(descriptor, ctypes.byref(control), ctypes.byref(revision)):
        raise ctypes.WinError(ctypes.get_last_error())
    protection = 0x80000000 if control.value & 0x1000 else 0x20000000
    if not set_security(str(destination), 4 | protection, descriptor):
        raise ctypes.WinError(ctypes.get_last_error())


def _replace_windows_file(destination, source):
    # ReplaceFileW preserves the original file's security and other metadata.
    import ctypes
    from ctypes import wintypes
    replace = ctypes.WinDLL('kernel32', use_last_error=True).ReplaceFileW
    replace.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR, wintypes.LPCWSTR, wintypes.DWORD, ctypes.c_void_p, ctypes.c_void_p]
    replace.restype = wintypes.BOOL
    if not replace(str(destination), str(source), None, 0, None, None):
        raise ctypes.WinError(ctypes.get_last_error())


def select_profile(candidates):
    found = [p for p in candidates if (p / 'Local State').is_file()]
    if not found:
        raise ValueError('No browser profile found. Open the browser once, or pass --user-data-dir.')
    if len(found) > 1:
        raise ValueError('Found multiple browser profiles. Specify --user-data-dir explicitly: ' + ', '.join(map(str, found)))
    return found[0]


def _is_windows():
    return os.name == 'nt'


def enable(root, dry_run=False):
    root = Path(root).expanduser()
    path = root / 'Local State'
    if not path.is_file() or path.is_symlink():
        raise ValueError(f'Expected a regular Local State file in {root}.')
    if not dry_run and (os.path.lexists(root / 'SingletonLock') or os.path.lexists(root / 'lockfile')):
        raise ValueError(f'Close all windows using {root} before changing its settings.')
    state = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(state, dict) or not isinstance(state.get('browser', {}), dict):
        raise ValueError('Local State must contain a browser object.')
    browser = state.setdefault('browser', {})
    flags = browser.get('enabled_labs_experiments', [])
    if not isinstance(flags, list) or not all(isinstance(x, str) for x in flags):
        raise ValueError('Browser experimental flags must be a string array.')
    updated = [x for x in flags if x != FLAG and not x.startswith(FLAG + '@')] + [FLAG]
    if updated == flags:
        return False
    if dry_run:
        return True
    browser['enabled_labs_experiments'] = updated
    fd, name = tempfile.mkstemp(prefix='.kingpin-local-state-', dir=root)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as output:
            if _is_windows():
                _copy_windows_acl(path, name)
            else:
                os.fchmod(output.fileno(), path.stat().st_mode & 0o777)
            json.dump(state, output, ensure_ascii=False, separators=(',', ':'))
            output.flush()
            os.fsync(output.fileno())
        if _is_windows():
            _replace_windows_file(path, name)
        else:
            os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)
    return True


def browser_candidates(browser, *, system=None, environ=None, home=None):
    system = system or platform.system()
    environ = os.environ if environ is None else environ
    home = Path.home() if home is None else Path(home)
    if system == 'Linux':
        config = Path(environ.get('CHROME_CONFIG_HOME') or environ.get('XDG_CONFIG_HOME') or home / '.config')
        names = {'helium': ['helium', 'net.imput.helium'], 'chrome': ['google-chrome'],
                 'chromium': ['chromium'], 'edge': ['microsoft-edge'], 'brave': ['BraveSoftware/Brave-Browser']}
    elif system == 'Darwin':
        config = home / 'Library/Application Support'
        names = {'helium': ['net.imput.helium'], 'chrome': ['Google/Chrome'],
                 'chromium': ['Chromium'], 'edge': ['Microsoft Edge'], 'brave': ['BraveSoftware/Brave-Browser']}
    elif system == 'Windows':
        if not environ.get('LOCALAPPDATA'):
            raise ValueError('LOCALAPPDATA is not set; specify --user-data-dir explicitly.')
        config = Path(environ['LOCALAPPDATA'])
        names = {'helium': ['imput/Helium/User Data', 'Helium/User Data'], 'chrome': ['Google/Chrome/User Data'],
                 'chromium': ['Chromium/User Data'], 'edge': ['Microsoft/Edge/User Data'],
                 'brave': ['BraveSoftware/Brave-Browser/User Data']}
    else:
        raise ValueError('Unsupported operating system; specify --user-data-dir explicitly.')
    return [config / name for name in names[browser]]


def main():
    parser = argparse.ArgumentParser(description='Enable experimental web-platform features in a Chromium browser.')
    parser.add_argument('--browser', choices=['helium', 'chrome', 'chromium', 'edge', 'brave'])
    parser.add_argument('--user-data-dir', type=Path, help='Exact Chromium user-data directory containing Local State')
    parser.add_argument('--dry-run', action='store_true', help='Report the change without saving it')
    args = parser.parse_args()
    if not args.browser and not args.user_data_dir:
        parser.error('specify --browser or --user-data-dir')
    try:
        root = args.user_data_dir or select_profile(browser_candidates(args.browser))
        changed = enable(root, args.dry_run)
        print(f'{root}: ' + ('would enable' if args.dry_run and changed else 'enabled' if changed else 'already enabled') + ' experimental web-platform features.')
        if changed and not args.dry_run:
            print('Reopen the browser to apply the setting.')
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        parser.exit(1, f'Could not enable Web Bluetooth: {exc}\n')


if __name__ == '__main__':
    main()
