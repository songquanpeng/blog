set day=%Date:~3,2%
scp username@domain:~/path/to/express-react-blog/data.db ./"day-%day%.db"