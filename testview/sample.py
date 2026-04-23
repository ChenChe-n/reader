"""
这是 Python 多行注释（文档字符串）
展示了 Python 的各种字符串特性
可以在这里详细说明代码功能
"""

def repeat(msg: str, n: int) -> str:
    """
    重复消息 n 次
    :param msg: 要重复的消息
    :param n: 重复次数
    :return: 重复后的字符串
    """
    return msg * n


# 多行字符串示例
multiline_string = """
这是第一行
这是第二行
还有第三行
可以包含任意换行
"""

# 原始字符串示例（常用于正则表达式）
raw_string = r'C:\Users\Python\Documents\no_escape_here'

# 另一种多行原始字符串
raw_multiline = r'''
原始多行字符串
不需要转义符号 \
甚至可以包含引号 " '
'''

# f-string 插值示例
name = "Alice"
age = 30
f_string_example = f"My name is {name} and I am {age} years old."

# 更复杂的 f-string 示例
calculation = f"Next year I will be {age + 1} years old."
coordinates = f"x={10}, y={20}"

# 使用三重引号嵌套引号
nested_quotes = """He said "Python is great!" and I agree."""

print(multiline_string)
print(raw_string)
print(raw_multiline)
print(f_string_example)
print(calculation)
print(coordinates)
print(nested_quotes)

text = " hello python "
cleaned = text.strip().title()  # String methods
print(repeat(cleaned + "!", 2))  # Function call