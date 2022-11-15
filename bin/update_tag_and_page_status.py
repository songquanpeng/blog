import argparse
import sqlite3


def main(args):
    connection = sqlite3.connect(args.db_path)
    cursor = connection.cursor()
    res = cursor.execute("SELECT id, tag FROM Pages")
    pages = res.fetchall()
    for page_id, page_tag in pages:
        if args.space2semicolon:
            page_tag = page_tag.replace(' ', ';')
        if args.hyphen2space:
            page_tag = page_tag.replace('-', ' ')
        hide_page = False
        for hidden_tag in args.hide_tags:
            if hidden_tag in page_tag:
                hide_page = True
                break
        cursor.execute("UPDATE Pages SET tag = ? WHERE id = ?", (page_tag, page_id))
        if hide_page:
            cursor.execute("UPDATE Pages SET pageStatus = ? WHERE id = ?", (3, page_id))
        cursor.execute("")
        connection.commit()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--space2semicolon', action='store_true')
    parser.add_argument('--hyphen2space', action='store_true')
    parser.add_argument('--db_path', type=str, default="../data.db")
    parser.add_argument('--hide_tags', type=str, nargs='+', default=['LeetCode', '剑指', '牛客', '算法题', '问题', 'Linux 系统', 'PyTorch 相关笔记'])
    main(parser.parse_args())
