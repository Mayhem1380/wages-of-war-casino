#!/usr/bin/env python3
import os
import subprocess
import sys


def main():
    script = os.path.join(os.path.dirname(__file__), 'deploy.sh')
    if not os.path.exists(script):
        print('deploy.sh not found', file=sys.stderr)
        sys.exit(1)
    subprocess.check_call(['bash', script])


if __name__ == '__main__':
    main()
