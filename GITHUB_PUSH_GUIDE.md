# GitHub 推送指南

## 快速推送

在本地终端执行以下命令：

```bash
cd /workspace/projects
git remote set-url origin https://github.com/junnyjchen/deepquest.git
git push -u origin main --force
```

## 使用 GitHub Token

### 1. 创建 Token
1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 勾选 `repo` 权限
4. 复制生成的 Token

### 2. 推送代码
```bash
cd /workspace/projects
git remote set-url origin https://ghp_YOUR_TOKEN_HERE@github.com/junnyjchen/deepquest.git
git push -u origin main --force
```

## 使用 SSH

### 1. 生成 SSH Key
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
```

### 2. 添加 SSH Key 到 GitHub
1. 访问 https://github.com/settings/keys
2. 点击 "New SSH key"
3. 粘贴公钥内容

### 3. 切换到 SSH 方式
```bash
cd /workspace/projects
git remote set-url origin git@github.com:junnyjchen/deepquest.git
git push -u origin main --force
```

## 验证推送

推送成功后访问：https://github.com/junnyjchen/deepquest

## 常见问题

### 问题: "Authentication failed"
**解决**: Token 无效或过期，重新生成 Token

### 问题: "Remote origin already exists"
**解决**: 
```bash
git remote remove origin
git remote add origin https://github.com/junnyjchen/deepquest.git
```

### 问题: "src refspec main does not match"
**解决**: 检查分支名
```bash
git branch -M main
git push -u origin main --force
```
