# Sky Core API 仪表盘集成指南

本组件是一个**纯净的 Spring Boot Starter**，用于为您的后端项目快速集成 API 调试和文档功能。

## 1. 安装到本地仓库

由于是私有组件，首先需要将其安装到您开发机的本地 Maven 仓库中：

1.  进入本项目根目录。
2.  执行安装命令：

```bash
mvn clean install
```

成功后，组件包 `sky-core-0.0.1-SNAPSHOT.jar` 就会出现在您的 `~/.m2/repository` 中。

## 2. 在目标项目中引入

打开您需要集成仪表盘的 Spring Boot 项目（即**业务项目**），修改 `pom.xml`：

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>sky-core</artifactId>
    <version>0.0.1-SNAPSHOT</version>
</dependency>
```

> 💡 **提示**: 如果您修改了本项目的 `groupId` 或 `artifactId`，请相应调整上面的坐标。

## 3. 启用仪表盘

在目标项目的启动类（或任意配置类）上，添加 **`@EnableApiDashboard`** 注解：

```java
import com.example.smartrelay.annotation.EnableApiDashboard;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@EnableApiDashboard  // <--- 核心步骤：一键启用
public class MyApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyApplication.class, args);
    }
}
```

## 4. 验证与访问

启动您的业务项目，访问：

👉 **`http://localhost:<您的端口>/api-dashboard`**

### ✨ 功能特性
*   **零侵入**: 自动扫描您项目中的所有 Controller 接口。
*   **智能解析**: 自动识别 GET/POST 方法、请求参数和 JSON Body 结构。
*   **调试终端**: 内置类似 Postman 的调试界面，支持直接发送请求。
*   **如影随形**: 仪表盘作为您应用的一部分运行，端口号与您的应用一致。

### 🗑️ 已移除功能 (精简版)
*   *流量录制与导出功能已移除，仅保留核心调试能力。*
*   *组件自身的接口会自动隐藏，不干扰您的业务 API 列表。*

## 常见问题

**Q: 需要配置额外的 Bean 吗？**
A: 不需要。`@EnableApiDashboard` 会自动导入所有必要的配置 (`ApiDashboardConfig`)。

**Q: 如何部署到生产环境？**
A: 建议仅在开发或测试环境开启。您可以使用 `@Profile("dev")` 或在生产环境配置中不添加 `@EnableApiDashboard` 注解来控制。
