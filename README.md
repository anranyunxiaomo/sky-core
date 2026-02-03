# Sky Core Project

Sky Core 是一个基于 Spring Boot 的智能 API 转发与管理系统，内置了极简风格（Apple Style）的自研 API 仪表盘，支持自动发现接口、智能解析 JavaDoc 文档、递归生成复杂测试数据的 JSON 等高级功能。

## 🌟 核心特性

### 1. 🍎 Apple-Style API 仪表盘
- **极简设计**：采用与 macOS 一致的模糊毛玻璃（Glassmorphism）效果、San Francisco 字体和卡片式布局。
- **完全自研**：不依赖 Swagger/OpenAPI，直接基于 Spring `RequestMappingHandlerMapping` 实现，无需引入额外重型依赖。
- **自动发现**：服务启动后自动扫描所有 Controller 及其端点。

### 2. 📝 智能文档支持 (Zero Config)
支持两种方式编写接口文档，**修改代码后无需重启，刷新页面即生效**（得益于 DevTools）：
*   **原生 JavaDoc 支持**（推荐）：
    ```java
    /**
     * 用户管理模块
     */
    @RestController
    public class UserController {
        /**
         * 创建新用户
         */
        @PostMapping("/create")
        public void create(...) {}
    }
    ```
    *   **类级注释**：自动作为 Controller 分组标题（如上例中的“用户管理模块”）。
    *   **方法级注释**：自动作为接口描述。
*   **注解支持**：也可使用 `@ApiDesc("接口描述")` 进行标注。

### 3. ⚡️ 强大的调试能力
*   **智能参数填充**：
    *   复杂对象（如 `UserDTO` 嵌套 `Address` 列表）会自动递归解析，生成包含默认值的完整 JSON 模板。
    *   简单参数自动生成输入框。
*   **鲁棒的交互体验**：
    *   测试面板采用模态框（Modal）设计，互不干扰。
    *   支持 GET/POST/PUT/DELETE 等所有标准方法。
    *   实时 JSON 格式化与错误提示。

## 🛠 技术栈

- **Core**: Spring Boot 2.7.14
- **Web**: Spring Web MVC
- **View**: Thymeleaf (用于渲染仪表盘)
- **DevTools**: Spring Boot DevTools (支持热重载)
- **Frontend**: Vanilla JS + CSS (Apple Design System), Inter Font

## 🚀 快速开始

### 环境要求
- JDK 1.8+
- Maven 3.6+

### 运行项目
1.  **克隆项目**
    ```bash
    git clone <repository-url>
    cd sky-core
    ```

2.  **启动服务**
    ```bash
    mvn spring-boot:run
    ```

3.  **访问仪表盘**
    启动成功后，打开浏览器访问：
    👉 [http://localhost:8080/api-dashboard](http://localhost:8080/api-dashboard)

## 📖 使用指南

### 1. 编写代码
在 `Controller` 中正常编写 Spring MVC 接口：

```java
/**
 * 订单服务
 */
@RestController
@RequestMapping("/orders")
public class OrderController {

    /**
     * 获取订单详情
     */
    @GetMapping("/{id}")
    public String getOrder(@PathVariable String id) {
        return "Order: " + id;
    }
}
```

### 2. 即时文档
保存文件后，Spring DevTools 会自动重载应用。直接刷新仪表盘页面，即可看到新增的“订单服务”分组及接口。

### 3. 在线调试
点击接口右侧的 **“测试”** 按钮：
- 系统会自动解析参数并生成表单或 JSON 模板。
- 点击 **“发送请求”** 即可查看实时响应。

## 📂 项目结构

```
src/main/java/com/example/smartrelay
├── SmartRelayApplication.java    # 启动类
├── annotation
│   └── ApiDesc.java             # 自定义文档注解
├── controller
│   ├── ApiDashboardController.java # *核心*：仪表盘控制器，负责扫描和渲染
│   └── HelloController.java        # 示例业务控制器
├── util
│   └── JavaDocReader.java       # *核心*：源码分析工具，解析 JavaDoc
└── dto                          # 数据传输对象
```

## 📄 许可证

MIT License
