import requests
import json
import os
from datetime import datetime

def check_ai_health():
    url = "https://ai.hackclub.com/chat/completions"
    headers = {
        "Content-Type": "application/json"
    }
    
    # Create a cookies directory if it doesn't exist
    cookies_dir = "cookies"
    if not os.path.exists(cookies_dir):
        os.makedirs(cookies_dir)
    
    # Load existing cookies if they exist
    cookies_file = os.path.join(cookies_dir, "ai_cookies.json")
    cookies = {}
    if os.path.exists(cookies_file):
        with open(cookies_file, 'r') as f:
            cookies = json.load(f)
    
    data = {
        "messages": [{"role": "user", "content": "Tell me a joke!"}]
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, cookies=cookies)
        
        # Save the cookies from the response
        if response.cookies:
            with open(cookies_file, 'w') as f:
                json.dump(dict(response.cookies), f)
        
        # Log the response
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_file = os.path.join(cookies_dir, "ai_health.log")
        
        with open(log_file, 'a') as f:
            f.write(f"\n[{timestamp}] Status Code: {response.status_code}\n")
            f.write(f"Response: {response.text}\n")
            f.write("-" * 50 + "\n")
        
        if response.status_code == 200:
            print("AI service is working!")
            print(f"Response: {response.text}")
            
            # Update the working time in localStorage
            try:
                with open(os.path.join(cookies_dir, "working_time.json"), 'r') as f:
                    working_data = json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                working_data = {"last_check": None, "total_seconds": 0}
            
            current_time = datetime.now().timestamp()
            if working_data["last_check"]:
                time_diff = current_time - working_data["last_check"]
                working_data["total_seconds"] += int(time_diff)
            
            working_data["last_check"] = current_time
            
            with open(os.path.join(cookies_dir, "working_time.json"), 'w') as f:
                json.dump(working_data, f)
            
            print(f"Total working time: {working_data['total_seconds']} seconds")
            
            # Add time to the user's account if they have a token
            try:
                with open(os.path.join(cookies_dir, "user_token.json"), 'r') as f:
                    user_data = json.load(f)
                    token = user_data.get('token')
                    if token:
                        # Add the earned time to the user's account
                        add_time_url = "http://localhost:3000/api/add-time"  # Adjust this URL as needed
                        add_time_response = requests.post(
                            add_time_url,
                            headers={
                                'Authorization': f'Bearer {token}',
                                'Content-Type': 'application/json'
                            },
                            json={'seconds': int(time_diff)}
                        )
                        if add_time_response.status_code == 200:
                            print(f"Successfully added {int(time_diff)} seconds to your account")
                        else:
                            print("Failed to add time to your account")
            except (FileNotFoundError, json.JSONDecodeError):
                print("No user token found. Please log in to earn time.")
        else:
            print(f"AI service returned status code: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"Error checking AI health: {str(e)}")

if __name__ == "__main__":
    check_ai_health() 