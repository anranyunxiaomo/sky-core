# 新版 Maven Central 自动化配置指南

为了实现完全自动化且不超时的发布，我们已切换到新版发布插件。
您需要进行一次性配置，生成专门用于自动化的 Token。

## 1. 生成 Token
1.  登录新版门户：[https://central.sonatype.com/](https://central.sonatype.com/)
2.  点击右上角头像 -> **"View Account"**。
3.  点击 **"Generate User Token"**。
4.  您会看到 xml 格式的 Credentials，包含 `Username` 和 `Password`。

## 2. 更新 GitHub Secrets
回到 GitHub 仓库的 **Settings -> Secrets -> Actions**，添加/更新以下两个密钥：

| Secret Name | Value (从刚才生成的 XMl 中复制) |
| :--- | :--- |
| `CENTRAL_USERNAME` | 填入 XML 中的 `<username>` 里的那串字符 |
| `CENTRAL_TOKEN` | 填入 XML 中的 `<password>` 里的那串字符 |

*注意：`GPG_PRIVATE_KEY` 和 `GPG_PASSPHRASE` 保持不变，不需要动。*

## 3. 自动发布
配置完成后，我会推送代码。GitHub Actions 就会使用这个新 Token，直接把包推送到新版门户，速度快且稳定，完全无需人工干预。
