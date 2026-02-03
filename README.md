<div align="center">

# Sky Core ☁️ （天枢） 

**极简主义的 Spring Boot API 调试仪表盘**

[![Maven Central](https://img.shields.io/maven-central/v/io.github.anranyunxiaomo/sky-core.svg?label=Maven%20Central)](https://central.sonatype.com/artifact/io.github.anranyunxiaomo/sky-core)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Build Status](https://github.com/anranyunxiaomo/sky-core/actions/workflows/deploy.yml/badge.svg)](https://github.com/anranyunxiaomo/sky-core/actions)

<p align="center">
  <img src="doc/screenshot.png" alt="Sky Core Dashboard" width="100%">
</p>

</div>

---

## 📖 简介 | Introduction

**天枢 (Sky Core)**，取自北斗七星之首，意为众星之枢纽。

作为 Spring Boot 应用的 **API 指挥中枢**，它以极简主义为核心设计理念，为您提供**零配置**、**高颜值**的接口调试体验。它摒弃了传统 Swagger/OpenAPI 的繁杂配置，**直接解析代码中的 JavaDoc** 自动生成文档，并提供了一个具有 Apple Design 设计风格的现代化调试仪表盘。

无需任何额外注解，仅需一行代码，即可让您的 API 如星辰般清晰呈现。

### ✨ 核心特性

- **🍎 极致 UI 设计**: 采用毛玻璃 (Glassmorphism) 与卡片式布局，赏心悦目。
- **📝 零侵入文档**: 无需 `@ApiOperation` 等任何注解，**直接读取 Java 注释**。
- **⚡️ 智能调试**: 自动解析参数结构，一键生成 JSON 模板，支持复杂对象递归。
- **🔌 即插即用**: 引入依赖 -> 加注解 -> 启动，三步完成配置。

---

## 🚀 快速开始 | Quick Start

### 1. 引入依赖
在您的 `pom.xml` 中添加最新版本依赖：

```xml
<dependency>
    <groupId>io.github.anranyunxiaomo</groupId>
    <artifactId>sky-core</artifactId>
    <version>0.0.1</version>
</dependency>
```

### 2. 开启功能
在 Spring Boot 启动类上添加注解 **`@EnableApiDashboard`**：

```java
import com.sky.core.annotation.EnableApiDashboard;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@EnableApiDashboard // <--- 关键一步
public class MyApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyApplication.class, args);
    }
}
```

### 3. 开始使用
启动项目，访问：
👉 **`http://localhost:8080/api-dashboard`**

---

## � 编写文档 | Writing Docs

**忘记那些繁琐的注解吧！** Sky Core 能够理解您的代码和注释。

```java
/**
 * 📦 商品管理模块
 * (类上的注释将成为左侧菜单的分组名称)
 */
@RestController
@RequestMapping("/products")
public class ProductController {

    private final ProductService service;

    /**
     * 🔍 根据ID查询商品详情
     * (方法上的注释将成为接口描述)
     */
    @GetMapping("/{id}")
    public Result<ProductDTO> getDetail(@PathVariable Long id) {
        return service.findById(id);
    }

    /**
     * ✨ 创建新商品
     * 支持复杂参数结构解析
     */
    @PostMapping("/create")
    public Result<Long> create(@RequestBody ProductCreateRequest request) {
        return service.create(request);
    }
}
```

> **提示**: 修改代码或注释后，重启项目（或使用热部署）刷新页面即可看到更新。

---

## 🛠 开发与构建 | Development

如果您想参与本项目开发或本地构建：

```bash
git clone https://github.com/anranyunxiaomo/sky-core.git
cd sky-core
mvn clean install
```

## 📄 许可证 | License

本项目采用 [Apache 2.0 许可证](LICENSE)。
