import requests
import os


def create_page(title, description, tags, content):
    token = os.environ.get('BLOG_API_TOKEN')
    if not token:
        raise RuntimeError('BLOG_API_TOKEN is required')
    base_url = os.environ.get('BLOG_URL', 'http://localhost:3000').rstrip('/')
    res = requests.post(base_url + '/api/page', json={
        'title': title,
        'description': description,
        'tags': tags,
        'content': content
    }, headers={
        'authorization': 'Bearer ' + token
    }, timeout=15)
    res.raise_for_status()
    return res.json()


print(create_page('title', 'description', ['tag1', 'tag2'], 'content'))
