# 发布到 Maven Central 指南

要将项目发布到 Maven 中央仓库 (Maven Central)，您需要完成以下几个步骤。我已经为您配置好了 `pom.xml`，剩下的主要是账号和环境配置。

## 1. 账号准备 (One-time Setup)

1.  **注册账号**: 访问 [Sonatype JIRA](https://issues.sonatype.org/) 注册一个账号。
2.  **提交工单**: 在 JIRA 上创建一个 "New Project" 工单，申请您的 Group Id (例如 `io.github.yourusername`) 的发布权限。
3.  **等待审核**: 审核通过后，您才有资格发布。

## 2. GPG 签名配置

Maven Central 要求所有构件必须经过 GPG 签名。

1.  **生成密钥**:
    ```bash
    gpg --gen-key
    ```
2.  **查看 Key ID**:
    ```bash
    gpg --list-keys
    ```
3.  **上传公钥** 到 keyserver:
    ```bash
    gpg --keyserver keyserver.ubuntu.com --send-keys <您的KeyID>
    ```

## 3. 配置 Maven Settings

编辑您的 `~/.m2/settings.xml` (如果文件不存在则新建)，配置 Sonatype 的账号密码 (token) 和 GPG 密码。

```xml
<settings>
  <servers>
    <server>
      <id>ossrh</id>
      <username>您的Sonatype账号</username>
      <password>您的Sonatype密码或User Token</password>
    </server>
  </servers>
  <profiles>
    <profile>
      <id>ossrh</id>
      <activation>
        <activeByDefault>true</activeByDefault>
      </activation>
      <properties>
        <gpg.executable>gpg</gpg.executable>
        <gpg.passphrase>您的GPG密码</gpg.passphrase>
      </properties>
    </profile>
  </profiles>
</settings>
```

## 4. 修改项目信息

打开本项目 `pom.xml`，搜索 `YOUR_`，将以下信息替换为您自己的：

- `<url>`: 项目主页/GitHub地址
- `<developers>`: 您的名字和邮箱
- `<scm>`: Git 仓库地址

## 5. 发布

执行以下命令自动打包、签名并上传：

```bash
mvn clean deploy
```

如果是第一次发布，通常需要去 [Nexus Repository Manager](https://s01.oss.sonatype.org/) 登录并 "Close" 和 "Release" 暂存库（虽然插件配置了 `autoReleaseAfterClose`，但首次可能需要手动检查）。

## 6. 使用

发布成功约 10 分钟后，您就可以在其他项目中使用：

```xml
<dependency>
  <groupId>com.example</groupId>
  <artifactId>sky-core</artifactId>
  <version>0.0.1</version>
</dependency>
```
*(注：Release 版本不能是 SNAPSHOT)*
