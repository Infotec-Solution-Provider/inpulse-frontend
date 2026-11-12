"""Publish the reviewed 60-second Odim frontend build, preserving rollback."""
import argparse, hashlib, json, os, pathlib, shutil, socket, subprocess, tarfile

ROOT = pathlib.Path('/home/inpulse/odim-modern-20261110')
LIVE = ROOT / 'frontend-new'
STAGE = ROOT / 'timeout60-20261111'
PM2 = '/home/inpulse/.nvm/versions/node/v22.14.0/bin/pm2'
NODE = '/home/inpulse/.nvm/versions/node/v22.14.0/bin'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--sha', required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    assert socket.gethostname() == 'srv733293' and os.getuid() == 1003
    artifact = STAGE / 'runtime.tar.gz'
    assert sha(artifact) == args.sha
    candidate = STAGE / 'candidate'
    if not candidate.exists():
        candidate.mkdir(mode=0o700)
        with tarfile.open(artifact) as archive:
            allowed = {'.next', 'public', 'package.json', 'package-lock.json', 'next.config.ts', 'frontend-routing.config.ts'}
            assert all(pathlib.PurePosixPath(m.name).parts[0] in allowed for m in archive.getmembers())
            archive.extractall(candidate, filter='data')
    for name in ['package.json', 'package-lock.json', 'next.config.ts', 'frontend-routing.config.ts']:
        assert sha(candidate / name) == sha(LIVE / name), 'Existing configuration/dependencies differ: ' + name
    previous = (LIVE / '.next/BUILD_ID').read_text().strip()
    current = (candidate / '.next/BUILD_ID').read_text().strip()
    assert previous == 'CUeGy6YAI8BGhBFJjHSag' and current != previous
    # Retain old hashed assets so existing browser tabs can finish lazy imports.
    for source in (LIVE / '.next/static').rglob('*'):
        if source.is_file():
            destination = candidate / '.next/static' / source.relative_to(LIVE / '.next/static')
            if not destination.exists():
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, destination)
    receipt = {'state': 'PLAN_ONLY', 'previousBuild': previous, 'build': current, 'sha256': args.sha,
               'process': 'odim-modern-frontend', 'timeoutMs': 60000}
    if args.apply:
        backup = STAGE / 'before.next'
        assert not backup.exists() and not (STAGE / 'receipt.json').exists()
        os.rename(LIVE / '.next', backup)
        os.rename(candidate / '.next', LIVE / '.next')
        environment = {**os.environ, 'PATH': NODE + ':' + os.environ.get('PATH', '')}
        subprocess.run([PM2, 'restart', 'odim-modern-frontend'], env=environment, check=True)
        receipt['state'] = 'PUBLISHED_REQUIRES_SMOKE'
        (STAGE / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt))

if __name__ == '__main__':
    main()
