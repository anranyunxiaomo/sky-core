# Sky Core

**极简、智能的 Spring Boot API 仪表盘**

Sky Core 是一个轻量级的 Spring Boot Starter，旨在为后端开发者提供**零配置**、**高颜值**的 API 调试与文档体验。它采用了 Apple Design 设计风格，支持自动解析 JavaDoc 生成文档，让您的 API 调试既高效又赏心悦目。

![API Dashboard](https://github.com/anranyunxiaomo/sky-core/raw/main/doc/screenshot.png)
*(如果有截图可以放在这里，暂留个占位)*

## ✨ 核心特性

- **🍎 Apple-Style 界面**: 采用模糊毛玻璃 (Glassmorphism) 与卡片式设计，提供极致的视觉体验。
- **📝 零配置文档**: 直接读取代码中的 **JavaDoc 注释** 生成接口文档，无需任何注解（也支持 `@ApiDesc`）。修改代码刷新即变。
- **⚡️ 智能调试**: 自动分析接口参数，支持递归生成复杂对象的 JSON 模板，一键发送请求。
- **🔌 纯净集成**: 不依赖 Swagger/OpenAPI，无侵入性，仅需一个依赖和注解即可开启。

## 🚀 快速集成

### 1. 引入依赖
在您的 Spring Boot 项目 `pom.xml` 中添加：

```xml
<dependency>
    <groupId>io.github.anranyunxiaomo</groupId>
    <artifactId>sky-core</artifactId>
    <version>0.0.1</version>
</dependency>
```

### 2. 开启功能
在启动类上添加 **`@EnableApiDashboard`** 注解：

```java
@SpringBootApplication
@EnableApiDashboard // <--- 只需要这一行
public class MyApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyApplication.class, args);
    }
}
```

### 3. 访问仪表盘
启动项目后，访问：
👉 **`http://localhost:8080/api-dashboard`**

---

## 📖 使用指南

### 编写文档
您只需要按规范编写 Java 注释，Dashboard 会自动提取：

```java
/**
 * 用户管理模块
 * (这里的一级注释将作为左侧菜单的分组名称)
 */
@RestController
@RequestMapping("/users")
public class UserController {

    /**
     * 创建新用户
     * (这里的方法注释将作为接口的描述)
     */
    @PostMapping("/create")
    public Result create(@RequestBody UserDTO user) {
        return service.create(user);
    }
}
```

### 在线调试
1.  点击接口名称打开详情卡片。
2.  点击右侧 **"Test"** 按钮。
3.  系统会自动生成请求参数模板（支持复杂 JSON 结构）。
4.  点击 **"Send"** 查看实时响应。

## ⚙️ 生产环境建议
建议仅在开发 (`dev`) 或测试 (`test`) 环境开启此功能。
您可以通过 Spring 的 `@Profile` 或配置属性来控制是否加载 `@EnableApiDashboard` 注解的配置类。

## 📄 许可证
MIT License
