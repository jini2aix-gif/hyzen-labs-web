import json
import os
import sys
from pathlib import Path

# Add site-packages to path just in case, though it should be there
site_packages = r"C:\Users\jini2\AppData\Local\Programs\Python\Python312\Lib\site-packages"
if site_packages not in sys.path:
    sys.path.append(site_packages)

try:
    from notebooklm_mcp.api_client import NotebookLMClient as NotebookLM
except ImportError as e:
    print(f"Error: Could not import notebooklm_mcp.api_client: {e}")
    sys.exit(1)

def get_auth_data():
    auth_path = Path(os.path.expanduser("~/.notebooklm-mcp/auth.json"))
    if not auth_path.exists():
        print(f"Error: Auth file not found at {auth_path}")
        return None
    
    try:
        with open(auth_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading auth file: {e}")
        return None

def main():
    print("Initializing NotebookLM Cleanup...")
    auth_data = get_auth_data()
    if not auth_data:
        print("Please run 'notebooklm-mcp-auth' first.")
        return

    # Extract cookies and tokens
    cookies = auth_data.get('cookies')
    csrf_token = auth_data.get('csrf_token', '')
    session_id = auth_data.get('session_id', '')
    
    if not cookies:
        print("Error: No cookies found in auth data.")
        return

    try:
        print("Initializing NotebookLMClient...")
        client = NotebookLM(
            cookies=cookies,
            csrf_token=csrf_token,
            session_id=session_id
        )
        print("Client initialized. Fetching notebooks...")
        
        notebooks = client.list_notebooks()
        
        if not notebooks:
            print("No notebooks found.")
            return

        print(f"Found {len(notebooks)} notebooks. Deleting...")
        
        for nb in notebooks:
            # nb is an object, not a dict
            nb_id = getattr(nb, 'id', None) or getattr(nb, 'notebookId', None)
            title = getattr(nb, 'title', 'Untitled')
            
            if nb_id:
                print(f"Deleting '{title}' ({nb_id})...")
                try:
                    client.delete_notebook(nb_id)
                    print("  Deleted.")
                except Exception as e:
                    print(f"  Failed to delete: {e}")
            else:
                print(f"  Skipping (No ID found for '{title}')")

        print("Cleanup complete.")

    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
