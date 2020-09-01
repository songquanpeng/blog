set day=%Date:~3,2%
scp username@domain:~\path\express-react-blog\data.db ./"day-%day%.db"