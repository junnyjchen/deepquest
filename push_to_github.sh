#!/bin/bash
# DeepQuest GitHub Push 脚本
# 在本地终端执行此脚本

cd /workspace/projects

echo "正在推送到 GitHub..."
echo "仓库: https://github.com/junnyjchen/deepquest"
echo ""

# 设置远程仓库
git remote set-url origin https://github.com/junnyjchen/deepquest.git

# 推送代码
git push -u origin main --force

echo ""
echo "推送完成!"
echo "仓库地址: https://github.com/junnyjchen/deepquest"
