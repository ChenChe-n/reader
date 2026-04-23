/*
 * 这是 C 语言的多行注释
 * 展示了 C 的各种字符串特性
 * 包括多行字符串连接、注释等
 */

#include <stdio.h>
#include <string.h>
#include <stdlib.h>

/* 
 * 函数：add
 * 功能：计算两个整数的和
 * 参数：a - 第一个整数，b - 第二个整数
 * 返回值：两数之和
 */
static int add(int a, int b) {
  return a + b;
}

int main(void) {
  // 单行注释示例
  
  /* 多行注释中嵌入代码示例：
   * const char *str = "Hello";
   * printf("%s\n", str);
   */
  
  // C 语言中构造多行字符串的方法 - 使用字符串连接
  const char *multiline_str = "这是第一行\n"
                              "这是第二行\n"
                              "包含特殊字符 \"引号\" 和 '单引号'\n"
                              "还有路径示例: C:\\Program Files\\Example\\\n"
                              "最后一行";
  
  // 使用宏定义创建多行字符串
#define ERROR_MESSAGE "错误详情:\n" \
                      "  - 错误代码: 1001\n" \
                      "  - 时间: " __DATE__ " " __TIME__ "\n" \
                      "  - 位置: " __FILE__ "\n"
  
  // 带变量插入的字符串（通过 sprintf 实现）
  const char *name = "C Language";
  int version = 11;
  char version_info[256];
  snprintf(version_info, sizeof(version_info), 
           "语言: %s\n版本: C%d\n标准库: %s", 
           name, version, "Standard C Library");
  
  // 字符串拼接示例
  const char *path_part1 = "/home/user/";
  const char *path_part2 = "documents/";
  const char *path_part3 = "file.txt";
  char full_path[256];
  snprintf(full_path, sizeof(full_path), "%s%s%s", path_part1, path_part2, path_part3);
  
  // 打印多行字符串
  printf("多行字符串示例:\n%s\n\n", multiline_str);
  printf("错误信息:\n%s\n", ERROR_MESSAGE);
  printf("\n版本信息:\n%s\n", version_info);
  printf("\n路径拼接: %s\n", full_path);
  
  const char *msg = "Hello from C \"sample\"";
  char buf[64] = {0};
  snprintf(buf, sizeof(buf), "%s len=%zu", msg, strlen(msg));

  int result = add(3, 4); // Function call
  printf("Result: %d, %s\n", result, buf);
  return 0;
}