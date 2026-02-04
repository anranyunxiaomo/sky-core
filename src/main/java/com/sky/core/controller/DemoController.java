package com.sky.core.controller;

import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

/**
 * 🚀 演示控制器 (Demo)
 * <p>
 * 用于展示 Sky Core 如何自动解析 Javadoc 并生成文档。
 * 您可以看到这里没有任何 Swagger 注解，只有纯粹的 Java 注释。
 * </p>
 */
@RestController
@RequestMapping("/demo")
public class DemoController {

    /**
     * 👋 Hello World
     * <p>
     * 最简单的 GET 请求测试。
     * 返回一个简单的字符串问候。
     * </p>
     */
    @GetMapping("/hello")
    public String hello(@RequestParam(defaultValue = "World") String name) {
        return "Hello, " + name + "!";
    }

    /**
     * 📦 创建订单 (POST JSON)
     * <p>
     * 测试复杂的 JSON 请求体解析。
     * 系统会自动分析 OrderRequest 类的结构并生成 JSON 模板。
     * </p>
     */
    @PostMapping("/order")
    public Map<String, Object> createOrder(@RequestBody Map<String, Object> order) {
        Map<String, Object> res = new HashMap<>();
        res.put("code", 200);
        res.put("msg", "Order Created Successfully");
        res.put("data", order);
        return res;
    }

    /**
     * 🔐 用户登录 (Form)
     * <p>
     * 测试表单提交与参数解析。
     * 添加了参数校验，确保用户名和密码不为空。
     * </p>
     * 
     * @param username 用户名（必填）
     * @param password 密码（必填）
     * @return 登录结果
     */
    @PostMapping("/login")
    public Map<String, Object> login(
            @RequestParam(required = true) String username, 
            @RequestParam(required = true) String password) {
        
        Map<String, Object> res = new HashMap<>();
        
        // ✅ 参数校验
        if (username == null || username.trim().isEmpty() ||
            password == null || password.trim().isEmpty()) {
            res.put("status", "error");
            res.put("message", "用户名和密码不能为空");
            return res;
        }
        
        res.put("status", "ok");
        res.put("user", username.trim());
        return res;
    }

    /**
     * 🆔 获取用户详情 (PathVariable)
     * <p>
     * 测试路径变量识别与自动替换。
     * 仪表盘应能识别 {id} 为输入框。
     * 添加了ID格式校验。
     * </p>
     * 
     * @param id 用户ID（仅支持数字）
     * @return 用户详情
     */
    @GetMapping("/users/{id}")
    public Map<String, Object> getUserDetail(@PathVariable String id) {
        Map<String, Object> res = new HashMap<>();
        
        // ✅ ID 格式校验（仅允许数字）
        if (id == null || !id.matches("\\d+")) {
            res.put("status", "error");
            res.put("message", "无效的用户ID，仅支持数字");
            return res;
        }
        
        res.put("id", id);
        res.put("name", "User_" + id);
        res.put("status", "ok");
        return res;
    }
}
