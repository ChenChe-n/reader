/*
 * 这是 C++ 的多行注释
 * 展示了 C++ 的各种字符串特性
 * 包括原始字符串字面量、多行字符串等
 */

#include <iostream>
#include <string>
#include <vector>
#include <sstream>

// C++ 11 原始字符串字面量 (Raw String Literals)
// 使用 R"delimiter(content)delimiter" 语法
std::string createMultilineString() {
    // 原始字符串，不需要转义特殊字符
    std::string rawString = R"(C:\Users\C++\Program Files\Path\To\Location)";
    
    // 多行原始字符串
    std::string multilineRaw = R"(
这是 C++ 中的多行字符串
可以包含 "双引号" 和 '单引号'
以及特殊字符 \n \t 不会被转义
    保持原有的缩进
)";
    
    // 带有自定义分隔符的原始字符串（避免内容中出现 ") 分隔符的情况）
    std::string customDelimiter = R"delimiter(This string contains )" characters which would normally end a raw string!)delimiter";
    
    // 嵌入代码示例的原始字符串
    std::string codeExample = R"(
#include <iostream>
int main() {
    std::cout << "Hello World" << std::endl;
    return 0;
}
)";
    
    // 包含正则表达式的原始字符串
    std::string regexPattern = R"(\d{3}-\d{2}-\d{4})";  // SSN pattern
    
    // 将所有字符串组合起来
    std::ostringstream oss;
    oss << "Raw String Path: " << rawString << "\n"
        << "Multiline Content:\n" << multilineRaw << "\n"
        << "Custom Delimiter: " << customDelimiter << "\n"
        << "Code Example:\n" << codeExample << "\n"
        << "Regex Pattern: " << regexPattern << "\n";
        
    return oss.str();
}

int multiply(int a, int b) {
  return a * b;
}

int main() {
  std::string text = "Hello from C++ std::string";
  std::vector<int> nums = {1, 2, 3};
  nums.push_back(4); // Method call

  // 使用我们创建的函数
  std::cout << createMultilineString() << std::endl;
  
  int out = multiply(nums[1], nums[3]);
  std::cout << "out=" << out << ", text=" << text << std::endl;
  return 0;
}