/* 
这是一个多行注释示例
展示了 Rust 的各种字符串特性
可以在这里详细说明代码功能
*/

/// 文档注释示例
/// 展示如何连接名称前缀和名称
fn join_name(prefix: &str, name: &str) -> String {
    format!("{} {}", prefix, name)
}

fn main() {
    // 原始字符串示例
    let raw_string = r#"This is a raw string with "quotes" that don't need escaping"#;
    
    // 多行字符串示例
    let multiline_string = r#"
        这是多行字符串的第一行
        这是第二行
        还有第三行
    "#;
    
    // 多行字符串另一种写法
    let another_multiline = "
    另一个
    多行字符串
    示例";
    
    // 包含特殊字符而不需要转义的原始字符串
    let path = r"C:\Users\Rust\Projects";
    
    println!("{}", raw_string);
    println!("{}", multiline_string);
    println!("{}", another_multiline);
    println!("Path: {}", path);
    
    // 使用原始字符串处理正则表达式
    let regex_pattern = r"\d{4}-\d{2}-\d{2}";
    println!("Regex pattern: {}", regex_pattern);
    
    // 使用函数
    let text = "RUST PROGRAMMING".to_string();
    println!("{}", join_name("Welcome to", &text));
    
    // 字符串插值
    let name = "Alice";
    let age = 30;
    let interpolated = format!("My name is {} and I am {} years old", name, age);
    println!("{}", interpolated);
}