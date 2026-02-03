# 新版 Maven Central Portal 发布指南

由于旧版 OSSRH 服务器 (`s01.oss.sonatype.org`) 持续超时，我们切换到**最现代化**的发布方式：**Maven Central Portal**。

## 1. 获取发布包 (Bundle)
我已修改了 GitHub Action。现在的流程是：
1.  代码推送到 GitHub。
2.  Action 会自动打包并签名，生成一个 `bundle.zip`。
3.  Action 完成后，在 Summary 页面底部找到 **Artifacts** 区域。
4.  点击下载 `maven-central-bundle`。

## 2. 登录新版门户
1.  访问：[https://central.sonatype.com/](https://central.sonatype.com/)
2.  点击右上角 **"Sign In"** (通常使用和旧版一样的账号密码，或者关联 GitHub 登录)。

## 3. 上传发布
1.  点击页面上的 **"Publish"** 按钮。
2.  选择 **"Upload Bundle"**。
3.  **Deployment Name**: 随便填，例如 `sky-core-0.0.1`。
4.  **Upload File**: 选择您刚才下载的 `bundle.zip` (解压后的 zip，如果是 GitHub 下载的 zip 可能嵌套了一层，请确保上传的 zip 里面直接包含 jar/pom/asc 文件)。
    *   *注意*：GitHub 下载的 artifact 通常是一个 zip。解压它，里面应该有一个 `bundle.zip`。请上传这个内部的 `bundle.zip`。或者如果直接是文件，请选中所有 jar/pom/asc 文件打包成 zip 上传。
5.  点击 **"Publish Component"**。

门户网站会自动进行校验。校验通过后，点击 **"Publish"** 即可！
这是目前最快、最稳定的发布方式。
