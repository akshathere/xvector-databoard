import os

def process_and_save_file(file_content: bytes, filepath: str):
    # Perform the heavy disk I/O completely outside the HTTP request lifecycle
    with open(filepath, "wb") as f:
        f.write(file_content)