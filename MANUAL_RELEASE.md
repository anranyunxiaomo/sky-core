# 手动发布指南 (Manual Release Guide)

如果命令行 `mvn deploy` 因网络问题无法提交，您可以使用浏览器手动上传。这是最可靠的备选方案。

## 1. 本地打包与签名
首先在本地生成所有必要的构件（Jar, Javadoc, Sources, POM）并进行 GPG 签名。

在项目根目录运行：
```bash
mvn clean verify -P release -DskipTests
```

执行成功后，`target` 目录下会生成只需上传的以下文件（每个文件都应有一个对应的 `.asc` 签名文件）：

1.  `sky-core-0.0.1.jar` & `.asc`
2.  `sky-core-0.0.1-javadoc.jar` & `.asc`
3.  `sky-core-0.0.1-sources.jar` & `.asc`
4.  `sky-core-0.0.1.pom` (位于 target 目录或重命名自 pom.xml) & `.asc`

*注：如果找不到 POM 的签名，可以手动对 pom.xml 进行签名：`gpg -ab pom.xml`*

## 2. 登录 Nexus Staging
打开浏览器（通过您的 VPN）：
👉 **[https://s01.oss.sonatype.org/](https://s01.oss.sonatype.org/)**

1.  点击右上角 **"Log In"**，使用您的 Sonatype 账号登录。
2.  在左侧菜单选择 **"Staging Upload"**。

## 3. 上传构件
1.  **Upload Mode**: 选择 **"Artifact(s) with a POM"**。
2.  **Select POM to Upload**: 选择 `pom.xml` (注意：需要同时上传签名文件 `.asc` 吗？通常界面允许您分别上传 artifacts)。
    *   *更简单的方法*：使用左侧菜单 **"Staging Repositories"** -> 顶部工具栏 **"Close"** (如果已有) 或 **"Release"**。
    *   *如果不使用 Staging Upload*:
        1.  左侧菜单点击 **"Staging Repositories"**。
        2.  如果不显示刚才失败的残留库，可能需要新建或直接使用 Staging Upload。
        3.  最推荐使用 **"Staging Upload"** 面板，上传模式选 **"Artifact(s) with a POM"**。
        4.  **POM**: 选择 `pom.xml`。
        5.  **Artifacts**: 依次添加 `jar` (main), `javadoc`, `sources`。
        6.  点击 **"Upload Artifacts"**。

## 4. 发布 (Close & Release)
上传成功后：
1.  去 **"Staging Repositories"** 列表。
2.  到底部找到生成的 Repository (通常以 `io.github...` 开头)。
3.  选中它，点击上方工具栏的 **"Close"**。
4.  等待几分钟，刷新，检查 Activity 选项卡确认验证通过。
5.  验证通过后，点击上方工具栏的 **"Release"**。

## 故障排除
如果手动签名遇到问题，可以只生成 jar，然后在界面上传时让 Nexus 尝试验证（通常 Nexus 要求上传时必须带签名）。
确保本地运行命令成功生成了 `.asc` 文件。
