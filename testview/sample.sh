#!/usr/bin/env bash
#
# 这是 Shell 脚本的多行注释
# 展示了 Bash 的各种字符串特性
# 包括多行字符串、变量插值、注释等
#

# 函数定义示例
greet() {
  local name="$1"
  echo "Hello, ${name}"
}

# 使用 Here Document 创建多行字符串
cat << 'EOF'
这是多行字符串示例 (Here Document)
可以包含特殊字符 $PATH 或 $(whoami)
甚至包含引号 "双引号" 和 '单引号'
不需要转义字符
    保持缩进格式
EOF

# 带变量替换的 Here Document
username=$(whoami)
cat << EOF
用户信息:
  用户名: $username
  当前时间: $(date)
  主目录: $HOME
EOF

# 使用 Here String
message="这是通过 Here String 传递的数据"
cat <<< "$message"

# 单引号 vs 双引号示例
single_quoted='变量不会被替换 $HOME 或命令不会被执行 $(date)'
double_quoted="变量会被替换 $HOME 和命令会被执行 $(date)"
echo "单引号字符串: $single_quoted"
echo "双引号字符串: $double_quoted"

# 多行字符串赋值给变量
multiline_text="
这是赋值给变量的多行字符串
包含特殊字符 \$PATH 和命令 $(echo "inline command")
    保持缩进
结束行
"
echo "$multiline_text"

# 使用数组存储多行内容
data=(
  "第一行数据"
  "第二行数据 with \$variable"
  "第三行数据 with $(echo 'command substitution')"
)
printf "数组内容:\n"
for i in "${!data[@]}"; do
  printf "%d: %s\n" $((i+1)) "${data[$i]}"
done

# 正则表达式和模式匹配示例
if [[ "hello world" =~ ^[a-z[:space:]]+$ ]]; then
  echo "匹配成功: 包含小写字母和空格"
fi

# 变量插值和参数扩展
original_text="  shell sample  "
uppercase_text=$(echo "$original_text" | tr '[:lower:]' '[:upper:]')
trimmed_text="$(echo "$original_text" | xargs)" # Command/function-like call
echo "原始文本: '$original_text'"
echo "大写文本: '$uppercase_text'"
echo "去除空格: '$trimmed_text'"

greet "$trimmed_text"

# 条件判断和字符串操作
long_text="这是一个比较长的文本字符串，用来演示字符串操作"
echo "字符串长度: ${#long_text}"
echo "子字符串 (从第3位开始，取10个字符): ${long_text:3:10}"