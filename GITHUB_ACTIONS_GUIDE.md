# GitHub Actions 配置指南

您无法访问 Sonatype 网站，但 GitHub 可以。此指南将帮助您配置 GitHub 仓库，让它自动为您发布。

## 1. 导出您的 GPG 私钥
我们需要将您的 GPG 私钥告诉 GitHub。在终端执行以下命令：

```bash
gpg --armor --export-secret-keys 6D4805959126E6AE229E700CA524AEBB9094008C
```
*(注意：这个长 ID 是我从您之前的日志中找到的您的 Key ID)*

**复制输出的所有内容**（包括 `-----BEGIN PGP PRIVATE KEY BLOCK-----` 和 `-----END PGP PRIVATE KEY BLOCK-----`）。

## 2. 添加 GitHub Secrets
1.  打开您 GitHub 仓库的页面: [https://github.com/anranyunxiaomo/sky-core](https://github.com/anranyunxiaomo/sky-core)
2.  点击 **Settings** -> **Secrets and variables** -> **Actions**。
3.  点击 **New repository secret**，依次添加以下 4 个密钥：

| Name | Value (填入的内容) |
| :--- | :--- |
| `OSSRH_USERNAME` | `EddE75` (您的 Sonatype 账号) |
| `OSSRH_TOKEN` | `XHTDl4aprSslkV35oIKmXJzTGvkVAqHB8` (您的 User Token) |
| `GPG_PRIVATE_KEY` | **粘贴第1步导出的全部内容** |
| `GPG_PASSPHRASE` | `zhangKAI0205/` (您的 GPG 密码) |

## 3. 推送代码触发发布
配置好 Secrets 后，将本地代码推送（Push）到 GitHub 的 `main` 分支。
```bash
git add .
git commit -m "feat: setup github actions for publishing"
git push origin main
```

**Actions** 标签页会自动开始运行 `Publish to Maven Central` 任务。一旦变成绿色钩子，发布就成功了！
