Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "D:\path\to\backup.bat" & Chr(34), 0
Set WshShell = Nothing