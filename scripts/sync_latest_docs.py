'''
This script syncs all files from the WAVS foundry template
and pulls them into the current repo. This avoid duplicate documentation.
Source of truth remains upstream in the template.

This repo serves only as the styling and frontend. all copy remains elsewhere
'''
import os
import shutil
import subprocess

current_dir = os.path.dirname(os.path.realpath(__file__))
parent_dir = os.path.dirname(current_dir)

URL = "https://github.com/Lay3rLabs/wavs-foundry-template.git"

if len(os.sys.argv) > 1:
    COMMIT = os.sys.argv[1]
else:
    COMMIT = None

def main():
    commit = download_repo(URL, commit=COMMIT)
    print(f"Downloaded wavsfoundry at commit {commit}")

    DEST = os.path.join(parent_dir, 'content', 'docs')
    SRC = os.path.join(parent_dir, 'dsource-wavs-foundry-template', 'docs')
    copy_files(SRC, DEST)

    # save commit to a file for caching in the parent dir
    with open(os.path.join(parent_dir, 'last_commit_sync.txt'), 'w') as f:
        f.write(commit)


def copy_files(source_dir, destination_dir):
    # Create the destination directory if it doesn't exist
    if not os.path.exists(destination_dir):
        os.makedirs(destination_dir)

    # Get all items in the source directory
    items = os.listdir(source_dir)

    # Copy each file
    for item in items:
        source_path = os.path.join(source_dir, item)
        destination_path = os.path.join(destination_dir, item)

        # Check if it's a file
        if os.path.isfile(source_path):
            returnPath = shutil.copy2(source_path, destination_path)

            file_content = open(returnPath, 'r').read()
            new_content = check_if_commented_import_line(file_content)

            with open(returnPath, 'w') as f:
                print(f"Writing to {returnPath}")
                f.write(new_content)

            print(f"Copied: {item}")
        # If it's a directory, you might want to copy it recursively
        elif os.path.isdir(source_path):
            returnPath = shutil.copytree(source_path, destination_path, dirs_exist_ok=True)

            # iterate over all files and check if commented import line
            for root, dirs, files in os.walk(returnPath):
                for file in files:
                    file_path = os.path.join(root, file)
                    file_content = open(file_path, 'r').read()
                    new_content = check_if_commented_import_line(file_content)

                    with open(file_path, 'w') as f:
                        print(f"Writing to {file_path}")
                        f.write(new_content)

            print(f"Copied directory: {item}")


# Iterates through the mdx files and checks if the line is a commented import statement. i.e. `import { Callout } from 'fumadocs-ui/components/callout';`
# if so, it will uncomment it in the file
# <!--import { Callout } from 'fumadocs-ui/components/callout';--> becomes import { Callout } from 'fumadocs-ui/components/callout';
def check_if_commented_import_line(fileContent) -> str:
    lines = fileContent.split('\n')
    for i, line in enumerate(lines):
        # does not account for multi line imports, out of scope for now.
        if '<!--' in line and 'import' in line:
            lines[i] = line.replace('<!--', '').replace('-->', '')

        # if line contains <!--docsignore or docsignore--> , remove the line
        if '<!--docsignore' in line or 'docsignore-->' in line:
            lines[i] = ''

    return '\n'.join(lines)


def __checkout_commit(repo_path, commit=None):
    """
    A 'private' helper function that fetches the latest commit or a specific commit
    depending on the input argument context.
    """
    if commit:
        print(f"Checking out {repo_path} commit {commit}")
        subprocess.run(["git", "-C", repo_path, "fetch", "--depth", "1", "origin", commit], check=True)
        subprocess.run(["git", "-C", repo_path, "reset", "--hard", commit], check=True)
    else:
        print(f"No commit specified for {repo_path}, pulling latest")
        subprocess.run(["git", "-C", repo_path, "fetch", "--depth", "1", "origin"], check=True)

        # Get current branch name (usually main, but just in case)
        result = subprocess.run(
            ["git", "-C", repo_path, "rev-parse", "--abbrev-ref", "HEAD"],
            check=True,
            capture_output=True,
            text=True
        )
        branch = result.stdout.strip()

        subprocess.run(["git", "-C", repo_path, "reset", "--hard", f"origin/{branch}"], check=True)

# returns the string commit hash
def download_repo(repo_path, commit=None) -> str:
    """
    Downloads a repo from git. It then checkouts the commit or latest,
    depending on if the input arguments provided.

    Example usage:
    download_repo("https://github.com/abc/xyz.git", "00f7bda2ef730307370475d77d68685b9cb4dd01")
    """
    print(f"Downloading {repo_path}")

    loc = f"dsource-{get_name_from_github(repo_path)}"

    if not os.path.isdir(loc):
        # No need to `git pull` since the checkout commit will get us where we need to be
        # else `You have divergent branches` occurs
        subprocess.run(["git", "clone", "--depth", "1", repo_path, loc], check=True)

    __checkout_commit(loc, commit)

    return subprocess.run(["git", "-C", loc, "rev-parse", "HEAD"], check=True, capture_output=True, text=True).stdout.strip()

def get_name_from_github(path: str) -> str:
    """
    Extracts the name of the repo from a github URL.
    """
    return path.split("/")[-1].replace(".git", "")

if __name__ == '__main__':
    main()
