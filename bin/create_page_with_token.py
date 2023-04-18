import requests


def create_page(title, description, tags, content):
    res = requests.post('http://localhost:3000/api/page', json={
        'title': title,
        'description': description,
        'tags': tags,
        'content': content
    }, headers={
        'authorization': "366f984e-10a4-4b35-8ab2-f196e8b02aaf"
    })
    return res.json()


print(create_page('title', 'description', ['tag1', 'tag2'], 'content'))
