cd D:\W-Working\2_CodePlayground\2026\startpoint-en-mod-tools

python .\wf_global.py verify `
    --archive ".\work\global-en\dist\starpoint-global-balance-2026-09-09.zip"

python .\wf_global.py install `
    --archive ".\work\global-en\dist\starpoint-global-balance-2026-09-09.zip" `
    --server-dir "D:\W-Working\2_CodePlayground\2026\starpoint-main" `
    --apply