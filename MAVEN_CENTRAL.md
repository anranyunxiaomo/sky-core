# 发布到 Maven Central 指南

## 配置状态：就绪 ✅
我已经为您完成了所有配置，包括：
1.  `pom.xml`: GroupId, SCM, Developers, Javadoc 配置。
2.  `~/.m2/settings.xml`: Sonatype 账号 Token, 阿里云镜像修正, GPG 密码。

## 现在开始发布
您只需要在项目根目录下执行：

```bash
mvn clean deploy
```

## 发布后
如果是首次发布，通常建议登录 [Nexus Repository Manager (s01)](https://s01.oss.sonatype.org/) 检查 Staging Repositories。
- 如果一切顺利，插件会自动 Close 并 Release。
- 如果构建成功但在 Maven Central 搜不到，请等待 15-30 分钟同步时间。

## 故障排除
如果遇到 `gpg: signing failed`，请尝试在终端执行 `export GPG_TTY=$(tty)` 然后再次运行部署命令。
