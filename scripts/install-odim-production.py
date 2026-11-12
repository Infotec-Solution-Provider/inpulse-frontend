"""Guarded publication of the reviewed modern frontend build."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import time
import urllib.request

ROOT = Path('/home/inpulse/odim-modern-20261110')
LIVE = ROOT / 'frontend-new'
STAGE = ROOT / 'odim-build-api-urls-20261112'
CANDIDATE = STAGE / 'source/.next'
BACKUP = STAGE / 'before.next'
FAILED = STAGE / 'failed.next'
OLD_BUILD = 'R58l-5voTRZiPXebLKyo8'
NODE_BIN = '/home/inpulse/.nvm/versions/node/v22.14.0/bin'
PM2 = NODE_BIN + '/pm2'
LOCK = '/home/inpulse/.frontend-modern-deploy.lock'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build_id(path):
    return (path / 'BUILD_ID').read_text().strip()


def tree_sha256(path):
    digest = hashlib.sha256()
    for item in sorted(path.rglob('*')):
        assert not item.is_symlink(), 'Candidate symlink not allowed: ' + str(item)
        if item.is_file():
            digest.update(item.relative_to(path).as_posix().encode() + b'\0')
            digest.update(bytes.fromhex(sha(item)))
    return digest.hexdigest()


def validate_browser_assets(path):
    login = False
    socket_url = False
    for item in (path / 'static').rglob('*.js'):
        text = item.read_text(encoding='utf-8')
        assert not re.search(r'localhost:800[0-8]|\.env\.NEXT_PUBLIC_(?:USERS|WHATSAPP|CUSTOMERS|FILES|MARKETING|AI|INSTANCES|REPORTS|REPORTS_API|SOCKET)_URL', text), 'Unresolved service URL: ' + str(item)
        login |= '/api/auth/login' in text and 'https://inpulse.infotecrs.inf.br' in text
        socket_url |= 'https://socket.infotecrs.inf.br' in text
    assert login and socket_url, 'Public login or socket URL missing from candidate'


def restart():
    env = {**os.environ, 'PATH': NODE_BIN + ':' + os.environ.get('PATH', '')}
    subprocess.run([PM2, 'restart', 'odim-modern-frontend'], env=env, check=True)


def healthy():
    for _ in range(30):
        try:
            with urllib.request.urlopen('http://127.0.0.1:3031/nova/odim/login', timeout=3) as response:
                if response.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(1)
    return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--inspect', action='store_true')
    parser.add_argument('--expected-build')
    parser.add_argument('--expected-tree-sha256')
    args = parser.parse_args()
    assert socket.gethostname() == 'srv733293' and os.getuid() == 1003
    if args.inspect:
        assert not args.apply, 'Inspect cannot apply'
        validate_browser_assets(CANDIDATE)
        print(json.dumps({'build': build_id(CANDIDATE), 'treeSha256': tree_sha256(CANDIDATE)}))
        return
    assert args.expected_build and args.expected_tree_sha256
    with open(LOCK, 'a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        assert build_id(LIVE / '.next') == OLD_BUILD, 'Live build drifted'
        assert build_id(CANDIDATE) == args.expected_build and args.expected_build != OLD_BUILD
        validate_browser_assets(CANDIDATE)
        assert tree_sha256(CANDIDATE) == args.expected_tree_sha256, 'Candidate tree hash mismatch'
        assert not BACKUP.exists() and not FAILED.exists()
        for name in ('package.json', 'package-lock.json', 'next.config.ts', 'frontend-routing.config.ts'):
            assert sha(STAGE / 'source' / name) == sha(LIVE / name), 'Config drift: ' + name
        for name in ('routes-manifest.json', 'required-server-files.json', 'build-manifest.json'):
            assert (CANDIDATE / name).is_file(), 'Missing build file: ' + name
        result = {'state': 'PLAN_ONLY', 'previousBuild': OLD_BUILD,
                  'build': args.expected_build, 'treeSha256': args.expected_tree_sha256,
                  'process': 'odim-modern-frontend'}
        if not args.apply:
            print(json.dumps(result))
            return
        # Keep old hashed assets available to clients with tabs on earlier builds.
        for source in (LIVE / '.next/static').rglob('*'):
            if source.is_file():
                destination = CANDIDATE / 'static' / source.relative_to(LIVE / '.next/static')
                if destination.exists():
                    assert sha(source) == sha(destination), 'Static asset collision: ' + str(destination)
                else:
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source, destination)
        assert build_id(LIVE / '.next') == OLD_BUILD, 'Live build drifted during preflight'
        os.rename(LIVE / '.next', BACKUP)
        try:
            os.rename(CANDIDATE, LIVE / '.next')
            restart()
            if not healthy():
                raise RuntimeError('New build health check failed')
            assert build_id(LIVE / '.next') == args.expected_build
            result['state'] = 'PUBLISHED_HEALTHY'
        except Exception:
            if (LIVE / '.next').exists():
                assert build_id(LIVE / '.next') == args.expected_build, 'Cannot rollback a different live build'
                os.rename(LIVE / '.next', FAILED)
            assert build_id(BACKUP) == OLD_BUILD
            os.rename(BACKUP, LIVE / '.next')
            restart()
            if not healthy():
                raise RuntimeError('Rollback restored build but health check failed')
            raise
        (STAGE / 'receipt.json').write_text(json.dumps(result, indent=2) + '\n')
        print(json.dumps(result))


if __name__ == '__main__':
    main()
